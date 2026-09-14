'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DB_ID = '8f32b3b1-5451-4c9e-9bd2-5d3626e4a561';
const SQL = "SELECT (SELECT COUNT(*) FROM memory_sources) AS sources, (SELECT COUNT(*) FROM memory_facts) AS facts, (SELECT COUNT(*) FROM memory_decisions) AS decisions, (SELECT COUNT(*) FROM memory_fact_sources) AS provenance, (SELECT COUNT(*) FROM memory_conflicts WHERE status IN ('open','needs_review')) AS open_conflicts, (SELECT COUNT(*) FROM memory_sync_state) AS sync_states, (SELECT COUNT(*) FROM memory_sync_state WHERE status='synced') AS sync_healthy, (SELECT COUNT(*) FROM memory_sync_state WHERE last_error IS NOT NULL AND TRIM(last_error)<>'') AS sync_errors, (SELECT MAX(last_synced_at) FROM memory_sync_state) AS last_sync;";
const started = Date.now();
const command = process.platform === 'win32' ? 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' : 'npx';
const args = process.platform === 'win32'
  ? ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', 'C:\\Users\\HP\\AppData\\Roaming\\npm\\wrangler.ps1', 'd1', 'execute', DB_ID, '--remote', '--command', SQL]
  : ['wrangler', 'd1', 'execute', DB_ID, '--remote', '--command', SQL];
const call = spawnSync(command, args, {
  cwd: ROOT, windowsHide: true, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024
});
const clean = String(call.stdout || '').replace(/\x1b\[[0-9;]*m/g, '');
let totals = null;
const start = clean.indexOf('[\n');
if (start >= 0) {
  try { totals = JSON.parse(clean.slice(start))[0]?.results?.[0] || null; } catch {}
}
const evidence = {
  schemaVersion: 'd1-memory-health-v160',
  databaseName: 'aperion-control-plane', databaseId: DB_ID,
  mode: 'remote_read_only', status: call.status === 0 && totals ? 'healthy' : 'unhealthy',
  last_success: call.status === 0 && totals ? new Date().toISOString() : null,
  last_error: call.status === 0 ? null : String(call.stderr || call.error?.message || 'wrangler_failed').replace(/\x1b\[[0-9;]*m/g, '').slice(0, 240),
  duration_ms: Date.now() - started, next_due: new Date(Date.now() + 60 * 60000).toISOString(),
  source_health: call.status === 0 && totals ? 'live_d1_readonly' : 'blocked_retry_backoff', totals,
  rows_written: 0, financialWrites: 0, bizimHesapWrites: 0, secretsExposed: 0
};
const out = path.join(ROOT, 'state', 'hermes-runtime', 'd1-memory-health-last-run.json');
try { fs.writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`); } catch {}
process.stdout.write(`${JSON.stringify(evidence)}\n`);
if (evidence.status !== 'healthy') process.exitCode = 2;
