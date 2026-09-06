const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

function clean(value, limit = 500) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, limit);
}

function fold(value) {
  return clean(value, 2000)
    .replace(/İ/g, 'i').replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
}

function amount(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
  const text = clean(value, 80).replace(/[^0-9.,-]/g, '');
  if (!text) return null;
  let normalized = text;
  if (text.includes(',') && text.includes('.')) normalized = text.replace(/\./g, '').replace(',', '.');
  else if (text.includes(',')) normalized = text.replace(',', '.');
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(text)) normalized = text.replace(/\./g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
}

function isoDate(value) {
  const text = clean(value, 40);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : null;
}

function extensionForMime(mimeType) {
  const mime = clean(mimeType, 100).toLowerCase();
  if (mime === 'application/pdf') return '.pdf';
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  return '.jpg';
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || '')));
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('');
}

async function ensureColumn(db, sql) {
  try { await db.prepare(sql).run(); } catch (error) {
    if (!/duplicate column|already exists/i.test(String(error?.message || error))) throw error;
  }
}

export async function ensureFinancialDocumentSchema(db) {
  if (!db) throw new Error('financial_store_unavailable');
  await db.prepare(`CREATE TABLE IF NOT EXISTS telegram_captures (
    id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT NOT NULL, message_id TEXT NOT NULL,
    kind TEXT NOT NULL, file_id TEXT NOT NULL, mime_type TEXT, caption TEXT,
    status TEXT NOT NULL DEFAULT 'pending_review',
    created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(chat_id,message_id)
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS evidence_inbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT, evidence_key TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL, source_account TEXT, source_message_id TEXT,
    received_at TEXT NOT NULL, document_type TEXT, file_name TEXT, mime_type TEXT,
    content_hash TEXT, status TEXT NOT NULL DEFAULT 'received',
    classification_confidence REAL, extraction_json TEXT, error_code TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS personal_entity_aliases (
    alias_key TEXT PRIMARY KEY, canonical_name TEXT NOT NULL, relationship TEXT,
    default_category TEXT, active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS personal_finance_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, event_key TEXT NOT NULL UNIQUE,
    evidence_key TEXT NOT NULL, chat_id TEXT, telegram_message_id TEXT,
    document_type TEXT, direction TEXT NOT NULL, scope TEXT NOT NULL,
    counterparty TEXT NOT NULL, relationship TEXT, category TEXT NOT NULL,
    amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'TRY', transaction_date TEXT NOT NULL,
    source_account TEXT, target_account TEXT, bank_name TEXT, reference_no TEXT,
    description TEXT, confidence REAL NOT NULL, evidence_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'recorded',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_personal_finance_events_party_date ON personal_finance_events(counterparty,transaction_date DESC)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_personal_finance_events_category_date ON personal_finance_events(category,transaction_date DESC)').run();
  await db.prepare(`INSERT INTO personal_entity_aliases (alias_key,canonical_name,relationship,default_category)
    VALUES ('ege','Ege','oğlu','Harçlık') ON CONFLICT(alias_key) DO UPDATE SET
    canonical_name=excluded.canonical_name,relationship=excluded.relationship,
    default_category=excluded.default_category,active=1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`).run();
  await ensureColumn(db, 'ALTER TABLE telegram_captures ADD COLUMN file_name TEXT');
  await ensureColumn(db, 'ALTER TABLE telegram_captures ADD COLUMN file_size INTEGER');
  await ensureColumn(db, "ALTER TABLE telegram_captures ADD COLUMN extraction_status TEXT NOT NULL DEFAULT 'pending'");
  await ensureColumn(db, 'ALTER TABLE telegram_captures ADD COLUMN financial_event_key TEXT');
  await ensureColumn(db, 'ALTER TABLE telegram_captures ADD COLUMN processed_at TEXT');
  await ensureColumn(db, 'ALTER TABLE telegram_captures ADD COLUMN error_code TEXT');
}

async function entityRules(db) {
  const result = await db.prepare(`SELECT alias_key,canonical_name,relationship,default_category
    FROM personal_entity_aliases WHERE active=1 ORDER BY alias_key`).all();
  return result?.results || [];
}

async function telegramDocument(env, capture) {
  const token = env.HERMES_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || '';
  if (!token) throw new Error('telegram_token_missing');
  const metadataResponse = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(capture.file_id)}`);
  const metadata = await metadataResponse.json().catch(() => ({}));
  if (!metadataResponse.ok || !metadata?.ok || !metadata?.result?.file_path) throw new Error('telegram_file_lookup_failed');
  if (Number(metadata.result.file_size || capture.file_size || 0) > MAX_FILE_BYTES) throw new Error('document_too_large');
  const fileResponse = await fetch(`https://api.telegram.org/file/bot${token}/${metadata.result.file_path}`);
  if (!fileResponse.ok) throw new Error(`telegram_file_http_${fileResponse.status}`);
  const buffer = await fileResponse.arrayBuffer();
  if (!buffer.byteLength || buffer.byteLength > MAX_FILE_BYTES) throw new Error('document_size_invalid');
  const mimeType = clean(capture.mime_type || fileResponse.headers.get('content-type'), 100) || 'application/octet-stream';
  const fileName = clean(capture.file_name, 180) || `telegram-${capture.message_id}${extensionForMime(mimeType)}`;
  return { blob: new Blob([buffer], { type: mimeType }), fileName, mimeType, buffer };
}

