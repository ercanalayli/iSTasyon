#!/usr/bin/env node
if (process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '');
/* AperiON Telegram Health Check
   Checks:
   - Cloudflare Pages Function health endpoint
   - Telegram getWebhookInfo
   - Expected webhook URL match
   Writes JSON status to data/telegram_health_status.json

   ENV:
   TELEGRAM_BOT_TOKEN=required for Telegram API check
   TELEGRAM_EXPECTED_WEBHOOK_URL=https://aperion-istasyon.pages.dev/telegram/webhook
   TELEGRAM_HEALTH_URL=https://aperion-istasyon.pages.dev/telegram/webhook
*/

const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const EXPECTED_WEBHOOK_URL = process.env.TELEGRAM_EXPECTED_WEBHOOK_URL || 'https://aperion-istasyon.pages.dev/telegram/webhook';
const HEALTH_URL = process.env.TELEGRAM_HEALTH_URL || EXPECTED_WEBHOOK_URL;
const DELIVERY_ERROR_MAX_AGE_MS = Math.max(60_000, Number(process.env.TELEGRAM_DELIVERY_ERROR_MAX_AGE_MS || 1_800_000));

function deliveryState(telegram, nowMs = Date.now()){
  const message = String(telegram && telegram.last_error_message || '');
  const lastErrorSec = Number(telegram && telegram.last_error_date || 0);
  const lastErrorMs = lastErrorSec * 1000;
  const ageMs = lastErrorMs > 0 ? Math.max(0, nowMs - lastErrorMs) : null;
  const pending = Number(telegram && telegram.pending_update_count || 0) > 0;
  const active = Boolean(message) && (pending || ageMs === null || ageMs <= DELIVERY_ERROR_MAX_AGE_MS);
  return {
    active,
    stale: Boolean(message) && !active,
    age_seconds: ageMs === null ? null : Math.floor(ageMs / 1000)
  };
}

async function fetchJson(url, opts = {}){
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json, text };
}

async function main(){
  const out = {
    service: 'telegram_quick_capture',
    checked_at: new Date().toISOString(),
    expected_webhook_url: EXPECTED_WEBHOOK_URL,
    health_url: HEALTH_URL,
    cloudflare_function: {
      ok: false,
      status: null,
      error: null
    },
    telegram_webhook: {
      ok: false,
      configured_url: null,
      matches_expected: false,
      has_custom_certificate: null,
      pending_update_count: null,
      last_error_date: null,
      last_error_message: null,
      max_connections: null,
      allowed_updates: null,
      error: null
    },
    overall_status: 'unknown',
    user_message: ''
  };

  try{
    const health = await fetchJson(HEALTH_URL);
    out.cloudflare_function.ok = health.ok && health.json && health.json.ok === true;
    out.cloudflare_function.status = health.status;
    out.cloudflare_function.response = health.json;
    if(!out.cloudflare_function.ok) out.cloudflare_function.error = health.text.slice(0, 500);
  }catch(e){
    out.cloudflare_function.error = e.message;
  }

  if(!TOKEN){
    out.telegram_webhook.error = 'TELEGRAM_BOT_TOKEN missing';
  }else{
    try{
      const info = await fetchJson(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
      if(info.ok && info.json && info.json.ok){
        const r = info.json.result || {};
        out.telegram_webhook.ok = true;
        out.telegram_webhook.configured_url = r.url || '';
        out.telegram_webhook.matches_expected = (r.url || '') === EXPECTED_WEBHOOK_URL;
        out.telegram_webhook.has_custom_certificate = r.has_custom_certificate;
        out.telegram_webhook.pending_update_count = r.pending_update_count;
        out.telegram_webhook.last_error_date = r.last_error_date || null;
        out.telegram_webhook.last_error_message = r.last_error_message || null;
        const delivery = deliveryState(r);
        out.telegram_webhook.active_delivery_error = delivery.active;
        out.telegram_webhook.stale_delivery_event = delivery.stale;
        out.telegram_webhook.last_error_age_seconds = delivery.age_seconds;
        out.telegram_webhook.max_connections = r.max_connections;
        out.telegram_webhook.allowed_updates = r.allowed_updates || null;
      }else{
        out.telegram_webhook.error = info.text.slice(0, 500);
      }
    }catch(e){
      out.telegram_webhook.error = e.message;
    }
  }

  const cloudOk = out.cloudflare_function.ok;
  const telegramOk = out.telegram_webhook.ok && out.telegram_webhook.matches_expected && !out.telegram_webhook.active_delivery_error;

  if(cloudOk && telegramOk){
    out.overall_status = 'ok';
    out.user_message = out.telegram_webhook.stale_delivery_event
      ? 'Telegram bot canlı ve webhook doğru bağlı. Eski Telegram hata kaydı yalnız tarihsel olaydır; aktif arıza değildir.'
      : 'Telegram bot canlı ve webhook AperiON Quick Capture endpointine bağlı.';
  }else if(cloudOk && out.telegram_webhook.ok && !out.telegram_webhook.matches_expected){
    out.overall_status = 'webhook_mismatch';
    out.user_message = 'Telegram bot canlÄ± olabilir ama webhook beklenen AperiON endpointine baÄŸlÄ± deÄŸil.';
  }else if(!cloudOk){
    out.overall_status = 'cloudflare_function_down';
    out.user_message = 'Cloudflare Telegram webhook endpointi Ã§alÄ±ÅŸmÄ±yor veya deploy/env eksik.';
  }else{
    out.overall_status = 'telegram_not_ready';
    out.user_message = 'Telegram webhook hazÄ±r deÄŸil. Token, webhook URL veya son hata kontrol edilmeli.';
  }

  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), 'data', 'telegram_health_status.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));

  if(out.overall_status !== 'ok') process.exitCode = 2;
}

if(require.main === module){
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { deliveryState };

