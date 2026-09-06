#!/usr/bin/env node
if (process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '');
/* AperiON Telegram Webhook Watchdog
   Purpose: keep Telegram Quick Capture ready without user testing.

   Checks Cloudflare function endpoint and Telegram webhook.
   If webhook URL is empty or wrong, it re-registers the expected webhook.

   ENV:
   HERMES_TELEGRAM_BOT_TOKEN=required
   TELEGRAM_EXPECTED_WEBHOOK_URL=https://aperion-istasyon.pages.dev/telegram/webhook
   TELEGRAM_PREFLIGHT_URL=https://aperion-istasyon.pages.dev/api/telegram-preflight
   TELEGRAM_WEBHOOK_SECRET_TOKEN=optional Telegram secret header token
   TELEGRAM_DROP_PENDING=false|true  default false
*/

const TOKEN = process.env.HERMES_TELEGRAM_BOT_TOKEN || '';
const EXPECTED_WEBHOOK_URL = process.env.TELEGRAM_EXPECTED_WEBHOOK_URL || 'https://aperion-istasyon.pages.dev/telegram/webhook';
const PREFLIGHT_URL = process.env.TELEGRAM_PREFLIGHT_URL || 'https://aperion-istasyon.pages.dev/api/telegram-preflight';
const WEBHOOK_HEALTH_URL = process.env.TELEGRAM_WEBHOOK_HEALTH_URL || EXPECTED_WEBHOOK_URL;
const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN || '';
const DELIVERY_ERROR_MAX_AGE_MS = Math.max(60_000, Number(process.env.TELEGRAM_DELIVERY_ERROR_MAX_AGE_MS || 1_800_000));
const DROP_PENDING = String(process.env.TELEGRAM_DROP_PENDING || 'false').toLowerCase() === 'true';
const ALERT_CHAT_ID = String(
  process.env.TELEGRAM_CHAT_ID ||
  process.env.TELEGRAM_ALLOWED_CHAT_ID ||
  process.env.TELEGRAM_ALLOWED_CHAT_IDS ||
  ''
).split(/[\s,;]+/).map(value => value.trim()).find(Boolean) || '';

function deliveryState(telegram, nowMs = Date.now()){
  const message = String(telegram && telegram.last_error_message || '');
  const lastErrorSec = Number(telegram && telegram.last_error_date || 0);
  const lastErrorMs = lastErrorSec * 1000;
  const ageMs = lastErrorMs > 0 ? nowMs - lastErrorMs : null;
  const pending = Number(telegram && telegram.pending_update_count || 0) > 0;
  const recentOrUndated = Boolean(message) && (ageMs === null || ageMs < 0 || ageMs <= DELIVERY_ERROR_MAX_AGE_MS);
  return {
    active: Boolean(message) && (recentOrUndated || pending),
    stale: Boolean(message) && !recentOrUndated && !pending,
    pending,
    lastErrorSec
  };
}

async function sendDirectAlert(text){
  if(!TOKEN || !ALERT_CHAT_ID) return { sent: false, reason: 'alert_target_missing' };
  const r = await jfetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: ALERT_CHAT_ID, text })
  });
  return { sent: Boolean(r.ok && r.json && r.json.ok), status: r.status };
}

async function jfetch(url, opts = {}){
  const requestOpts = { ...opts };
  if(!requestOpts.signal) requestOpts.signal = AbortSignal.timeout(8000);
  const res = await fetch(url, requestOpts);
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
  if(!SECRET_TOKEN) throw new Error('Missing TELEGRAM_WEBHOOK_SECRET_TOKEN; refusing insecure webhook repair');
  const body = {
    url: EXPECTED_WEBHOOK_URL,
    drop_pending_updates: DROP_PENDING,
    allowed_updates: ['message', 'callback_query']
  };
  body.secret_token = SECRET_TOKEN;

  const r = await jfetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!r.ok || !r.json.ok) throw new Error('setWebhook failed: ' + r.text);
  return r.json;
}

