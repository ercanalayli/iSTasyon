'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { SiteSessionAdapter, redact } = require('./lib/site_session_adapter.cjs');

const ROOT = path.resolve(__dirname, '..');
const POLICY = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'hermes_runtime_policy_v160.json'), 'utf8'));
const STATE_DIR = path.join(ROOT, 'state', 'hermes-runtime');
const STATE_FILE = path.join(STATE_DIR, 'runtime-state.json');
const LOCK_FILE = path.join(STATE_DIR, 'runtime.lock');
const EVIDENCE_FILE = path.join(STATE_DIR, 'last-tick.json');
const BRIDGE = 'https://aperion-command-bridge.yenicespor-finans.workers.dev';
const EXTERNAL_ROOT = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge';
const WORKER = path.join(EXTERNAL_ROOT, 'src', 'windows-worker.js');
const ENSURE_RUNTIME = path.join(EXTERNAL_ROOT, 'ensure-aperion-always-on.ps1');
const HERMES_WATCH = 'C:\\Users\\HP\\AppData\\Local\\hermes\\gateway-service\\Watch-AperionHermesGateway.ps1';
const GOOGLE_WATCHERS = path.join(ROOT, 'tools', 'unified_google_watchers.mjs');
const D1_HEALTH = path.join(ROOT, 'tools', 'd1_memory_health_v160.cjs');
const PILOT = path.join(ROOT, 'tools', 'aperion_24h_pilot.cjs');
const PILOT_INPUT = path.join(STATE_DIR, 'apeiron-24h-pilot-tick-input.json');
const FORCE_WATCHERS = process.argv.includes('--force-watchers');

fs.mkdirSync(STATE_DIR, { recursive: true });
let lock;
try { lock = fs.openSync(LOCK_FILE, 'wx'); } catch { process.exit(0); }

function readState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { watchers: {}, failures: {} }; } }
function due(state, key, minutes) { const last = Date.parse(state.watchers[key] || 0); return !last || Date.now() - last >= minutes * 60000; }
function run(file, args = []) {
  const result = spawnSync(process.execPath, [file, ...args], { cwd: path.dirname(file), windowsHide: true, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024 });
  let output = null;
  try { output = JSON.parse(String(result.stdout || '').trim().split(/\r?\n/).filter(Boolean).at(-1)); } catch { output = { ok: result.status === 0 }; }
  return redact({ status: result.status, output, stderr: String(result.stderr || '').slice(0, 300) });
}

function runPowerShell(file) {
  const result = spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file], {
    windowsHide: true, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024
  });
  return redact({ status: result.status, ok: result.status === 0, stderr: String(result.stderr || '').slice(0, 300) });
}

async function main() {
  const state = readState();
  const checks = {};
  checks.runtimeEnsure = runPowerShell(ENSURE_RUNTIME);
  const site = new SiteSessionAdapter({
    id: 'bizimhesap',
    profile: 'APERION_BIZIMHESAP',
    healthCheck: () => run(WORKER, ['--browser-health']),
    recover: () => run(WORKER, ['--browser-recover'])
  });
  try {
    const response = await fetch(`${BRIDGE}/health`, { signal: AbortSignal.timeout(10000) });
    checks.hermes = { ok: response.ok, httpStatus: response.status };
  } catch (error) { checks.hermes = { ok: false, error: String(error.message || error).slice(0, 120) }; }
  if (!checks.hermes.ok) {
    checks.hermesRecovery = runPowerShell(HERMES_WATCH);
    try {
      const retry = await fetch(`${BRIDGE}/health`, { signal: AbortSignal.timeout(10000) });
      checks.hermesAfterRecovery = { ok: retry.ok, httpStatus: retry.status };
    } catch (error) { checks.hermesAfterRecovery = { ok: false, error: String(error.message || error).slice(0, 120) }; }
  }

  if (FORCE_WATCHERS || due(state, 'bizimhesap_session', POLICY.watchers.bizimhesap_session.interval_minutes)) {
    const health = await site.health();
    checks.bizimhesap = health;
    const authenticated = health?.output?.authenticated === true;
    if (!authenticated) checks.bizimhesapRecovery = await site.recover();
    state.watchers.bizimhesap_session = new Date().toISOString();
  }

  for (const [key, definition] of Object.entries(POLICY.watchers)) {
    if (!definition.enabled || key === 'bizimhesap_session' || key === 'runtime_health') continue;
    if (FORCE_WATCHERS || due(state, key, definition.interval_minutes)) {
      if (key === 'gmail_finance_documents') checks[key] = run(GOOGLE_WATCHERS, ['--gmail']);
      else if (key === 'drive_operations') checks[key] = run(GOOGLE_WATCHERS, ['--drive']);
      else if (key === 'chatgpt_project_memory') checks[key] = run(GOOGLE_WATCHERS, ['--chatgpt-state']);
      else if (key === 'd1_memory_health') checks[key] = run(D1_HEALTH);
      else checks[key] = { scheduled: true, mode: definition.mode, safeDispatch: true };
      state.watchers[key] = new Date().toISOString();
    }
  }

  const observedAt = new Date().toISOString();
  fs.writeFileSync(PILOT_INPUT, `${JSON.stringify({ checks, observedAt }, null, 2)}\n`);
  checks.pilot = run(PILOT, ['--tick']);
  const evidence = redact({
    schemaVersion: 'hermes-runtime-v160',
    commandId: `runtime-tick:${new Date().toISOString()}`,
    source: 'AperiON_Watchdog_1Min',
    decision: 'health_check_and_safe_recovery',
    approval: 'not_required_read_only',
    checks,
    financialWrites: 0,
    bizimHesapWrites: 0,
    secretsExposed: 0,
    observedAt
  });
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
  fs.writeFileSync(EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(evidence)}\n`);
}

main().finally(() => { try { fs.closeSync(lock); } catch {} try { fs.unlinkSync(LOCK_FILE); } catch {} });
