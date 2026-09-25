const OBLIGATION_TYPES = new Set(['credit_card','tax','sgk','rent','loan','utility','supplier_invoice','subscription','other']);
const SCOPES = new Set(['ALAYLI','SAHSI','BELIRSIZ']);
const FINANCIAL_WRITES = 0;

function clean(value, limit = 300) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function fold(value) {
  return clean(value, 50000).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
}

function parseAmount(value) {
  const raw = clean(value, 80).replace(/[^0-9.,-]/g, '');
  if (!raw) return null;
  let normalized = raw;
  if (raw.includes(',') && raw.includes('.')) normalized = raw.replace(/\./g, '').replace(',', '.');
  else if (raw.includes(',')) normalized = raw.replace(',', '.');
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(raw)) normalized = raw.replace(/\./g, '');
  const result = Number(normalized);
  return Number.isFinite(result) && result >= 0 ? Math.round(result * 100) / 100 : null;
}

function isoDate(value) {
  const text = clean(value, 50);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : null;
}

function labelledAmount(text, labels) {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}[^0-9]{0,35}(\\d[\\d.,]*)\\s*(?:TL|TRY|₺)?`, 'iu'));
    const parsed = parseAmount(match?.[1]);
    if (parsed != null) return parsed;
  }
  return null;
}

function labelledDate(text, labels) {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}[^0-9]{0,35}(\\d{1,2}[./-]\\d{1,2}[./-]\\d{4}|\\d{4}-\\d{2}-\\d{2})`, 'iu'));
    const parsed = isoDate(match?.[1]);
    if (parsed) return parsed;
  }
  return null;
}

function maskedIdentifier(text) {
  const explicit = text.match(/(?:kart|hesap|iban)[^\n\r*\d]{0,25}((?:\*{2,}|X{2,})\s*\d{3,4})/iu);
  if (explicit) return clean(explicit[1].replace(/\s+/g, ''), 24);
  const digits = clean(text, 50000).match(/\b(?:\d[ -]?){12,19}\b/);
  if (!digits) return null;
  const only = digits[0].replace(/\D/g, '');
  return only.length >= 4 ? `****${only.slice(-4)}` : null;
}

function normalizeScope(value) {
  const normalized = fold(value);
  if (['alayli','sirket','ticari','firma','business','company'].includes(normalized)) return 'ALAYLI';
  if (['sahsi','kisisel','ercan','personal','individual'].includes(normalized)) return 'SAHSI';
  return null;
}

function scopeFromText(text, rules = []) {
  const normalized = fold(text);
  const explicitScopes = new Set();
  if (/\b(alayli|alaylı|sirket|şirket|ticari|firma)\b/i.test(text)) explicitScopes.add('ALAYLI');
  if (/\b(sahsi|şahsi|bireysel|kisisel|kişisel)\b/i.test(text)) explicitScopes.add('SAHSI');
  if (explicitScopes.size > 1) return 'BELIRSIZ';

  const matchedRules = rules.filter((item) => {
    const keys = [fold(item?.alias_key), fold(item?.canonical_name)].filter(Boolean);
    return keys.some((key) => normalized.includes(key));
  });
  const ruleScopes = new Set(matchedRules.map((item) => normalizeScope(item?.scope || item?.owner_scope || item?.owner)).filter(Boolean));
  if (ruleScopes.size > 1) return 'BELIRSIZ';

  const explicitScope = [...explicitScopes][0] || null;
  let ruleScope = [...ruleScopes][0] || null;
  // Legacy rule rows represented known personal aliases without a scope column.
  if (!ruleScope && matchedRules.length) ruleScope = 'SAHSI';

  // Conflicting evidence must fail closed instead of silently forcing a bucket.
  if (explicitScope && ruleScope && explicitScope !== ruleScope) return 'BELIRSIZ';
  return explicitScope || ruleScope || 'BELIRSIZ';
}

