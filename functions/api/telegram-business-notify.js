// Authenticated, idempotent business-operation notifications for AperiON.
// Route: POST /api/telegram-business-notify

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function clean(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function authorized(request, env) {
  const configured = clean(env.APERION_BRIDGE_SECRET, 500);
  const supplied = clean(request.headers.get('authorization'), 600).replace(/^Bearer\s+/i, '');
  return configured.length >= 32 && supplied === configured;
}

function firstConfiguredChat(env) {
  return clean(
    env.TELEGRAM_CHAT_ID ||
    env.TELEGRAM_ALLOWED_CHAT_ID ||
    env.TELEGRAM_ALLOWED_CHAT_IDS,
    300
  ).split(/[;,\s]+/).find(Boolean) || '';
}

async function ownerChat(env) {
  const configured = firstConfiguredChat(env);
  if (configured) return configured;
  if (!env.APERION_DB) return '';
  try {
    const row = await env.APERION_DB.prepare(
      "SELECT config_value FROM telegram_security_config WHERE config_key='allowed_chat_id'"
    ).first();
    return clean(row?.config_value, 100);
  } catch {
    return '';
  }
}

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '-';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(amount);
}

export function normalizeNotification(body) {
  const kind = clean(body?.kind, 60);
  if (!['murat_invoice_ready', 'murat_email_sent', 'test'].includes(kind)) {
    throw new Error('unsupported_notification_kind');
  }
  const eventKey = clean(body?.event_key, 180);
  if (!/^[A-Za-z0-9._:-]{8,180}$/.test(eventKey)) throw new Error('invalid_event_key');
  return {
    kind,
    eventKey,
    invoiceNo: clean(body?.invoice_no, 120),
    amount: body?.amount == null ? null : Number(body.amount),
    subject: clean(body?.subject, 300),
    to: clean(body?.to, 500),
    cc: clean(body?.cc, 500),
    attachments: Array.isArray(body?.attachments)
      ? body.attachments.map(item => clean(item, 240)).filter(Boolean).slice(0, 10)
      : [],
    gmailMessageId: clean(body?.gmail_message_id, 180),
    note: clean(body?.note, 500)
  };
}

export function formatNotification(item) {
  if (item.kind === 'test') {
    return ['🧪 APERİON TELEGRAM TESTİ', item.note || 'Bildirim kanalı çalışıyor.', `Olay: ${item.eventKey}`].join('\n');
  }
  const sent = item.kind === 'murat_email_sent';
  const lines = [
    sent ? '✅ MURAT TİCARET E-POSTASI GÖNDERİLDİ' : '📄 MURAT TİCARET FATURASI HAZIR',
    `Fatura: ${item.invoiceNo || '-'}`,
    `Tutar: ${formatMoney(item.amount)}`,
    `Başlık: ${item.subject || '-'}`,
    `Alıcı: ${item.to || '-'}`,
    `Bilgi: ${item.cc || '-'}`,
    `Ekler: ${item.attachments.length ? item.attachments.join(', ') : '-'}`
  ];
  if (item.gmailMessageId) lines.push(`Gmail ileti kimliği: ${item.gmailMessageId}`);
  if (item.note) lines.push(`Not: ${item.note}`);
  lines.push('', sent
    ? 'Bu bildirim kayıt sonucudur; aynı olay tekrar gönderilmez.'
    : 'E-posta gönderimi için ayrıca açık onay gerekir.');
  return lines.join('\n');
}

async function ensureSchema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS telegram_business_notifications (
    event_key TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL,
    telegram_message_id TEXT,
    error_code TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    sent_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).run();
}

async function sendTelegram(env, chatId, text) {
  const token = clean(env.HERMES_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN, 500);
  if (!token) return { ok: false, error: 'telegram_token_missing' };
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });
  let payload = {};
  try { payload = await response.json(); } catch {}
  if (!response.ok || !payload.ok) return { ok: false, error: `telegram_send_failed:${response.status}` };
  return { ok: true, messageId: String(payload.result?.message_id || '') };
}

export async function onRequestPost({ request, env }) {
  if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);

  let item;
  try {
    item = normalizeNotification(await request.json());
  } catch (error) {
    return json({ ok: false, error: error.message || 'invalid_payload' }, 400);
  }

  const chatId = await ownerChat(env);
  if (!chatId) return json({ ok: false, error: 'telegram_owner_not_configured' }, 503);

  await ensureSchema(env.APERION_DB);
  const claimed = await env.APERION_DB.prepare(
    `INSERT INTO telegram_business_notifications(event_key,kind,payload_json,status)
     VALUES (?,?,?,'sending') ON CONFLICT(event_key) DO NOTHING RETURNING event_key`
  ).bind(item.eventKey, item.kind, JSON.stringify(item)).first();

  if (!claimed?.event_key) {
    const previous = await env.APERION_DB.prepare(
      'SELECT status,telegram_message_id,error_code FROM telegram_business_notifications WHERE event_key=?'
    ).bind(item.eventKey).first();
    return json({ ok: true, duplicate: true, status: previous?.status || 'unknown',
      telegram_message_id: previous?.telegram_message_id || null });
  }

  const delivery = await sendTelegram(env, chatId, formatNotification(item));
  if (!delivery.ok) {
    await env.APERION_DB.prepare(
      "UPDATE telegram_business_notifications SET status='failed',error_code=?,updated_at=datetime('now') WHERE event_key=?"
    ).bind(delivery.error, item.eventKey).run();
    return json({ ok: false, error: delivery.error, event_key: item.eventKey }, 502);
  }

  await env.APERION_DB.prepare(
    "UPDATE telegram_business_notifications SET status='sent',telegram_message_id=?,sent_at=datetime('now'),updated_at=datetime('now') WHERE event_key=?"
  ).bind(delivery.messageId, item.eventKey).run();
  return json({ ok: true, sent: true, duplicate: false, event_key: item.eventKey,
    telegram_message_id: delivery.messageId });
}
