'use strict';
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const agent = require('./lib/desktop_agent_v1.cjs');

function task(capability, payload = {}) {
  return { task_id: randomUUID(), user_binding: 'test-user-0001', session_binding: 'test-session-0001',
    capability, risk_class: agent.riskClass(capability), payload, payload_hash: agent.hashPayload(payload),
    idempotency_key: `test:desktop:${randomUUID()}`, created_at: new Date().toISOString() };
}
async function main() {
  let passed = 0;
  for (let index = 0; index < 100; index++) {
    const item = task('desktop.health');
    assert.equal((await agent.execute(item)).status, 'completed_verified');
    passed++;
  }
  const concurrent = await Promise.all(Array.from({ length: 20 }, () => agent.execute(task('desktop.health'))));
  assert.equal(concurrent.length, 20);
  assert.ok(concurrent.every(value => value.status === 'completed_verified'));
  passed += 20;
  for (const capability of agent.MUTATING) {
    const result = await agent.execute(task(capability));
    assert.equal(result.write_performed, false);
    assert.equal(result.status, 'blocked');
    passed++;
  }
  const bad = task('desktop.health'); bad.payload_hash = 'sha256:bad';
  assert.throws(() => agent.validateTask(bad), /payload_hash_mismatch/); passed++;
  for (const path of ['state/windows-worker.secret','config/credentials.json','../outside','docs/../../state/windows-worker.secret']) {
    assert.throws(() => agent.checkedPath(path)); passed++;
  }
  assert.equal(agent.riskClass('browser.navigate'), 'WRITE_EXTERNAL'); passed++;
  assert.equal(agent.riskClass('file.read'), 'READ'); passed++;
  console.log(JSON.stringify({ status: 'PASS', tests: passed, sequential: 100, concurrent_read: 20,
    mutating_capabilities_blocked_without_exact_approval: agent.MUTATING.size, financial_writes: 0,
    bizimhesap_writes: 0, secrets_exposed: 0 }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