async function pingEndpoint(){
  try {
    const r = await jfetch(PREFLIGHT_URL);
    return {
      ok: r.ok && r.json && r.json.ok === true,
      status: r.status,
      response: r.json,
      error: null
    };
  } catch (error) {
    return { ok: false, status: 0, response: null, error: String(error && error.message || error) };
  }
}

async function pingWebhookEndpoint(){
  try {
    const r = await jfetch(WEBHOOK_HEALTH_URL);
    return {
      ok: r.ok && r.json && r.json.ok === true && r.json.service === 'aperion-telegram-webhook',
      status: r.status,
      response: r.json,
      error: null
    };
  } catch (error) {
    return { ok: false, status: 0, response: null, error: String(error && error.message || error) };
  }
}

async function probeAuthenticatedWebhookPost(){
  if(!SECRET_TOKEN || !ALERT_CHAT_ID){
    return { ok: false, status: 0, reason: 'authenticated_probe_config_missing' };
  }
  try {
    const numericChatId = Number(ALERT_CHAT_ID);
    const chatId = Number.isSafeInteger(numericChatId) ? numericChatId : ALERT_CHAT_ID;
    const probeId = -Math.floor(Date.now() / 1000);
    const r = await jfetch(EXPECTED_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': SECRET_TOKEN
      },
      body: JSON.stringify({
        update_id: probeId,
        message: {
          message_id: Math.abs(probeId),
          date: Math.floor(Date.now() / 1000),
          chat: { id: chatId, type: 'private' },
          from: { id: chatId, is_bot: false }
        }
      })
    });
    return {
      ok: Boolean(r.ok && r.json && r.json.ok === true && r.json.ignored === true),
      status: r.status,
      reason: r.ok ? null : 'authenticated_probe_http_' + r.status
    };
  } catch (error) {
    return { ok: false, status: 0, reason: String(error && error.message || error) };
  }
}

async function waitForPendingUpdates(initialTelegram, attempts = 3){
  let current = initialTelegram;
  for(let attempt = 1; attempt <= attempts; attempt += 1){
    const state = deliveryState(current);
    if(!state.pending) return { telegram: current, attempts: attempt - 1 };
    await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    current = await getWebhookInfo();
  }
  return { telegram: current, attempts };
}

async function retryProbe(probe, attempts = 3){
  let result = null;
  for(let attempt = 1; attempt <= attempts; attempt += 1){
    result = await probe();
    if(result.ok) return { ...result, attempts: attempt };
    if(attempt < attempts) await new Promise(resolve => setTimeout(resolve, attempt * 1000));
  }
  return { ...result, attempts };
}

function evaluateHealth({ preflight, webhookEndpoint, telegram, repair = null, nowMs = Date.now() }){
  const failures = [];
  const warnings = [];
  const checks = preflight && preflight.response && preflight.response.checks || {};
  const delivery = deliveryState(telegram, nowMs);

  if(!webhookEndpoint.ok) failures.push('cloudflare_webhook_endpoint_unreachable');
  if(telegram.url !== EXPECTED_WEBHOOK_URL) failures.push('telegram_webhook_url_mismatch');
  if(delivery.active){
    const repairedRetainedError = Boolean(
      repair && repair.attempted && repair.setOk && repair.authenticatedPostOk &&
      !delivery.pending && delivery.lastErrorSec > 0 &&
      delivery.lastErrorSec <= Number(repair.baselineLastErrorSec || 0)
    );
    if(repairedRetainedError) warnings.push('telegram_delivery_repaired_old_error_retained');
    else failures.push('telegram_delivery_error');
  } else if(delivery.stale){
    warnings.push('stale_telegram_delivery_error');
  }
  if(checks.d1 && checks.d1.ok === false) failures.push('d1_control_plane_unhealthy');

  if(!preflight.ok && failures.length === 0) warnings.push('preflight_probe_inconclusive');
  if(checks.webhook_endpoint && checks.webhook_endpoint.ok === false && webhookEndpoint.ok){
    warnings.push('preflight_internal_self_probe_failed_but_direct_probe_passed');
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    status: failures.length ? 'failed' : (warnings.length ? 'ok_with_probe_warning' : 'ok')
  };
}