function institutionFromText(text) {
  const known = text.match(/(İş Bankası|Is Bankasi|VakıfBank|VakifBank|Garanti BBVA|Akbank|Yapı Kredi|Yapi Kredi|SGK|Turkcell|Türk Telekom|Vodafone)/iu);
  if (known) return clean(known[1], 100);
  const labelled = text.match(/(?:kurum|banka|tedarikçi|tedarikci|alıcı|alici)\s*[:\-]\s*([^\n\r]{2,100})/iu);
  return clean(labelled?.[1], 100) || null;
}

function referenceFromText(text) {
  const match = text.match(/(?:referans|ref(?:erans)? no|işlem no|islem no|belge no|fatura no)\s*[:#\-]?\s*([A-Z0-9\-/]{4,60})/iu);
  return clean(match?.[1], 80) || null;
}

function documentClass(text) {
  const n = fold(text);
  if (/kredi karti|donem borcu|asgari odeme/.test(n)) return 'credit_card';
  if (/sgk|sosyal guvenlik|prim borcu/.test(n)) return 'sgk';
  if (/vergi|tahakkuk fisi|gib|gelir idaresi/.test(n)) return 'tax';
  if (/fast|eft|havale|dekont|para transferi/.test(n)) return 'payment';
  if (/kira/.test(n)) return 'rent';
  if (/kredi taksit|kredi odeme|loan/.test(n)) return 'loan';
  if (/abonelik|telekom|telefon faturasi|internet faturasi/.test(n)) return 'subscription';
  if (/elektrik|dogalgaz|su faturasi|utility/.test(n)) return 'utility';
  if (/tedarikci|tedarikçi|fatura/.test(n)) return 'supplier_invoice';
  return 'other';
}

function paymentDirection(text) {
  const n = fold(text);
  if (/gelen|hesaba gelen|alacak/.test(n)) return 'incoming';
  if (/giden|gonderilen|hesaptan|borc/.test(n)) return 'outgoing';
  return 'unknown';
}

export function extractFinanceMemory(text, options = {}) {
  const raw = String(text || '');
  const kind = documentClass(raw);
  const scope = scopeFromText(raw, options.rules || []);
  const institution = institutionFromText(raw);
  const currency = /\b(?:USD|\$)\b/i.test(raw) ? 'USD' : /\b(?:EUR|€)\b/i.test(raw) ? 'EUR' : 'TRY';
  if (kind === 'payment') {
    const total = labelledAmount(raw, ['(?:işlem|islem|transfer|gönderilen|gonderilen) tutar[ıi]?', 'tutar'])
      ?? parseAmount(raw.match(/(\d[\d.,]*)\s*(?:TL|TRY|₺|USD|EUR)/iu)?.[1]);
    return {
      kind: 'payment', direction: paymentDirection(raw), scope, institution,
      counterparty: institution, account_masked: maskedIdentifier(raw), transaction_date: labelledDate(raw, ['işlem tarihi','islem tarihi','tarih']),
      total_amount: total, currency, reference_no: referenceFromText(raw), confidence: 0,
    };
  }
  const totalLabels = kind === 'credit_card'
    ? ['toplam dönem borcu','toplam donem borcu','dönem borcu','donem borcu']
    : ['ödenecek tutar','odenecek tutar','borç tutarı','borc tutari','tahakkuk tutarı','tahakkuk tutari','genel toplam','toplam','tutar'];
  const total = labelledAmount(raw, totalLabels);
  const due = labelledDate(raw, ['son ödeme tarihi','son odeme tarihi','ödeme son günü','odeme son gunu','vade tarihi','son ödeme','son odeme','vade']);
  const statement = labelledDate(raw, ['hesap kesim tarihi','ekstre tarihi','belge tarihi','fatura tarihi','düzenleme tarihi','duzenleme tarihi','dönem']);
  const minimum = kind === 'credit_card' ? labelledAmount(raw, ['asgari ödeme tutarı','asgari odeme tutari','asgari ödeme','asgari odeme']) : null;
  const missing = [];
  if (!total) missing.push('total_amount');
  if (!due) missing.push('due_date');
  if (!institution) missing.push('institution');
  if (scope === 'BELIRSIZ') missing.push('scope');
  const confidence = Math.max(0.3, Math.min(0.99, 1 - missing.length * 0.18));
  return {
    kind: 'obligation', obligation_type: OBLIGATION_TYPES.has(kind) ? kind : 'other', scope,
    institution, counterparty: institution, account_masked: maskedIdentifier(raw), statement_date: statement,
    due_date: due, total_amount: total, minimum_amount: minimum, currency,
    collection_state: /başarısız|basarisiz|tahsil edilemedi/iu.test(raw) ? 'failed' : (/başarılı|basarili|tahsil edildi/iu.test(raw) ? 'successful' : null),
    reference_no: referenceFromText(raw), confidence, missing,
    status: missing.length ? 'needs_review' : 'open',
  };
}

export function istanbulDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now).reduce((out, item) => ({ ...out, [item.type]: item.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dayNumber(date) { return Date.parse(`${date}T00:00:00Z`) / 86400000; }

export function dueRisk(dueDate, now = new Date()) {
  if (!isoDate(dueDate)) return { status: 'needs_review', risk: 'REVIEW', days_remaining: null };
  const days = dayNumber(dueDate) - dayNumber(istanbulDate(now));
  if (days < 0) return { status: 'overdue', risk: 'OVERDUE', days_remaining: days };
  if (days <= 1) return { status: 'due_soon', risk: 'CRITICAL', days_remaining: days };
  if (days <= 3) return { status: 'due_soon', risk: 'HIGH', days_remaining: days };
  if (days <= 7) return { status: 'due_soon', risk: 'APPROACHING', days_remaining: days };
  return { status: 'open', risk: 'NORMAL', days_remaining: days };
}

export function paymentMatchScore(obligation, payment) {
  if (!obligation || !payment || payment.kind !== 'payment' || payment.direction === 'incoming') return { score: 0, reasons: [] };
  let score = 0;
  const reasons = [];
  const amountDelta = Math.abs(Number(obligation.total_amount || 0) - Number(payment.total_amount || 0));
  if (obligation.total_amount && amountDelta <= 0.01) { score += 0.55; reasons.push('amount_exact'); }
  else if (obligation.minimum_amount && Math.abs(Number(obligation.minimum_amount) - Number(payment.total_amount || 0)) <= 0.01) { score += 0.4; reasons.push('minimum_exact'); }
  const partyA = fold([obligation.institution, obligation.counterparty].join(' '));
  const partyB = fold([payment.institution, payment.counterparty].join(' '));
  if (partyA && partyB && (partyA.includes(partyB) || partyB.includes(partyA))) { score += 0.25; reasons.push('party'); }
  if (obligation.account_masked && payment.account_masked && obligation.account_masked === payment.account_masked) { score += 0.15; reasons.push('account'); }
  if (obligation.reference_no && payment.reference_no && obligation.reference_no === payment.reference_no) { score += 0.2; reasons.push('reference'); }
  if (obligation.due_date && payment.transaction_date) {
    const days = Math.abs(dayNumber(obligation.due_date) - dayNumber(payment.transaction_date));
    if (days <= 7) { score += 0.1; reasons.push('date_window'); }
  }
  return { score: Math.min(1, Math.round(score * 100) / 100), reasons };
}

export function safePaymentDecision(obligations, payment) {
  const ranked = obligations.filter((row) => ['open','due_soon','overdue'].includes(row.status || 'open'))
    .map((row) => ({ obligation: row, ...paymentMatchScore(row, payment) })).sort((a, b) => b.score - a.score);
  const best = ranked[0] || null;
  const ambiguous = best && ranked[1] && ranked[1].score === best.score;
  return best && best.score >= 0.85 && !ambiguous
    ? { action: 'paid', confidence: best.score, obligation: best.obligation, reasons: best.reasons }
    : { action: 'needs_review', confidence: best?.score || 0, obligation: best?.obligation || null, reasons: best?.reasons || [] };
}

export function transitionObligationStatus(current, target) {
  const allowed = { open: ['due_soon','overdue','paid','needs_review'], due_soon: ['overdue','paid','needs_review'], overdue: ['paid','needs_review'], paid: ['archived'], needs_review: ['open','archived'], archived: [] };
  if (!(allowed[current] || []).includes(target)) throw new Error(`invalid_obligation_transition:${current}->${target}`);
  return target;
}

async function sha256(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || '')));
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, '0')).join('');
}

