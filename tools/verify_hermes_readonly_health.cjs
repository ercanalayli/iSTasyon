'use strict';

const fs = require('node:fs');
const path = require('node:path');
const dns = require('node:dns').promises;
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..');
const STATE_DIR = path.join(ROOT, 'state');
const ENV_FILE = path.join(ROOT, 'local-secrets', 'bizimhesap.local.env');
const LOCK_FILE = path.join(ROOT, 'local-secrets', 'aperion_listener.lock');
const WATCHDOG_LOG = path.join(ROOT, 'local-secrets', 'aperion_listener_watchdog.log');
const BRIDGE_URL = (process.env.APERION_COMMAND_BRIDGE_URL || 'https://aperion-command-bridge.yenicespor-finans.workers.dev').replace(/\/+$/, '');
const PREFLIGHT_URL = process.env.APERION_PREFLIGHT_URL || 'https://aperion-istasyon.pages.dev/api/telegram-preflight';
const READ_ONLY_COMMANDS = [
  'bizimhesap_cari_bakiye_sync',
  'bizimhesap_tedarikci_ozet_sync',
  'bizimhesap_cari_odeme_gecmisi_sync',
];

function parseEnv(text) {
  const out = {};
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

function writeJson(name, value) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATE_DIR, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function resultSummary(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '');
  const count = text.match(/(?:senkron|guncellen|kayit|musteri|cari)[^0-9]{0,20}(\d+)/i);
  const safePreview = text
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/(token|secret|password|apikey|authorization)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .replace(/\s+/g, ' ')
    .slice(0, 240);
  return {
    present: Boolean(text.trim()),
    length: text.length,
    record_count_hint: count ? Number(count[1]) : null,
    safe_preview: safePreview,
  };
}

function listenerState() {
  let pid = null;
  let processAlive = false;
  try {
    pid = Number(fs.readFileSync(LOCK_FILE, 'utf8').trim()) || null;
    if (pid) {
      process.kill(pid, 0);
      processAlive = true;
    }
  } catch (_) {}

  let watchdogTail = '';
  try {
    const lines = fs.readFileSync(WATCHDOG_LOG, 'utf8').trim().split(/\r?\n/);
    watchdogTail = lines.at(-1) || '';
  } catch (_) {}
  return {
    status: processAlive ? 'ONLINE' : 'BLOCKED',
    process_alive: processAlive,
    pid,
    watchdog_last_line: watchdogTail.slice(0, 300),
  };
}

async function endpointState(url) {
  const started = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const body = await response.json().catch(() => ({}));
    return {
      status: response.ok && body.ok ? 'ONLINE' : 'BLOCKED',
      http_status: response.status,
      latency_ms: Date.now() - started,
      service: body.service || null,
      ready_for_user_test: body.ready_for_user_test === true,
      checks: body.checks || null,
      error: response.ok ? null : (body.user_message || `HTTP ${response.status}`),
    };
  } catch (error) {
    return {
      status: 'BLOCKED',
      http_status: null,
      latency_ms: Date.now() - started,
      error: String(error?.message || error).slice(0, 500),
    };
  }
}

async function telegramState(token) {
  if (!token) return { status: 'BLOCKED', error: 'Telegram token is not present in the process environment.' };
  try {
    const [webhookResponse, meResponse] = await Promise.all([
      fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, { signal: AbortSignal.timeout(20000) }),
      fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(20000) }),
    ]);
    const webhook = await webhookResponse.json();
    const me = await meResponse.json();
    const info = webhook?.result || {};
    const expectedWebhook = `${BRIDGE_URL}/telegram/webhook`;
    const ok = webhookResponse.ok && meResponse.ok && webhook?.ok && me?.ok
      && info.url === expectedWebhook && Number(info.pending_update_count || 0) === 0;
    return {
      status: ok ? 'OK' : 'BLOCKED',
      webhook_matches_expected: info.url === expectedWebhook,
      configured_webhook_url: info.url || null,
      pending_update_count: Number(info.pending_update_count || 0),
      last_error_date: info.last_error_date || null,
      last_error_message: info.last_error_message || null,
      bot_username: me?.result?.username || null,
    };
  } catch (error) {
    return { status: 'BLOCKED', error: String(error?.message || error).slice(0, 500) };
  }
}

async function main() {
  const checkedAt = new Date().toISOString();
  const local = fs.existsSync(ENV_FILE) ? parseEnv(fs.readFileSync(ENV_FILE, 'utf8')) : {};
  const url = process.env.SUPABASE_URL || local.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || local.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase bağlantı ayarları bulunamadı.');

  const db = createClient(url, key);
  const { data, error } = await db
    .from('bot_commands')
    .select('id,command,status,created_at,started_at,completed_at,result')
    .in('command', READ_ONLY_COMMANDS)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);

  const rows = (data || []).map(row => ({
    id: row.id,
    command: row.command,
    status: row.status,
    created_at: row.created_at,
    started_at: row.started_at,
    completed_at: row.completed_at,
    result: resultSummary(row.result),
  }));
  const verified = rows.find(row => row.status === 'completed' && row.result.present) || null;
  const listener = listenerState();
  const bridgeHealth = await endpointState(`${BRIDGE_URL}/health`);
  const pagesPreflight = await endpointState(PREFLIGHT_URL);
  const pagesDns = await dns.lookup(new URL(PREFLIGHT_URL).hostname, { all: true }).catch(error => ({ error: error.message }));
  const telegram = await telegramState(process.env.HERMES_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN);

  writeJson('windows-worker-health.json', {
    checked_at: checkedAt,
    ...listener,
    supervisor: 'AperiON_BizimHesap_Listener_Watchdog',
    financial_writes: 0,
  });
  writeJson('hermes-vps-health.json', {
    checked_at: checkedAt,
    status: bridgeHealth.status,
    endpoint: `${BRIDGE_URL}/health`,
    bridge_health: bridgeHealth,
    telegram,
    pages_preflight: pagesPreflight,
    pages_dns: pagesDns,
    financial_writes: 0,
  });
  writeJson('hermes-readonly-verification.json', {
    checked_at: checkedAt,
    status: verified ? 'VERIFIED' : 'BLOCKED',
    verified_job: verified,
    recent_readonly_jobs: rows,
    dedupe_policy: 'pending/processing commands are reused within three hours',
    financial_writes: 0,
    secrets_exposed: 0,
  });

  console.log(JSON.stringify({
    listener: listener.status,
    bridge: bridgeHealth.status,
    telegram: telegram.status,
    pages_preflight: pagesPreflight.status,
    readonly: verified ? 'VERIFIED' : 'BLOCKED',
    verified_job_id: verified?.id || null,
    recent_jobs: rows.map(({ id, command, status }) => ({ id, command, status })),
  }, null, 2));
  if (!verified) process.exitCode = 2;
}

main().catch(error => {
  console.error(`HATA: ${error.message}`);
  process.exitCode = 1;
});