async function main(){
  if(!TOKEN) throw new Error('Missing HERMES_TELEGRAM_BOT_TOKEN');

  const endpoint = await retryProbe(pingEndpoint);
  const webhookEndpoint = await retryProbe(pingWebhookEndpoint);
  const before = await getWebhookInfo();
  const beforeUrl = before.url || '';
  const beforeDelivery = deliveryState(before);
  const urlMismatch = beforeUrl !== EXPECTED_WEBHOOK_URL;
  const needsSet = urlMismatch || beforeDelivery.active;

  let setResult = null;
  let authenticatedPostProbe = null;
  let repairStartedSec = 0;
  if(needsSet){
    repairStartedSec = Math.floor(Date.now() / 1000);
    setResult = await setWebhook();
    authenticatedPostProbe = await retryProbe(probeAuthenticatedWebhookPost);
  }

  const afterSet = await getWebhookInfo();
  const recovery = needsSet ? await waitForPendingUpdates(afterSet) : { telegram: afterSet, attempts: 0 };
  const after = recovery.telegram;
  const repair = needsSet ? {
    attempted: true,
    setOk: Boolean(setResult && setResult.ok),
    authenticatedPostOk: Boolean(authenticatedPostProbe && authenticatedPostProbe.ok),
    startedAtSec: repairStartedSec,
    baselineLastErrorSec: beforeDelivery.lastErrorSec
  } : null;
  const health = evaluateHealth({ preflight: endpoint, webhookEndpoint, telegram: after, repair });
  const ok = health.ok;

  const report = {
    checked_at: new Date().toISOString(),
    endpoint,
    webhook_endpoint: webhookEndpoint,
    expected_webhook_url: EXPECTED_WEBHOOK_URL,
    before: {
      url: before.url || '',
      pending_update_count: before.pending_update_count || 0,
      last_error_date: before.last_error_date || null,
      last_error_message: before.last_error_message || null
    },
    action: needsSet ? (urlMismatch ? 'set_webhook_url' : 'repair_delivery_webhook') : 'no_change',
    set_result: setResult,
    authenticated_post_probe: authenticatedPostProbe,
    pending_recovery_poll_attempts: recovery.attempts,
    after: {
      url: after.url || '',
      pending_update_count: after.pending_update_count || 0,
      last_error_date: after.last_error_date || null,
      last_error_message: after.last_error_message || null,
      allowed_updates: after.allowed_updates || null
    },
    health_status: health.status,
    failures: health.failures,
    warnings: health.warnings,
    authoritative_sources: ['telegram_getWebhookInfo', 'direct_cloudflare_webhook_probe', 'preflight_d1_check'],
    ok,
    user_message: ok
      ? (health.warnings.length
          ? 'Telegram ve doğrudan webhook canlı; yalnız birleşik ön kontrol ölçümü uyarı verdi.'
          : 'Telegram hazır. Kullanıcı doğrudan Telegram’a yazabilir.')
      : 'Telegram hazır değil; doğrulanmış kritik sağlık hatası bulundu.'
  };

  if(!ok){
    report.direct_alert = await sendDirectAlert(
      '🚨 AperiON Telegram bağlantısında doğrulanmış hata: ' + health.failures.join(', ') + '. Otomatik tekrar denemeleri başarısız oldu.'
    );
  }

  console.log(JSON.stringify(report, null, 2));
  if(!ok) process.exitCode = 2;
}

if(require.main === module) main().catch(async err => {
  console.error(err);
  try {
    await sendDirectAlert('🚨 AperiON Telegram watchdog çalışamadı: ' + String(err && err.message || err).slice(0, 300));
  } catch (alertError) {
    console.error('Direct alert failed:', alertError.message);
  }
  process.exitCode = 1;
});

module.exports = { deliveryState, evaluateHealth };