export async function financeMemoryDedupeKey(document, evidenceKey = '') {
  const identity = document.kind === 'payment'
    ? [document.kind,document.direction,document.institution,document.total_amount,document.transaction_date,document.reference_no || document.account_masked || evidenceKey]
    : [document.kind,document.obligation_type,document.scope,document.institution,document.account_masked,document.statement_date,document.due_date,document.total_amount];
  return `fmem-${(await sha256(identity.join('|'))).slice(0, 32)}`;
}

export function dueWarningKey(obligation, risk, localDate) {
  return `${obligation.obligation_key}|${risk.risk}|${localDate}`;
}

export async function refreshDueRisks(db, now = new Date()) {
  await ensureFinanceMemorySchema(db);
  const localDate = istanbulDate(now);
  const result = await db.prepare("SELECT obligation_key,due_date,status FROM finance_obligations WHERE status IN ('open','due_soon','overdue')").all();
  const alerts = [];
  for (const obligation of result?.results || []) {
    const risk = dueRisk(obligation.due_date, now);
    if (risk.status !== obligation.status) {
      await db.prepare("UPDATE finance_obligations SET status=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE obligation_key=?")
        .bind(risk.status, obligation.obligation_key).run();
    }
    if (risk.risk !== 'NORMAL' && risk.risk !== 'REVIEW') {
      const write = await db.prepare('INSERT OR IGNORE INTO finance_obligation_alerts (obligation_key,risk_level,local_date) VALUES (?,?,?)')
        .bind(obligation.obligation_key,risk.risk,localDate).run();
      if (Number(write?.meta?.changes || write?.changes || 0) > 0) alerts.push({ obligation_key: obligation.obligation_key, ...risk });
    }
  }
  return { local_date: localDate, alerts };
}

