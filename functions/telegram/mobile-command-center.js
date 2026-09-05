const CLOSED_STATUSES = ['completed', 'cancelled', 'verified', 'done', 'closed'];

export const MOBILE_COMMANDS = Object.freeze({
  menu: { risk: 'read', title: 'Ana menü' },
  morning: { risk: 'read', title: 'Günaydın özeti' },
  system: { risk: 'read', title: 'Sistem sağlığı' },
  priority_status: { risk: 'read', title: 'Önemli işler özeti' },
  approvals: { risk: 'read', title: 'Onay kuyruğu' },
  tasks: { risk: 'read', title: 'Görevler' },
  memory: { risk: 'read', title: 'Hafıza özeti' },
  command_catalog: { risk: 'read', title: 'Komut kataloğu' },
  command_status: { risk: 'read', title: 'Son komutlar' },
  device_status: { risk: 'read', title: 'Cihaz durumu' },
  task_capture: { risk: 'low_risk', title: 'Görev yakalama' },
  help: { risk: 'read', title: 'Yardım' }
});

export function normalizeTurkish(value) {
  return String(value || '')
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ');
}

export function parseMobileCommand(text) {
  const raw = String(text || '').trim();
  const normalized = normalizeTurkish(raw);
  if (/^\/(start|menu)(?:@\w+)?\b/.test(normalized) || /^(menü|menu)$/.test(normalized)) return { code: 'menu' };
  if (/^\/sabah(?:@\w+)?\b/.test(normalized) || /^günaydın\s+aperion\b/.test(normalized)) return { code: 'morning' };
  if (/^\/sistem(?:@\w+)?\b/.test(normalized) || /^(sistem|sistem durumu)$/.test(normalized)) return { code: 'system' };
  if (/^\/(onemli|önemli)(?:@\w+)?\b/.test(normalized) || /^önemli işler$/.test(normalized)) return { code: 'priority_status' };
  if (/^\/onaylar(?:@\w+)?\b/.test(normalized)) return { code: 'approvals' };
  if (/^\/(gorevler|görevler)(?:@\w+)?\b/.test(normalized)) return { code: 'tasks' };
  if (/^\/hafiza(?:@\w+)?\b/.test(normalized) || /^\/hafıza(?:@\w+)?\b/.test(normalized)) return { code: 'memory' };
  if (/^\/(yardim|yardım)(?:@\w+)?\b/.test(normalized)) return { code: 'help' };
  if (/^\/(komutlar|commands)(?:@\w+)?\b/.test(normalized)) return { code: 'command_catalog' };
  if (/^\/(komutdurum|sonuclar|sonuçlar)(?:@\w+)?\b/.test(normalized)) return { code: 'command_status' };
  if (/^\/(cihazdurum|cihaz)(?:@\w+)?\b/.test(normalized) || /^cihaz durumu$/.test(normalized)) return { code: 'device_status' };
  const task = raw.match(/^\/(?:gorev|görev)(?:@\w+)?\s+([\s\S]+)$/iu);
  if (task && task[1].trim()) return { code: 'task_capture', payload: task[1].trim() };
  return null;
}

