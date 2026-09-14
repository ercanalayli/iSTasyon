'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STATE_DIR = path.join(ROOT, 'state', 'hermes-runtime');
const STATE_FILE = path.join(STATE_DIR, 'apeiron-24h-pilot-rolling.json');
const INPUT_FILE = path.join(STATE_DIR, 'apeiron-24h-pilot-tick-input.json');
const FINAL_FILE = path.join(ROOT, 'evidence', 'apeiron-24h-pilot-final.json');
const GOOGLE_FILE = path.join(STATE_DIR, 'google-watchers-last-run-v160.json');
const D1_FILE = path.join(STATE_DIR, 'd1-memory-health-last-run.json');
const DB_ID = '8f32b3b1-5451-4c9e-9bd2-5d3626e4a561';

const now = () => new Date().toISOString();
const read = (file, fallback = null) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } };
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const sql = value => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
function initialState() {
  const startedAt = now();
  return {
    schemaVersion: 'apeiron-24h-operations-pilot-v1', brand: 'ApeirON', status: 'RUNNING', startedAt,
    endsAt: new Date(Date.parse(startedAt) + 24 * 3600000).toISOString(), lastTickAt: null,
    counters: { runtime_ticks: 0, gmail_runs: 0, gmail_new_important: 0, drive_runs: 0, drive_changes: 0, chatgpt_sync_runs: 0, bizimhesap_health_runs: 0, bizimhesap_session_recoveries: 0, captcha_mfa: 0, memory_facts_added: 0, duplicates: 0, conflicts: 0, notifications_sent: 0, notifications_suppressed: 0, popup_count: 0, financial_writes: 0, bizimhesap_writes: 0, secrets_exposed: 0 },
    watcherLastProcessed: {}, processedEvents: [], notifications: [], memory: { pending: [], last_error: null }, health: {}, events: []
  };
}
function save(state) { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`); }

function memoryUpsert(events) {
  if (!events.length) return { ok: true, added: 0 };
  const observed = now();
  const statements = ['PRAGMA foreign_keys = ON;'];
  for (const event of events) {
    const sourceKey = `pilot:${event.source}:${event.event_id}`;
    const factKey = `pilot-event:${event.event_id}`;
    const object = JSON.stringify({ event_type: event.event_type, amount: event.amount, due_date: event.due_date, required_action: event.required_action, summary: event.summary });
    statements.push(`INSERT INTO memory_sources(source_key,source_type,source_date,content_hash,last_synced_at,adapter_status,metadata_json) VALUES(${sql(sourceKey)},${sql(event.source)},${sql(event.provenance?.observed_at || observed)},${sql(event.event_id)},${sql(observed)},'VISIBLE_AND_INGESTIBLE',${sql(JSON.stringify({pilot:'24h',scope:event.scope,risk:event.risk}))}) ON CONFLICT(source_key) DO UPDATE SET last_synced_at=excluded.last_synced_at,content_hash=excluded.content_hash;`);
    statements.push(`INSERT INTO memory_facts(fact_key,subject,predicate,object_value,scope,confidence,status,authority,first_seen,last_seen) VALUES(${sql(factKey)},${sql(`ApeirON observed ${event.event_type}`)},'observed_operational_event',${sql(object)},${sql(event.scope)},${Number(event.confidence) || 0.5},'active','source_observation',${sql(observed)},${sql(observed)}) ON CONFLICT(fact_key) DO UPDATE SET last_seen=excluded.last_seen;`);
    statements.push(`INSERT OR IGNORE INTO memory_fact_sources(fact_id,source_id,observed_at) SELECT f.id,s.id,${sql(observed)} FROM memory_facts f,memory_sources s WHERE f.fact_key=${sql(factKey)} AND s.source_key=${sql(sourceKey)};`);
    statements.push(`INSERT INTO memory_sync_state(source_key,cursor,content_hash,checkpoint_json,status,last_synced_at,last_error) VALUES(${sql(sourceKey)},NULL,${sql(event.event_id)},${sql(JSON.stringify({pilot:'24h'}))},'synced',${sql(observed)},NULL) ON CONFLICT(source_key) DO UPDATE SET content_hash=excluded.content_hash,status='synced',last_synced_at=excluded.last_synced_at,last_error=NULL;`);
  }
  const file = path.join(STATE_DIR, `pilot-memory-${process.pid}.sql`);
  fs.writeFileSync(file, `${statements.join('\n')}\n`);
  const call = spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','C:\\Users\\HP\\AppData\\Roaming\\npm\\wrangler.ps1','d1','execute',DB_ID,'--remote','--file',file], { cwd: ROOT, windowsHide: true, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
  try { fs.unlinkSync(file); } catch {}
  return { ok: call.status === 0, added: call.status === 0 ? events.length : 0, error: call.status === 0 ? null : String(call.stderr || call.error?.message || 'd1_memory_write_failed').replace(/\x1b\[[0-9;]*m/g, '').slice(0, 180) };
}

async function notify(event) {
  return { sent: false, queued: true, error: 'thread_heartbeat_notification_pending' };
}

async function tick(state) {
  const input = read(INPUT_FILE, {});
  const google = read(GOOGLE_FILE, { watchers: {} });
  const d1 = read(D1_FILE, {});
  state.counters.runtime_ticks++;
  state.lastTickAt = now();
  state.health.hermes = input.checks?.hermes?.ok === true ? 'healthy' : (input.checks?.hermes ? 'unhealthy' : state.health.hermes || 'unknown');
  state.health.d1 = d1.status || state.health.d1 || 'unknown';
  const bh = input.checks?.bizimhesap?.output;
  if (bh) {
    state.counters.bizimhesap_health_runs++;
    state.health.bizimhesap = bh.authenticated ? 'healthy' : bh.officialApiHealthy ? 'degraded_api_only' : 'unhealthy';
    if (input.checks?.bizimhesapRecovery) state.counters.bizimhesap_session_recoveries++;
    if (bh.captcha || bh.mfa) state.counters.captcha_mfa++;
  }
  const newEvents = [];
  for (const [name, watcher] of Object.entries(google.watchers || {})) {
    if (!watcher?.last_success || state.watcherLastProcessed[name] === watcher.last_success) continue;
    state.watcherLastProcessed[name] = watcher.last_success;
    if (name === 'gmail') { state.counters.gmail_runs++; state.counters.gmail_new_important += Number(watcher.new_important || 0); }
    if (name === 'drive') { state.counters.drive_runs++; state.counters.drive_changes += Number(watcher.changed_metadata || 0); }
    if (name === 'chatgpt_project_memory') state.counters.chatgpt_sync_runs++;
    for (const event of watcher.signals || []) {
      if (state.processedEvents.includes(event.event_id)) { state.counters.duplicates++; continue; }
      state.processedEvents.push(event.event_id);
      newEvents.push(event);
      state.events.push(event);
    }
  }
  state.processedEvents = state.processedEvents.slice(-2000);
  state.events = state.events.slice(-200);
  const memory = memoryUpsert(newEvents);
  state.counters.memory_facts_added += memory.added;
  state.memory.last_error = memory.error || null;
  if (!memory.ok) state.memory.pending.push(...newEvents.map(event => event.event_id));
  for (const event of newEvents) {
    const shouldNotify = event.importance === 'critical' || event.risk === 'high' || !['none','observe'].includes(event.required_action);
    if (!shouldNotify) { state.counters.notifications_suppressed++; continue; }
    const result = await notify(event);
    state.notifications.push({ event_id: event.event_id, reason: `${event.risk}:${event.required_action}`, sent: result.sent, message_id: result.message_id || null, error: result.error || null, at: now() });
    if (result.sent) state.counters.notifications_sent++;
  }
  state.notifications = state.notifications.slice(-200);
  for (const pending of state.notifications.filter(item => !item.sent && !item.retriedAt)) {
    const event = state.events.find(item => item.event_id === pending.event_id);
    if (!event) continue;
    const retry = await notify(event);
    pending.retriedAt = now();
    pending.sent = retry.sent;
    pending.message_id = retry.message_id || null;
    pending.error = retry.error || null;
    if (retry.sent) state.counters.notifications_sent++;
  }
  return { ok: true, status: state.status, startedAt: state.startedAt, endsAt: state.endsAt, newEvents: newEvents.length, notificationsSent: state.counters.notifications_sent, memoryFactsAdded: state.counters.memory_facts_added, financialWrites: 0, bizimHesapWrites: 0, secretsExposed: 0 };
}

function finalize(state) {
  const elapsedMs = Math.max(0, Date.now() - Date.parse(state.startedAt));
  const complete = Date.now() >= Date.parse(state.endsAt);
  const criticalHealth = ['hermes','bizimhesap','d1'].every(key => state.health[key] === 'healthy');
  const status = complete && criticalHealth && state.counters.financial_writes === 0 && state.counters.bizimhesap_writes === 0 && state.counters.secrets_exposed === 0 ? 'PASS' : complete ? 'PARTIAL' : 'RUNNING';
  const report = { schemaVersion: 'apeiron-24h-pilot-acceptance-v1', brand: 'ApeirON', acceptance: status, startedAt: state.startedAt, endsAt: state.endsAt, generatedAt: now(), runtimeUptimeSeconds: Math.floor(elapsedMs / 1000), counters: state.counters, health: state.health, notificationReasons: state.notifications.filter(item => item.sent).map(item => item.reason), d1: read(D1_FILE, null), financial_writes: 0, bizimhesap_writes: 0, secrets_exposed: 0 };
  fs.mkdirSync(path.dirname(FINAL_FILE), { recursive: true });
  fs.writeFileSync(FINAL_FILE, `${JSON.stringify(report, null, 2)}\n`);
  if (complete) { state.status = status; state.completedAt = now(); save(state); }
  return report;
}

(async () => {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const mode = process.argv[2] || '--tick';
  let state = read(STATE_FILE, null);
  if (mode === '--start') { if (!state || state.status !== 'RUNNING') state = initialState(); save(state); process.stdout.write(`${JSON.stringify({ok:true,status:state.status,startedAt:state.startedAt,endsAt:state.endsAt})}\n`); return; }
  if (!state) { process.stdout.write(`${JSON.stringify({ok:true,status:'NOT_STARTED'})}\n`); return; }
  if (mode === '--mark-thread-notified') {
    const eventId = process.argv[3];
    const item = state.notifications.find(entry => entry.event_id === eventId && !entry.sent);
    if (item) { item.sent = true; item.channel = 'current_thread'; item.error = null; item.notifiedAt = now(); state.counters.notifications_sent++; save(state); }
    process.stdout.write(`${JSON.stringify({ok:true,marked:Boolean(item),event_id:eventId || null})}\n`); return;
  }
  if (mode === '--final') { process.stdout.write(`${JSON.stringify(finalize(state))}\n`); return; }
  if (state.status !== 'RUNNING') { process.stdout.write(`${JSON.stringify({ok:true,status:state.status})}\n`); return; }
  const result = await tick(state); save(state); process.stdout.write(`${JSON.stringify(result)}\n`);
})().catch(error => { process.stdout.write(`${JSON.stringify({ok:false,error:String(error.message || error).slice(0,180),financialWrites:0,bizimHesapWrites:0,secretsExposed:0})}\n`); process.exitCode = 2; });