export async function ensureFinanceMemorySchema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS finance_obligations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, obligation_key TEXT NOT NULL UNIQUE,
    scope TEXT NOT NULL CHECK(scope IN ('ALAYLI','SAHSI','BELIRSIZ')),
    obligation_type TEXT NOT NULL, institution TEXT, counterparty TEXT, account_masked TEXT,
    statement_date TEXT, due_date TEXT, total_amount REAL, minimum_amount REAL, currency TEXT NOT NULL DEFAULT 'TRY',
    status TEXT NOT NULL DEFAULT 'needs_review', source_evidence_key TEXT NOT NULL, source_message_id TEXT,
    document_hash TEXT NOT NULL, dedupe_key TEXT NOT NULL UNIQUE, confidence REAL NOT NULL DEFAULT 0,
    collection_state TEXT, paid_at TEXT, matched_transaction_key TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS finance_payment_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT, payment_key TEXT NOT NULL UNIQUE, obligation_key TEXT,
    evidence_key TEXT NOT NULL, amount REAL, transaction_date TEXT, confidence REAL NOT NULL,
    status TEXT NOT NULL, reasons_json TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS finance_obligation_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, obligation_key TEXT NOT NULL, risk_level TEXT NOT NULL,
    local_date TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(obligation_key,risk_level,local_date)
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_finance_obligations_due ON finance_obligations(status,due_date)').run();
}

