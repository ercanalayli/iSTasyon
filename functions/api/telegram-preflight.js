// AperiON Telegram Quick Capture Preflight
// Cloudflare Pages Function route: GET /api/telegram-preflight
// Purpose: system checks readiness before asking user to test Telegram bot.

const EXPECTED_WEBHOOK_URL = 'https://aperion-istasyon.pages.dev/telegram/webhook';

function json(data, status = 200){
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

async function fetchJson(url, opts = {}){
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { ok: res.ok, status: res.status, body, text };
}

async function checkTelegram(env){
  if(!env.TELEGRAM_BOT_TOKEN){
    return {
      ok: false,
      status: 'missing_token',
      message: 'TELEGRAM_BOT_TOKEN Cloudflare env içinde yok.'
    };
  }

  const r = await fetchJson(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
  if(!r.ok || !r.body.ok){
    return {
      ok: false,
      status: 'telegram_api_error',
      message: 'Telegram getWebhookInfo başarısız.',
      http_status: r.status
    };
  }

  const info = r.body.result || {};
  const configuredUrl = info.url || '';
  const lastError = info.last_error_message || null;

  return {
    ok: configuredUrl === EXPECTED_WEBHOOK_URL && !lastError,
    status: configuredUrl === EXPECTED_WEBHOOK_URL && !lastError ? 'ok' : 'not_ready',
    expected_webhook_url: EXPECTED_WEBHOOK_URL,
    configured_webhook_url: configuredUrl || null,
    webhook_matches_expected: configuredUrl === EXPECTED_WEBHOOK_URL,
    pending_update_count: info.pending_update_count || 0,
    last_error_message: lastError,
    allowed_updates: info.allowed_updates || null,
    message: configuredUrl === EXPECTED_WEBHOOK_URL && !lastError
      ? 'Telegram webhook doğru bağlı.'
      : 'Telegram webhook doğru bağlı değil veya son hata var.'
  };
}

async function checkSupabase(env){
  if(!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY){
    return {
      ok: false,
      status: 'missing_supabase_env',
      message: 'SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY Cloudflare env içinde yok.'
    };
  }

  const url = `${env.SUPABASE_URL}/rest/v1/quick_notes?select=id&limit=1`;
  const r = await fetchJson(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if(!r.ok){
    return {
      ok: false,
      status: 'supabase_query_failed',
      message: 'Supabase quick_notes tablosu okunamadı. SQL çalışmamış veya yetki eksik olabilir.',
      http_status: r.status
    };
  }

  return {
    ok: true,
    status: 'ok',
    message: 'Supabase quick_notes erişilebilir.'
  };
}

async function checkWebhookEndpoint(){
  const r = await fetchJson(EXPECTED_WEBHOOK_URL);
  return {
    ok: r.ok && r.body && r.body.ok === true,
    status: r.ok ? r.status : r.status,
    message: r.ok && r.body && r.body.ok === true
      ? 'Cloudflare Telegram webhook endpoint çalışıyor.'
      : 'Cloudflare Telegram webhook endpoint beklenen sağlıklı cevabı vermedi.'
  };
}

export async function onRequestGet({ env }){
  const checkedAt = new Date().toISOString();
  const webhook_endpoint = await checkWebhookEndpoint().catch(e => ({ ok:false, status:'error', message:e.message }));
  const telegram = await checkTelegram(env).catch(e => ({ ok:false, status:'error', message:e.message }));
  const supabase = await checkSupabase(env).catch(e => ({ ok:false, status:'error', message:e.message }));

  const ok = webhook_endpoint.ok && telegram.ok && supabase.ok;
  return json({
    service: 'aperion_telegram_quick_capture_preflight',
    checked_at: checkedAt,
    ok,
    ready_for_user_test: ok,
    user_message: ok
      ? 'Hazır. Kullanıcı Telegram botuna hızlı not yazabilir.'
      : 'Hazır değil. Kullanıcıya test yaptırma; aşağıdaki eksikler kapatılmalı.',
    checks: {
      webhook_endpoint,
      telegram,
      supabase
    }
  }, ok ? 200 : 503);
}