async function documentText(env, file) {
  if (!env.AI?.toMarkdown) throw new Error('workers_ai_binding_missing');
  const converted = await env.AI.toMarkdown(
    { name: file.fileName, blob: file.blob },
    { conversionOptions: { output: { format: 'text' }, pdf: { metadata: false } } }
  );
  const result = Array.isArray(converted) ? converted[0] : converted;
  if (!result || result.format === 'error' || !clean(result.data, 50000)) throw new Error('document_conversion_failed');
  return clean(result.data, 50000);
}

function jsonFromModel(result) {
  const raw = typeof result === 'string' ? result : result?.response || result?.result || '';
  if (raw && typeof raw === 'object') return raw;
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('financial_json_missing');
  return JSON.parse(match[0]);
}

function fallbackExtraction(text) {
  const raw = String(text || '');
  const amountMatch = raw.match(/(?:tutar|işlem tutarı|islem tutari|gönderilen tutar)[^\d]{0,30}(\d[\d.,]*)\s*(?:TL|TRY|₺)/iu)
    || raw.match(/(\d[\d.,]*)\s*(?:TL|TRY|₺)/iu);
  const partyMatch = raw.match(/(?:alıcı|alici|hesap sahibi|gönderilen hesap|gonderilen hesap)\s*[:\-]?\s*([^\n\r]{2,100})/iu);
  const dateMatch = raw.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/);
  return {
    document_type: 'dekont', direction: 'outgoing', scope: 'unknown',
    counterparty: clean(partyMatch?.[1], 120), amount: amount(amountMatch?.[1]), currency: 'TRY',
    transaction_date: isoDate(dateMatch?.[0]), source_account: '', target_account: '',
    bank_name: '', reference_no: '', description: '', category: 'Belirsiz', confidence: 0.55
  };
}

async function extractEvent(env, text, rules) {
  const aliases = rules.map((rule) => `${rule.alias_key} => ${rule.canonical_name}; ilişki=${rule.relationship}; kategori=${rule.default_category}`).join('\n');
  const prompt = `Türkçe bir banka dekontu, fiş veya fatura metninden TEK ekonomik olayı çıkar.
Yalnız belgedeki kanıtı kullan. Eksik alanı uydurma. direction outgoing/incoming, scope personal/business/unknown olsun.
Bilinen kişi kuralları:\n${aliases || '(yok)'}
Belgede bilinen kişi eşleşirse canonical_name, relationship ve default_category kullan.
JSON alanları: document_type,direction,scope,counterparty,relationship,category,amount,currency,transaction_date,source_account,target_account,bank_name,reference_no,description,confidence.
confidence 0 ile 1 arasında sayı; transaction_date YYYY-MM-DD; amount sayı.
Belge metni:\n${String(text).slice(0, 30000)}`;
  try {
    const result = await env.AI.run(MODEL, {
      prompt, temperature: 0, max_tokens: 700,
      guided_json: {
        type: 'object', additionalProperties: false,
        properties: {
          document_type: { type: 'string' }, direction: { type: 'string' }, scope: { type: 'string' },
          counterparty: { type: 'string' }, relationship: { type: 'string' }, category: { type: 'string' },
          amount: { type: 'number' }, currency: { type: 'string' }, transaction_date: { type: 'string' },
          source_account: { type: 'string' }, target_account: { type: 'string' }, bank_name: { type: 'string' },
          reference_no: { type: 'string' }, description: { type: 'string' }, confidence: { type: 'number' }
        },
        required: ['document_type','direction','scope','counterparty','relationship','category','amount','currency','transaction_date','source_account','target_account','bank_name','reference_no','description','confidence']
      }
    });
    return jsonFromModel(result);
  } catch (_error) {
    return fallbackExtraction(text);
  }
}