export async function persistFinanceMemory(db, document, meta = {}) {
  await ensureFinanceMemorySchema(db);
  const evidenceKey = clean(meta.evidence_key, 200) || `evidence-${clean(meta.source_message_id, 100)}`;
  const documentHash = clean(meta.document_hash, 128) || await sha256(JSON.stringify(document));
  const dedupeKey = await financeMemoryDedupeKey(document, evidenceKey);
  if (document.kind === 'obligation') {
    const risk = document.status === 'needs_review' ? { status: 'needs_review' } : dueRisk(document.due_date, meta.now || new Date());
    const obligationKey = `obl-${dedupeKey.slice(5)}`;
    await db.prepare(`INSERT INTO finance_obligations
      (obligation_key,scope,obligation_type,institution,counterparty,account_masked,statement_date,due_date,total_amount,minimum_amount,currency,status,source_evidence_key,source_message_id,document_hash,dedupe_key,confidence,collection_state)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(dedupe_key) DO NOTHING`)
      .bind(obligationKey,document.scope,document.obligation_type,document.institution,document.counterparty,document.account_masked,
        document.statement_date,document.due_date,document.total_amount,document.minimum_amount,document.currency,risk.status,
        evidenceKey,meta.source_message_id || null,documentHash,dedupeKey,document.confidence,document.collection_state || null).run();
    return { kind: 'obligation', obligation_key: obligationKey, status: risk.status, dedupe_key: dedupeKey };
  }
  const open = await db.prepare("SELECT * FROM finance_obligations WHERE status IN ('open','due_soon','overdue') ORDER BY due_date").all();
  const decision = safePaymentDecision(open?.results || [], document);
  const paymentKey = `pay-${dedupeKey.slice(5)}`;
  await db.prepare(`INSERT INTO finance_payment_matches (payment_key,obligation_key,evidence_key,amount,transaction_date,confidence,status,reasons_json)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(payment_key) DO NOTHING`).bind(paymentKey,decision.obligation?.obligation_key || null,evidenceKey,
      document.total_amount,document.transaction_date,decision.confidence,decision.action,JSON.stringify(decision.reasons)).run();
  if (decision.action === 'paid') {
    await db.prepare("UPDATE finance_obligations SET status='paid',paid_at=?,matched_transaction_key=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE obligation_key=? AND status IN ('open','due_soon','overdue')")
      .bind(document.transaction_date,paymentKey,decision.obligation.obligation_key).run();
  }
  return { kind: 'payment', payment_key: paymentKey, status: decision.action, matched_obligation_key: decision.obligation?.obligation_key || null, confidence: decision.confidence };
}

export function buildFinanceMemorySummary(rows, now = new Date()) {
  const sections = { today: [], within3: [], within7: [], overdue: [], recentlyPaid: [], needsReview: [] };
  for (const row of rows || []) {
    if (row.status === 'paid' || row.status === 'archived') { sections.recentlyPaid.push(row); continue; }
    if (row.status === 'needs_review') { sections.needsReview.push(row); continue; }
    const risk = dueRisk(row.due_date, now);
    const item = { ...row, ...risk };
    if (risk.status === 'overdue') sections.overdue.push(item);
    else if (risk.days_remaining <= 0) sections.today.push(item);
    else if (risk.days_remaining <= 3) sections.within3.push(item);
    else if (risk.days_remaining <= 7) sections.within7.push(item);
  }
  return sections;
}

export async function financeMemorySummaryFromDb(db, now = new Date()) {
  await ensureFinanceMemorySchema(db);
  const result = await db.prepare("SELECT obligation_key,scope,obligation_type,institution,counterparty,account_masked,due_date,total_amount,minimum_amount,currency,status,paid_at FROM finance_obligations WHERE status!='archived' ORDER BY due_date LIMIT 100").all();
  return buildFinanceMemorySummary(result?.results || [], now);
}

function itemLine(row) {
  const amount = row.total_amount == null ? 'tutar belirsiz' : `${Number(row.total_amount).toLocaleString('tr-TR')} ${row.currency || 'TRY'}`;
  return `• ${row.institution || row.counterparty || 'Kurum belirsiz'}${row.account_masked ? ` ${row.account_masked}` : ''} | ${row.scope} | ${row.due_date || 'vade belirsiz'} | ${amount}`;
}

export function financeMemorySummaryText(summary) {
  const groups = [
    ['BUGÜN ÖDENECEKLER',summary.today],['3 GÜN İÇİNDE',summary.within3],['7 GÜN İÇİNDE',summary.within7],
    ['GECİKENLER',summary.overdue],['SON ÖDEME İLE KAPANANLAR',summary.recentlyPaid],['İNCELEME GEREKENLER',summary.needsReview],
  ];
  return groups.map(([title, rows]) => `\n${title}\n${rows.length ? rows.slice(0, 5).map(itemLine).join('\n') : '• Yok'}`).join('');
}

export const financeObligationInternals = { parseAmount, isoDate, documentClass, maskedIdentifier, scopeFromText, FINANCIAL_WRITES };