function listFromEnv(value) {
  return new Set(String(value || '').split(',').map((item) => item.trim()).filter(Boolean));
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

async function hashHex(value) {
  const bytes = await sha256(value);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function constantTimeEqual(left, right) {
  const [a, b] = await Promise.all([sha256(left), sha256(right)]);
  let different = a.length ^ b.length;
  for (let i = 0; i < a.length; i += 1) different |= a[i] ^ b[i];
  return different === 0;
}

function updateIdentity(update) {
  const message = update?.message || update?.edited_message || update?.callback_query?.message;
  const from = update?.callback_query?.from || update?.message?.from || update?.edited_message?.from;
  return {
    chatId: message?.chat?.id == null ? '' : String(message.chat.id),
    userId: from?.id == null ? '' : String(from.id)
  };
}

async function ensureSecuritySchema(db) {
  if (!db) return false;
  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS telegram_security_config (
        config_key TEXT PRIMARY KEY,
        config_value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ).run();
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS telegram_command_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command_key TEXT NOT NULL UNIQUE,
        chat_id TEXT NOT NULL,
        user_id TEXT,
        message_id TEXT NOT NULL,
        command_code TEXT NOT NULL,
        risk_class TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        result_summary TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      )`
    ).run();
    return true;
  } catch (_error) {
    return false;
  }
}

async function readSecurityConfig(db, key) {
  try {
    const row = await db.prepare('SELECT config_value FROM telegram_security_config WHERE config_key=?').bind(key).first();
    return row?.config_value || '';
  } catch (_error) {
    return '';
  }
}

async function writeSecurityConfig(db, key, value) {
  await db.prepare(
    `INSERT INTO telegram_security_config (config_key,config_value,updated_at)
     VALUES (?,?,datetime('now'))
     ON CONFLICT(config_key) DO UPDATE SET config_value=excluded.config_value,updated_at=datetime('now')`
  ).bind(key, value).run();
}

async function resolveLegacyOwnerChat(db) {
  try {
    const row = await db.prepare(
      `SELECT chat_id,COUNT(*) AS message_count
       FROM quick_notes
       WHERE chat_id IS NOT NULL AND chat_id<>''
       GROUP BY chat_id
       ORDER BY message_count DESC
       LIMIT 1`
    ).first();
    return row?.chat_id == null ? '' : String(row.chat_id);
  } catch (_error) {
    return '';
  }
}

function randomSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function registerTelegramWebhook(env, secret) {
  const token = env.HERMES_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, code: 'missing_bot_token' };
  const url = `https://api.telegram.org/bot${token}/setWebhook`;
  const body = new URLSearchParams({
    url: env.TELEGRAM_WEBHOOK_URL || 'https://aperion-istasyon.pages.dev/telegram/webhook',
    secret_token: secret
  });
  try {
    const response = await fetch(url, { method: 'POST', body });
    const result = await response.json();
    return response.ok && result?.ok
      ? { ok: true, code: 'ready' }
      : {
          ok: false,
          code: `telegram_api_${response.status || 'rejected'}`,
          retryAfter: Math.max(30, Number(result?.parameters?.retry_after) || 60)
        };
  } catch (_error) {
    return { ok: false, code: 'telegram_fetch_failed' };
  }
}

async function verifyD1Security(request, env, identity) {
  if (!env.APERION_DB || !(await ensureSecuritySchema(env.APERION_DB))) {
    return { ok: false, status: 503, reason: 'security_store_unavailable' };
  }

  let allowedChat = await readSecurityConfig(env.APERION_DB, 'allowed_chat_id');
  if (!allowedChat) {
    allowedChat = await resolveLegacyOwnerChat(env.APERION_DB);
    if (!allowedChat || identity.chatId !== allowedChat) return { ok: false, status: 403, reason: 'bootstrap_identity_failed' };
    await writeSecurityConfig(env.APERION_DB, 'allowed_chat_id', allowedChat);
  }
  if (!identity.chatId || identity.chatId !== allowedChat) return { ok: false, status: 403, reason: 'chat_not_allowed' };

  const supplied = request.headers.get('x-telegram-bot-api-secret-token') || '';
  let storedHash = await readSecurityConfig(env.APERION_DB, 'webhook_secret_sha256');
  if (!storedHash) {
    const retryAt = await readSecurityConfig(env.APERION_DB, 'webhook_retry_at');
    if (retryAt && Date.parse(retryAt) > Date.now()) {
      return { ok: true, ...identity, hardened: false, bootstrapped: false, bootstrapPending: true };
    }
    const secret = randomSecret();
    const registration = await registerTelegramWebhook(env, secret);
    if (!registration.ok) {
      await writeSecurityConfig(env.APERION_DB, 'webhook_bootstrap_status', registration.code);
      await writeSecurityConfig(env.APERION_DB, 'webhook_retry_at', new Date(Date.now() + (registration.retryAfter || 60) * 1000).toISOString());
      return { ok: true, ...identity, hardened: false, bootstrapped: false, bootstrapPending: true };
    }
    storedHash = await hashHex(secret);
    await writeSecurityConfig(env.APERION_DB, 'webhook_secret_sha256', storedHash);
    await writeSecurityConfig(env.APERION_DB, 'webhook_bootstrap_status', 'ready');
    await writeSecurityConfig(env.APERION_DB, 'webhook_retry_at', '');
    return { ok: true, ...identity, hardened: true, bootstrapped: true };
  }

  if (!supplied || !(await constantTimeEqual(await hashHex(supplied), storedHash))) {
    return { ok: false, status: 403, reason: 'invalid_webhook_secret' };
  }
  return { ok: true, ...identity, hardened: true, bootstrapped: false };
}

export async function verifyTelegramRequest(request, env, update) {
  const identity = updateIdentity(update);
  const expectedSecret = String(env.TELEGRAM_WEBHOOK_SECRET || '');
  if (expectedSecret) {
    const supplied = request.headers.get('x-telegram-bot-api-secret-token') || '';
    if (!supplied || !(await constantTimeEqual(supplied, expectedSecret))) {
      return { ok: false, status: 403, reason: 'invalid_webhook_secret' };
    }
  }

  const { chatId, userId } = identity;
  const allowedChats = listFromEnv(env.TELEGRAM_ALLOWED_CHAT_IDS);
  const allowedUsers = listFromEnv(env.TELEGRAM_ALLOWED_USER_IDS);
  if (!expectedSecret && !allowedChats.size && !allowedUsers.size) {
    return verifyD1Security(request, env, identity);
  }
  if (allowedChats.size && (!chatId || !allowedChats.has(chatId))) return { ok: false, status: 403, reason: 'chat_not_allowed' };
  if (allowedUsers.size && (!userId || !allowedUsers.has(userId))) return { ok: false, status: 403, reason: 'user_not_allowed' };
  return {
    ok: true,
    chatId,
    userId,
    hardened: Boolean(expectedSecret && allowedChats.size)
  };
}

export async function getMobileSecurityStatus(env) {
  const configuredByEnvironment = Boolean(env.TELEGRAM_WEBHOOK_SECRET && env.TELEGRAM_ALLOWED_CHAT_IDS);
  if (configuredByEnvironment) return { identityGuard: true, webhookSecret: true, source: 'environment' };
  if (!env.APERION_DB || !(await ensureSecuritySchema(env.APERION_DB))) {
    return { identityGuard: false, webhookSecret: false, source: 'unavailable' };
  }
  const [chat, secretHash] = await Promise.all([
    readSecurityConfig(env.APERION_DB, 'allowed_chat_id'),
    readSecurityConfig(env.APERION_DB, 'webhook_secret_sha256')
  ]);
  const bootstrapStatus = await readSecurityConfig(env.APERION_DB, 'webhook_bootstrap_status');
  return { identityGuard: Boolean(chat), webhookSecret: Boolean(secretHash), source: 'd1', bootstrapStatus: bootstrapStatus || 'pending' };
}

async function safeAll(db, sql, bindings = []) {
  if (!db) return { available: false, rows: [] };
  try {
    const result = await db.prepare(sql).bind(...bindings).all();
    return { available: true, rows: result?.results || [] };
  } catch (_error) {
    return { available: false, rows: [] };
  }
}

async function safeFirst(db, sql, bindings = []) {
  if (!db) return { available: false, row: null };
  try {
    return { available: true, row: await db.prepare(sql).bind(...bindings).first() };
  } catch (_error) {
    return { available: false, row: null };
  }
}

function valueOrUnknown(result, value) {
  return result.available ? String(value ?? 0) : 'kaynak okunamadı';
}

async function commandHash(chatId, messageId, code) {
  const bytes = await sha256(`${chatId}:${messageId}:${code}`);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function recordCommand(db, { chatId, userId, messageId, code, risk, status, resultSummary }) {
  if (!db) return false;
  try {
    const key = `telegram:${chatId}:${messageId}`;
    const hash = await commandHash(chatId, messageId, code);
    await db.prepare(
      `INSERT INTO telegram_command_log
       (command_key,chat_id,user_id,message_id,command_code,risk_class,content_hash,status,result_summary,completed_at)
       VALUES (?,?,?,?,?,?,?,?,?,CASE WHEN ? IN ('completed','captured','failed') THEN datetime('now') ELSE NULL END)
       ON CONFLICT(command_key) DO UPDATE SET
         status=excluded.status,
         result_summary=excluded.result_summary,
         completed_at=excluded.completed_at`
    ).bind(key, chatId, userId || null, String(messageId), code, risk, hash, status, resultSummary || null, status).run();
    return true;
  } catch (_error) {
    // Audit must never make a read-only command unusable; health will expose a missing table.
    return false;
  }
}

function menuText(hardened) {
  return [
    '🧠 AperiON Mobil Kumanda',
    '',
    '🌅 Günaydın: Günaydın AperiON veya /sabah',
    '🩺 Sistem: /sistem',
    '⭐ Önemli işler: /onemli',
    '🖥️ Cihaz durumu: /cihazdurum',
    '✅ Onaylar: /onaylar',
    '📋 Görevler: /gorevler',
    '🧠 Hafıza: /hafiza',
    '➕ Görev ekle: /gorev yapılacak iş',
    '📦 Stok: /stok ürün adı',
    '📊 Ürün performansı: /urunraporu ürün adı',
    '📊 Cari raporu: /cariraporu cari adı',
    '📈 Gelir tablosu: /gelirtablosu',
    '⚖️ Bilanço: /bilanco',
    '⚙️ Rapor alanları: /raporalanlari',
    '💰 Bakiye: bakiye',
    '📎 Belge/fotoğraf: doğrudan gönder',
    '🧭 Tüm komutlar: /komutlar',
    '🕘 Son komutlar: /komutdurum',
    '🖥️ Uygulama aç: “BizimHesap aç”, “Gmail aç”, “Drive aç”',
    '💬 Serbest emir: /komut yapılacak iş',
    '',
    'Gerçek mali işlemler yalnızca tek kullanımlık açık onaydan sonra yürütülür.',
    hardened ? '🔒 Telegram kimliği ve webhook doğrulaması etkin.' : '⚠️ Webhook anahtarı tamamlanıyor: mali/iletişim işlemleri kapalı; sabit uygulama açma ve iç kayıt komutları kullanılabilir.'
  ].join('\n');
}

function commandCatalogText() {
  return [
    '🧭 AperiON Komut Kataloğu',
    '',
    'OTOMATİK / SALT OKUNUR',
    '• /sabah · /sistem · /onemli · /cihazdurum · /onaylar · /gorevler · /hafiza',
    '• /stok ürün · bakiye · /durum',
    '• /urunraporu ürün · /cariraporu cari · /gelirtablosu · /bilanco',
    '• /raporalanlari ile gösterilecek alanları siz belirlersiniz',
    '',
    'MASAÜSTÜ — SABİT VE GÜVENLİ HEDEFLER',
    '• BizimHesap aç · Gmail aç · Drive aç · Takvim aç',
    '• Telegram aç · WhatsApp aç · AperiON aç',
    '',
    'KAYIT / PLANLAMA',
    '• /gorev yapılacak iş',
    '• /komut serbest metinli emir',
    '• Belge veya fotoğrafı doğrudan gönder',
    '',
    'TEK KULLANIMLIK ONAY GEREKTİRİR',
    '• Para, ödeme, transfer, fatura, satınalma ve tahsilat',
    '• Mesaj/e-posta gönderme, paylaşma veya yayınlama',
    '• Silme, iptal, yetki ve erişim değişiklikleri',
    '',
    'AperiON tanımadığı emri kaybetmez: inceleme kuyruğuna alır ve hiçbir dış işlemi uydurmaz.'
  ].join('\n');
}

async function buildCommandStatusText(db) {
  const result = await safeAll(db, 'SELECT raw_text,status,risk_class,created_at,result_summary FROM telegram_command_requests ORDER BY created_at DESC LIMIT 8');
  if (!result.available) return '⚠️ Komut geçmişi henüz hazır değil.';
  if (!result.rows.length) return '🕘 Henüz kayıtlı bir serbest komut yok.';
  return [
    '🕘 Son AperiON komutları:',
    '',
    ...result.rows.map((row) => `• ${String(row.raw_text || '').slice(0, 80)}\n  ${row.status} · ${row.risk_class}${row.result_summary ? ` · ${row.result_summary}` : ''}`)
  ].join('\n');
}

function parseSqliteUtc(value) {
  const text = String(value || '').trim();
  if (!text) return NaN;
  return Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(text) ? text : `${text.replace(' ', 'T')}Z`);
}

async function buildDeviceStatusText(db, nowMs = Date.now()) {
  const [devices, commands] = await Promise.all([
    safeAll(db, `SELECT device_id,device_name,status,last_seen_at,created_at
      FROM aperion_devices WHERE status='active'
      ORDER BY COALESCE(last_seen_at,created_at) DESC LIMIT 5`),
    safeFirst(db, `SELECT COUNT(*) AS total,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status='processing' THEN 1 ELSE 0 END) AS processing,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed
      FROM aperion_device_commands`)
  ]);
  if (!devices.available || !commands.available) {
    return '⚠️ Cihaz durumu şu an okunamadı; hiçbir masaüstü komutu çalıştırılmadı.';
  }
  if (!devices.rows.length) {
    return '🖥️ Kayıtlı aktif AperiON bilgisayarı yok. Masaüstü köprüsü kurulmadan Telegram komutları bilgisayarda çalışmaz.';
  }

  const latest = devices.rows[0];
  const lastSeenMs = parseSqliteUtc(latest.last_seen_at);
  const online = Number.isFinite(lastSeenMs) && nowMs - lastSeenMs <= 90 * 1000;
  const connection = online
    ? 'ÇEVRİMİÇİ'
    : (latest.last_seen_at ? 'ÇEVRİMDIŞI' : 'KAYITLI — İLK BAĞLANTI BEKLENİYOR');
  return [
    '🖥️ AperiON cihaz durumu',
    '',
    `• Bilgisayar: ${latest.device_name || latest.device_id}`,
    `• Bağlantı: ${connection}`,
    `• Son görülme: ${latest.last_seen_at || 'henüz bağlantı kurulmadı'}`,
    `• Kayıtlı aktif cihaz: ${devices.rows.length}`,
    `• Bekleyen komut: ${commands.row?.pending || 0}`,
    `• İşleniyor: ${commands.row?.processing || 0}`,
    `• Tamamlanan: ${commands.row?.completed || 0}`,
    `• Başarısız: ${commands.row?.failed || 0}`,
    '',
    online
      ? 'Telefon komutları masaüstü köprüsü tarafından alınabilir.'
      : 'Bilgisayarda AperiON köprüsü çalıştırılmadan bekleyen komutlar açılmaz.'
  ].join('\n');
}

const PRIORITY_CATEGORIES = Object.freeze([
  { key: 'received_orders', label: 'Alınan siparişler', types: ['received_order', 'sales_order', 'customer_order', 'alinan_siparis'] },
  { key: 'placed_orders', label: 'Verilen siparişler', types: ['purchase_order', 'supplier_order', 'placed_order', 'verilen_siparis'] },
  { key: 'payments', label: 'Ödemeler', types: ['payable', 'payment', 'odeme'] },
  { key: 'collections', label: 'Tahsilatlar', types: ['receivable', 'collection', 'tahsilat'] }
]);

function normalizedType(value) {
  return normalizeTurkish(value).replace(/[^a-z0-9çğıöşü]+/g, '_').replace(/^_+|_+$/g, '');
}

async function buildPrioritySnapshot(db) {
  const [commitments, work] = await Promise.all([
    safeAll(db, `SELECT commitment_type,amount,currency,time_bucket
      FROM commitment_timeline
      WHERE status NOT IN ('completed','cancelled','verified','done','closed')
      LIMIT 1000`),
    safeFirst(db, `SELECT COUNT(*) AS count FROM work_items
      WHERE status NOT IN ('completed','cancelled','verified','done','closed')`)
  ]);
  const categories = {};
  for (const category of PRIORITY_CATEGORIES) categories[category.key] = { count: 0, knownAmount: 0, overdue: 0 };
  if (commitments.available) {
    for (const row of commitments.rows) {
      const type = normalizedType(row.commitment_type);
      const category = PRIORITY_CATEGORIES.find((item) => item.types.includes(type));
      if (!category) continue;
      const bucket = categories[category.key];
      bucket.count += 1;
      if (Number.isFinite(Number(row.amount))) bucket.knownAmount += Number(row.amount);
      if (row.time_bucket === 'overdue') bucket.overdue += 1;
    }
  }
  return {
    available: commitments.available && work.available,
    categories,
    tasks: work.available ? Number(work.row?.count || 0) : null
  };
}

function prioritySnapshotLines(snapshot) {
  if (!snapshot.available) return ['• Beşli ana kontrol: kaynak okunamadı'];
  const lines = PRIORITY_CATEGORIES.map((category) => {
    const value = snapshot.categories[category.key];
    const amount = value.knownAmount > 0 ? ` · bilinen ${Math.round(value.knownAmount).toLocaleString('tr-TR')} TL` : '';
    const overdue = value.overdue > 0 ? ` · ${value.overdue} gecikmiş` : '';
    return `• ${category.label}: ${value.count}${amount}${overdue}`;
  });
  lines.push(`• Yapılacaklar: ${snapshot.tasks}`);
  return lines;
}

async function buildPriorityStatusText(db) {
  const snapshot = await buildPrioritySnapshot(db);
  return [
    '⭐ AperiON ana kontrol listesi',
    '',
    ...prioritySnapshotLines(snapshot),
    '',
    snapshot.available
      ? 'Bu ekran yalnızca kayıtlı ve doğrulanabilir verileri sayar.'
      : 'Eksik kaynak sıfır kabul edilmedi; veri hazır olunca yeniden deneyin.'
  ].join('\n');
}

async function buildMorningBrief(db) {
  const [approvals, work, commitments, sources, priorities] = await Promise.all([
    safeFirst(db, "SELECT COUNT(*) AS count FROM approval_queue WHERE status IN ('needs_review','pending','approval_pending')"),
    safeFirst(db, "SELECT COUNT(*) AS count FROM work_items WHERE status NOT IN ('completed','cancelled','verified','done','closed')"),
    safeFirst(db, "SELECT SUM(CASE WHEN time_bucket='overdue' THEN 1 ELSE 0 END) AS overdue, SUM(CASE WHEN time_bucket='approaching' THEN 1 ELSE 0 END) AS approaching FROM commitment_timeline WHERE time_bucket IN ('overdue','approaching')"),
    safeFirst(db, "SELECT SUM(CASE WHEN status IN ('ok','confirmed') THEN 1 ELSE 0 END) AS healthy, COUNT(*) AS total FROM source_health"),
    buildPrioritySnapshot(db)
  ]);
  return [
    '🌅 Günaydın. AperiON sabah özeti:',
    '',
    `• Bekleyen onay: ${valueOrUnknown(approvals, approvals.row?.count)}`,
    `• Açık görev: ${valueOrUnknown(work, work.row?.count)}`,
    `• Gecikmiş taahhüt: ${valueOrUnknown(commitments, commitments.row?.overdue)}`,
    `• 3 gün içinde: ${valueOrUnknown(commitments, commitments.row?.approaching)}`,
    `• Sağlıklı kaynak: ${sources.available ? `${sources.row?.healthy || 0}/${sources.row?.total || 0}` : 'kaynak okunamadı'}`,
    '',
    'Öncelikli operasyonlar:',
    ...prioritySnapshotLines(priorities),
    '',
    'Bu ifade kimlik doğrulama tetikleyicisidir; mali işlem onayı değildir.'
  ].join('\n');
}

async function buildSystemText(db) {
  const [sources, connectors, audit] = await Promise.all([
    safeAll(db, 'SELECT source_id,status,last_success_at FROM source_health ORDER BY source_id LIMIT 12'),
    safeFirst(db, "SELECT COUNT(*) AS total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active FROM connector_registry"),
    safeFirst(db, 'SELECT COUNT(*) AS count FROM telegram_command_log')
  ]);
  const lines = ['🩺 AperiON sistem sağlığı', ''];
  lines.push(`• Bağlayıcılar: ${connectors.available ? `${connectors.row?.active || 0}/${connectors.row?.total || 0} aktif` : 'okunamadı'}`);
  lines.push(`• Telegram audit: ${audit.available ? `${audit.row?.count || 0} komut` : 'tablo/migrasyon bekliyor'}`);
  if (sources.available && sources.rows.length) {
    lines.push('', 'Kaynaklar:');
    for (const row of sources.rows) lines.push(`• ${row.source_id}: ${row.status}`);
  } else {
    lines.push('• Kaynak sağlığı: kayıt yok veya okunamadı');
  }
  return lines.join('\n');
}

async function buildApprovalsText(db) {
  const result = await safeAll(db, "SELECT id,item_type,status,created_at FROM approval_queue WHERE status IN ('needs_review','pending','approval_pending') ORDER BY created_at DESC LIMIT 10");
  if (!result.available) return '⚠️ Onay kuyruğu şu an okunamadı.';
  if (!result.rows.length) return '✅ Bekleyen onay yok.';
  return ['✅ Bekleyen onaylar:', '', ...result.rows.map((row) => `• #${row.id} · ${row.item_type} · ${row.status}`), '', 'Onay, yalnızca ilgili tek kullanımlık karttan verilebilir.'].join('\n');
}

async function buildTasksText(db) {
  const work = await safeAll(db, "SELECT title,status,due_at FROM work_items WHERE status NOT IN ('completed','cancelled','verified','done','closed') ORDER BY CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,due_at LIMIT 10");
  if (!work.available) return '⚠️ Görev kaynağı şu an okunamadı.';
  if (!work.rows.length) return '📋 Açık görev yok. /gorev ile yeni görev bırakabilirsiniz.';
  return ['📋 Açık görevler:', '', ...work.rows.map((row) => `• ${row.title} · ${row.status}${row.due_at ? ` · ${row.due_at}` : ''}`)].join('\n');
}

async function buildMemoryText(db) {
  const checkpoint = await safeFirst(db, 'SELECT summary,next_action,created_at FROM session_checkpoints ORDER BY created_at DESC LIMIT 1');
  if (!checkpoint.available) return '⚠️ Kalıcı hafıza şu an okunamadı.';
  if (!checkpoint.row) return '🧠 Henüz kalıcı oturum özeti yok.';
  return ['🧠 Son kalıcı hafıza özeti:', '', checkpoint.row.summary, '', `Sonraki adım: ${checkpoint.row.next_action || 'belirtilmedi'}`, `Kayıt: ${checkpoint.row.created_at}`].join('\n');
}

async function captureTask(db, identity, messageId, payload) {
  if (!db) return { ok: false, text: '⚠️ Görev kaynağı bağlı değil; kayıt yapılmadı.' };
  try {
    await db.prepare(
      `INSERT INTO quick_notes (source,source_message_id,chat_id,raw_text,parsed_type,needs_review,status)
       VALUES ('telegram',?,?,?,?,1,'captured')
       ON CONFLICT(source,source_message_id) DO NOTHING`
    ).bind(String(messageId), identity.chatId, payload, 'task_request').run();
    return { ok: true, text: `📌 Görev talebi kaydedildi:\n${payload}\n\nAperiON bunu planlama kuyruğunda sınıflandıracak; bu kayıt tek başına dış sistem işlemi başlatmaz.` };
  } catch (_error) {
    return { ok: false, text: '⚠️ Görev kaydedilemedi; hiçbir dış işlem yapılmadı.' };
  }
}

export async function handleMobileCommand({ env, message, identity, sendMessage }) {
  const parsed = parseMobileCommand(message?.text);
  if (!parsed) return { handled: false };
  const meta = MOBILE_COMMANDS[parsed.code];
  const receivedRecorded = await recordCommand(env.APERION_DB, {
    ...identity,
    messageId: message.message_id,
    code: parsed.code,
    risk: meta.risk,
    status: 'received',
    resultSummary: `${meta.title} alındı`
  });
  let reply;
  let status = 'completed';
  if (parsed.code === 'menu' || parsed.code === 'help') reply = menuText(identity.hardened);
  else if (parsed.code === 'morning') reply = await buildMorningBrief(env.APERION_DB);
  else if (parsed.code === 'system') reply = await buildSystemText(env.APERION_DB);
  else if (parsed.code === 'priority_status') reply = await buildPriorityStatusText(env.APERION_DB);
  else if (parsed.code === 'approvals') reply = await buildApprovalsText(env.APERION_DB);
  else if (parsed.code === 'tasks') reply = await buildTasksText(env.APERION_DB);
  else if (parsed.code === 'memory') reply = await buildMemoryText(env.APERION_DB);
  else if (parsed.code === 'command_catalog') reply = commandCatalogText();
  else if (parsed.code === 'command_status') reply = await buildCommandStatusText(env.APERION_DB);
  else if (parsed.code === 'device_status') reply = await buildDeviceStatusText(env.APERION_DB);
  else if (parsed.code === 'task_capture') {
    const saved = await captureTask(env.APERION_DB, identity, message.message_id, parsed.payload);
    reply = saved.text;
    status = saved.ok ? 'captured' : 'failed';
  }
  const sent = await sendMessage(env, identity.chatId, reply);
  const delivered = Boolean(sent && sent.ok);
  status = delivered ? status : 'failed';
  const completedRecorded = await recordCommand(env.APERION_DB, {
    ...identity,
    messageId: message.message_id,
    code: parsed.code,
    risk: meta.risk,
    status,
    resultSummary: delivered ? meta.title : `${meta.title}: Telegram yanıtı başarısız`
  });
  return { handled: true, code: parsed.code, status, receivedRecorded, completedRecorded, delivered };
}

export const __test = { constantTimeEqual, hashHex, updateIdentity, buildDeviceStatusText, buildPrioritySnapshot, buildPriorityStatusText, parseSqliteUtc, CLOSED_STATUSES };
