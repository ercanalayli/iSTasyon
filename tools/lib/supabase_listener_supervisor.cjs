'use strict';

// Reuses the existing Windows listener watchdog. Does not create a new bot,
// approval channel, queue, browser profile or background service.
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');
const WATCHDOG = path.join(ROOT, 'tools', 'aperion_listener_watchdog.ps1');
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

function inspectWindowsListener(spawn = spawnSync) {
  // Process-level liveness, not proof that commands are being processed.
  const script = [
    '$ErrorActionPreference = \'Stop\'',
    "$p = @(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*aperion_command_listener.cjs*' })",
    '@{ count = $p.Count; pids = @($p | Select-Object -ExpandProperty ProcessId) } | ConvertTo-Json -Compress'
  ].join('; ');
  const result = spawn(POWERSHELL, ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8', windowsHide: true, timeout: 12000, maxBuffer: 65536
  });
  if (result.error || result.status !== 0) return { status: 'unknown', reason: 'process_inspection_failed' };
  try {
    const parsed = JSON.parse(String(result.stdout || '').trim());
    const count = Number(parsed.count);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('invalid_count');
    return { status: count === 0 ? 'stopped' : count === 1 ? 'running' : 'multiple', count };
  } catch {
    return { status: 'unknown', reason: 'process_inspection_unparseable' };
  }
}

function startExistingListenerWatchdog(spawn = spawnSync) {
  // Fail-closed: only attach to a previously signed-in Chrome broker; never
  // start a second login/browser or retry captcha through this supervisor.
  const result = spawn(POWERSHELL,
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', WATCHDOG],
    {
      encoding: 'utf8', windowsHide: true, timeout: 20000, maxBuffer: 65536,
      env: { ...process.env, APERION_CHROME_ATTACH_MODE: 'ATTACH-ONLY' }
    });
  return { ok: !result.error && result.status === 0 };
}

function superviseSupabaseListener({
  platform = process.platform,
  inspect = inspectWindowsListener,
  recover = startExistingListenerWatchdog
} = {}) {
  if (platform !== 'win32') return { status: 'not_windows', financial_writes: 0 };
  const before = inspect();
  if (before.status === 'running') return { status: 'running', count: before.count, financial_writes: 0 };
  if (before.status !== 'stopped') return { status: 'blocked', reason: before.reason || 'non_singleton_or_unknown', financial_writes: 0 };
  const restarted = recover();
  if (!restarted.ok) return { status: 'blocked', reason: 'existing_watchdog_failed', financial_writes: 0 };
  const after = inspect();
  if (after.status !== 'running') {
    return { status: 'blocked', reason: 'listener_not_verified_after_recovery', financial_writes: 0 };
  }
  // A running process is necessary but not sufficient: Supabase queue
  // progression must be verified separately by observing the command ID.
  return { status: 'recovered_process', count: after.count, queue_verified: false, financial_writes: 0 };
}

module.exports = { superviseSupabaseListener, inspectWindowsListener, startExistingListenerWatchdog };
