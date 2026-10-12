'use strict';
const assert = require('node:assert/strict');
const { superviseSupabaseListener, inspectWindowsListener, startExistingListenerWatchdog } = require('./lib/supabase_listener_supervisor.cjs');

let starts = 0;
let result = superviseSupabaseListener({ platform: 'linux', inspect: () => { throw Error('must not inspect'); }, recover: () => { throw Error('must not restart'); } });
assert.equal(result.status, 'not_windows');

result = superviseSupabaseListener({ platform: 'win32', inspect: () => ({ status: 'running', count: 1 }), recover: () => { starts++; return { ok: true }; } });
assert.equal(result.status, 'running');
assert.equal(starts, 0, 'already running listener must never restart');

result = superviseSupabaseListener({ platform: 'win32', inspect: () => ({ status: 'unknown' }), recover: () => { starts++; return { ok: true }; } });
assert.equal(result.status, 'blocked');
result = superviseSupabaseListener({ platform: 'win32', inspect: () => ({ status: 'multiple', count: 2 }), recover: () => { starts++; return { ok: true }; } });
assert.equal(result.status, 'blocked');
assert.equal(starts, 0, 'ambiguous process state must fail closed');

let checks = 0;
result = superviseSupabaseListener({
  platform: 'win32',
  inspect: () => (++checks === 1 ? { status: 'stopped' } : { status: 'running', count: 1 }),
  recover: () => { starts++; return { ok: true }; }
});
assert.equal(result.status, 'recovered_process');
assert.equal(result.queue_verified, false, 'process health cannot prove queue delivery');
assert.equal(starts, 1);

result = superviseSupabaseListener({
  platform: 'win32', inspect: () => ({ status: 'stopped' }),
  recover: () => ({ ok: false })
});
assert.equal(result.status, 'blocked');

result = inspectWindowsListener(() => ({ status: 0, stdout: JSON.stringify({ count: 0, pids: [] }) }));
assert.equal(result.status, 'stopped');
result = inspectWindowsListener(() => ({ status: 0, stdout: JSON.stringify({ count: 1, pids: [1234] }) }));
assert.equal(result.status, 'running');
result = inspectWindowsListener(() => ({ status: 0, stdout: JSON.stringify({ count: 2, pids: [1234, 5678] }) }));
assert.equal(result.status, 'multiple');
result = inspectWindowsListener(() => ({ status: 1, stdout: '' }));
assert.equal(result.status, 'unknown');

let captured;
const reboot = startExistingListenerWatchdog((_cmd, _args, options) => {
  captured = options;
  return { status: 0 };
});
assert.equal(reboot.ok, true);
assert.equal(captured.env.APERION_CHROME_ATTACH_MODE, 'ATTACH-ONLY',
  'supervisor must not open second login or Chrome profile');

console.log('PASS: existing listener liveness + attach-only recovery + no duplicate launches (zero financial writes)');
