#!/usr/bin/env node
/* AperiON Telegram Webhook Watchdog
   Purpose: keep Telegram Quick Capture ready without user testing.

   Checks Cloudflare function endpoint and Telegram webhook.
   If webhook URL is empty or wrong, it re-registers the expected webhook.

   ENV:
   TELEGRAM_BOT_TOKEN=required
   TELEGRAM_EXPECTED_WEBHOOK_URL=https://aperion-istasyon.pages.dev/telegram/webhook
   TELEGRAM_WEBHOOK_SECRET_TOKEN=optional Telegram secret header token
   TELEGRAM_DROP_PENDING=false|true  default false
*/

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const EXPECTED_WEBHOOK_URL = process.env.TELEGRAM_EXPECTED_WEBHOOK_URL || 'https://aperion-istasyon.pages.dev/telegram/webhook';
const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN || '';
const DROP_PENDING = String(process.env.TELEGRAM_DROP_PENDING || 'false').toLowerCase() === 'true';

async function jfetch(url, opts = {}){
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json, text };
}

async function getWebhookInfo(){
  const r = await jfetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
  if(!r.ok || !r.json.ok) throw new Error('getWebhookInfo failed: ' + r.text);
  return r.json.result || {};
}

async function setWebhook(){
  const body = {
    url: EXPECTED_WEBHOOK_URL,
    drop_pending_updates: DROP_PENDING,
    allowed_updates: ['message', 'callback_query']
  };
  if(SECRET_TOKEN) body.secret_token = SECRET_TOKEN;

  const r = await jfetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!r.ok || !r.json.ok) throw new Error('setWebhook failed: ' + r.text);
  return r.json;
}

async function pingEndpoint(){
  const r = await jfetch(EXPECTED_WEBHOOK_URL);
  return {
    ok: r.ok && r.json && r.json.ok === true,
    status: r.status,
    response: r.json
  };
}

async function main(){
  if(!TOKEN) throw new Error('Missing TELEGRAM_BOT_TOKEN');

  const endpoint = await pingEndpoint();
  const before = await getWebhookInfo();
  const beforeUrl = before.url || '';
  const needsSet = beforeUrl !== EXPECTED_WEBHOOK_URL;

  let setResult = null;
  if(needsSet){
    setResult = await setWebhook();
  }

  const after = await getWebhookInfo();
  const ok = endpoint.ok && after.url === EXPECTED_WEBHOOK_URL && !after.last_error_message;

  const report = {
    checked_at: new Date().toISOString(),
    endpoint,
    expected_webhook_url: EXPECTED_WEBHOOK_URL,
    before: {
      url: before.url || '',
      pending_update_count: before.pending_update_count || 0,
      last_error_message: before.last_error_message || null
    },
    action: needsSet ? 'set_webhook' : 'no_change',
    set_result: setResult,
    after: {
      url: after.url || '',
      pending_update_count: after.pending_update_count || 0,
      last_error_message: after.last_error_message || null,
      allowed_updates: after.allowed_updates || null
    },
    ok,
    user_message: ok
      ? 'Telegram Quick Capture hazır. Kullanıcı direkt Telegram’a yazabilir.'
      : 'Telegram Quick Capture hazır değil; endpoint, webhook veya Telegram son hatası kontrol edilmeli.'
  };

  console.log(JSON.stringify(report, null, 2));
  if(!ok) process.exitCode = 2;
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
