'use strict';

const fs = require('node:fs');

const DEFAULT_ENDPOINT = 'https://aperion-istasyon.pages.dev/api/telegram-business-notify';
const ALLOWED_KINDS = new Set(['murat_invoice_ready', 'murat_email_sent', 'test']);

function normalize(input) {
  const body = input && typeof input === 'object' ? input : {};
  if (!ALLOWED_KINDS.has(String(body.kind || ''))) throw new Error('unsupported_notification_kind');
  if (!/^[A-Za-z0-9._:-]{8,180}$/.test(String(body.event_key || ''))) throw new Error('invalid_event_key');
  return body;
}

async function sendBusinessNotification(input, options = {}) {
  const secret = String(options.secret || process.env.APERION_BRIDGE_SECRET || '');
  if (secret.length < 32) throw new Error('APERION_BRIDGE_SECRET gerekli.');
  const endpoint = String(options.endpoint || process.env.APERION_TELEGRAM_NOTIFY_URL || DEFAULT_ENDPOINT);
  const body = normalize(input);
  const response = await (options.fetch || fetch)(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let result = {};
  try { result = text ? JSON.parse(text) : {}; } catch {}
  if (!response.ok || !result.ok) throw new Error(`telegram_business_notify_failed:${response.status}:${result.error || 'unknown'}`);
  return result;
}

async function main() {
  const inputPath = process.argv[2];
  const raw = inputPath ? fs.readFileSync(inputPath, 'utf8') : fs.readFileSync(0, 'utf8');
  const result = await sendBusinessNotification(JSON.parse(raw));
  console.log(JSON.stringify({
    ok: true,
    sent: Boolean(result.sent),
    duplicate: Boolean(result.duplicate),
    event_key: result.event_key || null,
    telegram_message_id: result.telegram_message_id || null
  }));
}

module.exports = { DEFAULT_ENDPOINT, normalize, sendBusinessNotification };

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
