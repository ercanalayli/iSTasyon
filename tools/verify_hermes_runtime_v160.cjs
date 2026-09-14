'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { SiteSessionAdapter } = require('./lib/site_session_adapter.cjs');
const { routeCommand, prepareSignal, auditEvent } = require('./lib/runtime_governance.cjs');

const root = path.resolve(__dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'config', 'hermes_runtime_policy_v160.json'), 'utf8'));
assert.equal(policy.canonical_workspace, 'C:\\AperiON\\iSTasyon');
assert.equal(policy.watchers.chatgpt_project_memory.read_unchanged_threads, false);
assert.equal(policy.watchers.chatgpt_project_memory.rate_limit_backoff, true);
assert.equal(routeCommand('bizimhesap.customer_count').risk, 'read');
for (const command of ['ödeme kaydet', 'transfer oluştur', 'tahsilat', 'kesin fatura gönder']) {
  const route = routeCommand(command);
  assert.equal(route.risk, 'approval_required');
  assert.equal(route.executionMode, 'prepare_only');
}
const signal = prepareSignal({ source: 'gmail', sourceRef: 'message:masked', importance: 'high', risk: 'financial', requiredAction: 'approve', summary: 'Test signal', hash: 'sha256:test' });
assert.equal(signal.requiredAction, 'approve');
const audit = auditEvent({ commandId: 'test:1', source: 'fixture', decision: 'dry_run', approval: 'pending', executionResult: 'blocked_by_approval', proof: 'fixture:test' });
assert.equal(audit.execution_result, 'blocked_by_approval');
const adapter = new SiteSessionAdapter({ id: 'fixture', profile: 'FIXTURE', healthCheck: async () => ({ ok: true, token: 'must-not-leak' }), recover: async () => ({ ok: false, reason: 'mfa_required', password: 'must-not-leak' }) });

(async () => {
  const health = await adapter.health();
  const recovery = await adapter.recover();
  assert.equal(health.token, '[REDACTED]');
  assert.equal(recovery.password, '[REDACTED]');
  assert.equal(recovery.userActionRequired, true);
  const result = {
    status: 'PASS',
    policyVersion: policy.version,
    commandRouter: 'PASS',
    approvalGate: 'PASS',
    auditChain: 'PASS',
    upperMindPreparation: 'PASS',
    siteSessionAdapter: 'PASS',
    chatgptFingerprintFirst: 'PASS',
    financialWrites: 0,
    bizimHesapWrites: 0,
    secretsExposed: 0
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