function applyEntityRule(event, rules) {
  const haystack = fold([event.counterparty, event.target_account, event.description].join(' '));
  const rule = rules.find((candidate) => haystack.includes(fold(candidate.alias_key)) || haystack.includes(fold(candidate.canonical_name)));
  if (!rule) return event;
  return {
    ...event, scope: 'personal', counterparty: rule.canonical_name,
    relationship: rule.relationship, category: rule.default_category
  };
}

function normalizeEvent(candidate, rules) {
  const normalized = applyEntityRule({
    document_type: clean(candidate.document_type, 60) || 'belge',
    direction: ['outgoing', 'incoming'].includes(clean(candidate.direction, 20)) ? clean(candidate.direction, 20) : 'unknown',
    scope: ['personal', 'business'].includes(clean(candidate.scope, 20)) ? clean(candidate.scope, 20) : 'unknown',
    counterparty: clean(candidate.counterparty, 120), relationship: clean(candidate.relationship, 80),
    category: clean(candidate.category, 100) || 'Belirsiz', amount: amount(candidate.amount),
    currency: clean(candidate.currency, 10).toUpperCase() || 'TRY', transaction_date: isoDate(candidate.transaction_date),
    source_account: clean(candidate.source_account, 120), target_account: clean(candidate.target_account, 120),
    bank_name: clean(candidate.bank_name, 100), reference_no: clean(candidate.reference_no, 120),
    description: clean(candidate.description, 300), confidence: Math.max(0, Math.min(1, Number(candidate.confidence) || 0))
  }, rules);
  const missing = [];
  if (!normalized.counterparty) missing.push('karşı taraf');
  if (!normalized.amount) missing.push('tutar');
  if (!normalized.transaction_date) missing.push('tarih');
  if (normalized.direction === 'unknown') missing.push('işlem yönü');
  return { ...normalized, missing, ready: missing.length === 0 && normalized.confidence >= 0.8 };
}

async function persistEvent(db, capture, event, evidenceHash) {
  const identity = [event.transaction_date, event.direction, event.counterparty, event.amount, event.currency, event.reference_no || evidenceHash].join('|');
  const eventKey = `pfe-${(await sha256Hex(identity)).slice(0, 24)}`;
  const evidenceKey = `telegram-${capture.chat_id}-${capture.message_id}`;
  const status = event.ready ? 'recorded' : 'needs_review';
  await db.prepare(`INSERT INTO evidence_inbox
    (evidence_key,source,source_account,source_message_id,received_at,document_type,file_name,mime_type,content_hash,status,classification_confidence,extraction_json,error_code,updated_at)
    VALUES (?,?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'),?,?,?,?,?,?,?,NULL,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    ON CONFLICT(evidence_key) DO UPDATE SET document_type=excluded.document_type,file_name=excluded.file_name,
    mime_type=excluded.mime_type,content_hash=excluded.content_hash,status=excluded.status,
    classification_confidence=excluded.classification_confidence,extraction_json=excluded.extraction_json,
    error_code=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`)
    .bind(evidenceKey, 'telegram', event.source_account || null, String(capture.message_id), event.document_type,
      capture.file_name || null, capture.mime_type || null, evidenceHash, status, event.confidence,
      JSON.stringify({ ...event, missing: event.missing })).run();
  if (event.ready && event.scope === 'personal') {
    await db.prepare(`INSERT INTO personal_finance_events
      (event_key,evidence_key,chat_id,telegram_message_id,document_type,direction,scope,counterparty,relationship,category,amount,currency,transaction_date,source_account,target_account,bank_name,reference_no,description,confidence,evidence_hash,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(event_key) DO NOTHING`)
      .bind(eventKey,evidenceKey,String(capture.chat_id),String(capture.message_id),event.document_type,event.direction,event.scope,
        event.counterparty,event.relationship || null,event.category,event.amount,event.currency,event.transaction_date,
        event.source_account || null,event.target_account || null,event.bank_name || null,event.reference_no || null,
        event.description || null,event.confidence,evidenceHash,'recorded').run();
  }
  await db.prepare(`UPDATE telegram_captures SET extraction_status=?,financial_event_key=?,processed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),error_code=NULL
    WHERE chat_id=? AND message_id=?`).bind(status,eventKey,String(capture.chat_id),String(capture.message_id)).run();
  return { eventKey, evidenceKey, status };
}

