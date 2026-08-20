const CLOSED_STATUSES = ['completed', 'cancelled', 'verified', 'done', 'closed'];

export const MOBILE_COMMANDS = Object.freeze({
  menu: { risk: 'read', title: 'Ana menü' },
  morning: { risk: 'read', title: 'Günaydın özeti' },
  system: { risk: 'read', title: 'Sistem sağlığı' },
  approvals: { risk: 'read', title: 'Onay kuyruğu' },
  tasks: { risk: 'read', title: 'Görevler' },
  memory: { risk: 'read', title: 'Hafıza özeti' },
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
  if (/^\/onaylar(?:@\w+)?\b/.test(normalized)) return { code: 'approvals' };
  if (/^\/(gorevler|görevler)(?:@\w+)?\b/.test(normalized)) return { code: 'tasks' };
  if (/^\/hafiza(?:@\w+)?\b/.test(normalized) || /^\/hafıza(?:@\w+)?\b/.test(normalized)) return { code: 'memory' };
  if (/^\/(yardim|yardım)(?:@\w+)?\b/.test(normalized)) return { code: 'help' };
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
  if (!env.TELEGRAM_BOT_TOKEN) return false;
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`;
  const body = new URLSearchParams({
    url: env.TELEGRAM_WEBHOOK_URL || 'https://aperion-istasyon.pages.dev/telegram/webhook',
    secret_token: secret
  });
  try {
    const response = await fetch(url, { method: 'POST', body });
    const result = await response.json();
    return Boolean(response.ok && result?.ok);
  } catch (_error) {
    return false;
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
    const secret = randomSecret();
    if (!(await registerTelegramWebhook(env, secret))) return { ok: false, status: 503, reason: 'webhook_bootstrap_failed' };
    storedHash = await hashHex(secret);
    await writeSecurityConfig(env.APERION_DB, 'webhook_secret_sha256', storedHash);
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
  return { identityGuard: Boolean(chat), webhookSecret: Boolean(secretHash), source: 'd1' };
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
  if (!db) return;
  try {
    const key = `telegram:${chatId}:${messageId}`;
    const hash = await commandHash(chatId, messageId, code);
    await db.prepare(
      `INSERT INTO telegram_command_log
       (command_key,chat_id,user_id,message_id,command_code,risk_class,content_hash,status,result_summary,completed_at)
       VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))
       ON CONFLICT(command_key) DO NOTHING`
    ).bind(key, chatId, userId || null, String(messageId), code, risk, hash, status, resultSummary || null).run();
  } catch (_error) {
    // Audit must never make a read-only command unusable; health will expose a missing table.
  }
}

function menuText(hardened) {
  return [
    '🧠 AperiON Mobil Kumanda',
    '',
    '🌅 Günaydın: Günaydın AperiON veya /sabah',
    '🩺 Sistem: /sistem',
    '✅ Onaylar: /onaylar',
    '📋 Görevler: /gorevler',
    '🧠 Hafıza: /hafiza',
    '➕ Görev ekle: /gorev yapılacak iş',
    '📦 Stok: /stok ürün adı',
    '💰 Bakiye: bakiye',
    '📎 Belge/fotoğraf: doğrudan gönder',
    '',
    'Gerçek mali işlemler yalnızca tek kullanımlık açık onaydan sonra yürütülür.',
    hardened ? '🔒 Telegram kimliği ve webhook doğrulaması etkin.' : '⚠️ Güvenlik anahtarları tam yapılandırılmamış; yazma işlemleri kapalı kalır.'
  ].join('\n');
}

async function buildMorningBrief(db) {
  const [approvals, work, commitments, sources] = await Promise.all([
    safeFirst(db, "SELECT COUNT(*) AS count FROM approval_queue WHERE status IN ('needs_review','pending','approval_pending')"),
    safeFirst(db, "SELECT COUNT(*) AS count FROM work_items WHERE status NOT IN ('completed','cancelled','verified','done','closed')"),
    safeFirst(db, "SELECT SUM(CASE WHEN time_bucket='overdue' THEN 1 ELSE 0 END) AS overdue, SUM(CASE WHEN time_bucket='approaching' THEN 1 ELSE 0 END) AS approaching FROM commitment_timeline WHERE time_bucket IN ('overdue','approaching')"),
    safeFirst(db, "SELECT SUM(CASE WHEN status IN ('ok','confirmed') THEN 1 ELSE 0 END) AS healthy, COUNT(*) AS total FROM source_health")
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
  let reply;
  let status = 'completed';
  if (parsed.code === 'menu' || parsed.code === 'help') reply = menuText(identity.hardened);
  else if (parsed.code === 'morning') reply = await buildMorningBrief(env.APERION_DB);
  else if (parsed.code === 'system') reply = await buildSystemText(env.APERION_DB);
  else if (parsed.code === 'approvals') reply = await buildApprovalsText(env.APERION_DB);
  else if (parsed.code === 'tasks') reply = await buildTasksText(env.APERION_DB);
  else if (parsed.code === 'memory') reply = await buildMemoryText(env.APERION_DB);
  else if (parsed.code === 'task_capture') {
    const saved = await captureTask(env.APERION_DB, identity, message.message_id, parsed.payload);
    reply = saved.text;
    status = saved.ok ? 'captured' : 'failed';
  }
  await sendMessage(env, identity.chatId, reply);
  await recordCommand(env.APERION_DB, {
    ...identity,
    messageId: message.message_id,
    code: parsed.code,
    risk: meta.risk,
    status,
    resultSummary: meta.title
  });
  return { handled: true, code: parsed.code, status };
}

export const __test = { constantTimeEqual, hashHex, updateIdentity, CLOSED_STATUSES };