function trMoney(value, currency = 'TRY') {
  return Number(value).toLocaleString('tr-TR', { style: 'currency', currency: currency || 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function financialEventReply(event, saved, duplicate = false) {
  if (!event.ready) {
    return ['⚠️ BELGE OKUNDU — BİLGİ TAMAMLAMA GEREKİYOR',
      `Eksik/belirsiz: ${event.missing.length ? event.missing.join(', ') : 'düşük okuma güveni'}`,
      event.counterparty ? `Kişi/kurum: ${event.counterparty}` : null,
      event.amount ? `Tutar: ${trMoney(event.amount,event.currency)}` : null,
      'Eksik alan tamamlanmadan mali kayıt oluşturulmadı.'
    ].filter(Boolean).join('\n');
  }
  return [duplicate ? '↩️ ZATEN KAYITLI' : '✅ APERION KAYDETTİ',
    `Kapsam: ${event.scope === 'personal' ? 'Kişisel / Aile' : 'İşletme'}`,
    `Kişi/kurum: ${event.counterparty}${event.relationship ? ` (${event.relationship})` : ''}`,
    `İşlem: ${event.category}`,
    `Tutar: ${trMoney(event.amount,event.currency)}`,
    `Tarih: ${event.transaction_date}`,
    `Yön: ${event.direction === 'outgoing' ? 'Gönderilen' : 'Gelen'}`,
    `Kayıt kimliği: ${saved.eventKey}`,
    '', 'Bu kayıt AperiON analiz defterindedir. BizimHesap’a mali kayıt yapılmadı.'
  ].join('\n');
}

export async function processFinancialCapture(env, capture) {
  await ensureFinancialDocumentSchema(env.APERION_DB);
  const existing = await env.APERION_DB.prepare('SELECT extraction_status,financial_event_key FROM telegram_captures WHERE chat_id=? AND message_id=?')
    .bind(String(capture.chat_id),String(capture.message_id)).first();
  if (existing?.extraction_status === 'recorded' && existing?.financial_event_key) {
    const row = await env.APERION_DB.prepare('SELECT * FROM personal_finance_events WHERE event_key=?').bind(existing.financial_event_key).first();
    if (row) return { ok: true, duplicate: true, event: { ...row, ready: true }, saved: { eventKey: row.event_key, status: row.status } };
  }
  try {
    const file = await telegramDocument(env, capture);
    capture.file_name = capture.file_name || file.fileName;
    capture.mime_type = capture.mime_type || file.mimeType;
    const [text, rules, evidenceHash] = await Promise.all([
      documentText(env, file), entityRules(env.APERION_DB), sha256Hex(file.buffer)
    ]);
    const event = normalizeEvent(await extractEvent(env, text, rules), rules);
    const saved = await persistEvent(env.APERION_DB, capture, event, evidenceHash);
    return { ok: true, duplicate: false, event, saved };
  } catch (error) {
    const code = clean(error?.message || error, 120) || 'financial_document_failed';
    await env.APERION_DB.prepare(`UPDATE telegram_captures SET extraction_status='failed',error_code=?,processed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE chat_id=? AND message_id=?`)
      .bind(code,String(capture.chat_id),String(capture.message_id)).run().catch(() => null);
    return { ok: false, error: code };
  }
}

function localIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function queryPeriod(normalized, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = null;
  let label = 'Tüm dönem';
  if (/\b(bugun|bugunku)\b/.test(normalized)) {
    start = new Date(end); label = 'Bugün';
  } else if (/\b(bu hafta|haftalik)\b/.test(normalized)) {
    const mondayOffset = (end.getDay() + 6) % 7;
    start = new Date(end); start.setDate(start.getDate() - mondayOffset); label = 'Bu hafta';
  } else if (/\b(bu ay|aylik)\b/.test(normalized)) {
    start = new Date(end.getFullYear(), end.getMonth(), 1); label = 'Bu ay';
  } else if (/\b(bu yil|yillik)\b/.test(normalized)) {
    start = new Date(end.getFullYear(), 0, 1); label = 'Bu yıl';
  }
  return start ? { fromDate: localIso(start), toDate: localIso(end), periodLabel: label } : { fromDate: null, toDate: null, periodLabel: label };
}

export function detectPersonalFinanceQuery(text, now = new Date()) {
  const normalized = fold(text);
  if (!normalized) return null;
  const mentions = /\b(ege|oglum(?:a|un|u)?|cocugum(?:a|un|u)?|harclik|aile gider|kisisel gider)\b/.test(normalized);
  const asks = /\b(ne kadar|toplam|rapor|ozet|gonderdim|verdim|harcadim|son|kayit)\b/.test(normalized) || /^(ege|harclik)$/.test(normalized);
  if (!mentions || !asks) return null;
  return {
    counterparty: /\b(ege|oglum(?:a|un|u)?|cocugum(?:a|un|u)?)\b/.test(normalized) ? 'Ege' : null,
    category: /\bharclik\b/.test(normalized) ? 'Harçlık' : null,
    direction: /\b(gonderdim|verdim|harcadim)\b/.test(normalized) ? 'outgoing' : null,
    ...queryPeriod(normalized, now)
  };
}

export async function personalFinanceSummary(db, query = {}) {
  await ensureFinancialDocumentSchema(db);
  const clauses = ["status='recorded'"];
  const bindings = [];
  if (query.counterparty) { clauses.push('lower(counterparty)=lower(?)'); bindings.push(query.counterparty); }
  if (query.category) { clauses.push('lower(category)=lower(?)'); bindings.push(query.category); }
  if (query.direction) { clauses.push('direction=?'); bindings.push(query.direction); }
  if (query.fromDate) { clauses.push('transaction_date>=?'); bindings.push(query.fromDate); }
  if (query.toDate) { clauses.push('transaction_date<=?'); bindings.push(query.toDate); }
  const where = clauses.join(' AND ');
  const aggregate = await db.prepare(`SELECT COUNT(*) AS event_count,COALESCE(SUM(amount),0) AS total_amount,MIN(transaction_date) AS first_date,MAX(transaction_date) AS last_date FROM personal_finance_events WHERE ${where}`).bind(...bindings).first();
  const latest = await db.prepare(`SELECT counterparty,relationship,category,amount,currency,transaction_date,direction,event_key FROM personal_finance_events WHERE ${where} ORDER BY transaction_date DESC,created_at DESC LIMIT 5`).bind(...bindings).all();
  return { count: Number(aggregate?.event_count || 0), total: Number(aggregate?.total_amount || 0), firstDate: aggregate?.first_date || null, lastDate: aggregate?.last_date || null, latest: latest?.results || [] };
}

export function personalFinanceSummaryReply(summary, query = {}) {
  const title = query.counterparty ? `${query.counterparty} — kişisel finans özeti` : 'Kişisel finans özeti';
  if (!summary.count) return `📒 ${title}\nHenüz doğrulanmış kayıt yok.`;
  return [`📒 ${title}`, query.periodLabel ? `Sorgu dönemi: ${query.periodLabel}` : null,
    `Toplam: ${trMoney(summary.total)}`, `İşlem: ${summary.count} kayıt`, `Kayıt aralığı: ${summary.firstDate} — ${summary.lastDate}`, '', 'Son hareketler:',
    ...summary.latest.map((row) => `• ${row.transaction_date} · ${row.category} · ${trMoney(row.amount,row.currency)}`)
  ].filter(Boolean).join('\n');
}

export const financialDocumentInternals = { amount, isoDate, fold, normalizeEvent, fallbackExtraction, jsonFromModel, queryPeriod };
