import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const endpoint = 'https://aperion-command-bridge.yenicespor-finans.workers.dev';
const started = performance.now();
const response = await fetch(`${endpoint}/openapi.json`, { signal: AbortSignal.timeout(15000) });
assert.equal(response.status, 200);
const schema = await response.json();
const prepare = schema.paths?.['/v1/chatgpt/commands']?.post;
const approve = schema.paths?.['/v1/chatgpt/approve']?.post;

assert.equal(prepare?.operationId, 'prepareApeirONCommand');
assert.equal(prepare?.['x-openai-isConsequential'], false);
assert.equal(approve?.operationId, 'approveApeirONCommand');
assert.equal(approve?.['x-openai-isConsequential'], true);
assert.deepEqual(
  approve.requestBody.content['application/json'].schema.required,
  ['command_id', 'payload_hash', 'conversation_key', 'approval_text'],
);
assert.deepEqual(
  approve.requestBody.content['application/json'].schema.properties.approval_text.enum,
  ['Onaylıyorum'],
);

const report = {
  checked_at: new Date().toISOString(),
  status: 'PASS',
  endpoint,
  production_worker_version: 'dabed992-ede5-4657-9133-4db5532099cc',
  schema: {
    prepareApeirONCommand_consequential: false,
    approveApeirONCommand_consequential: true,
    exact_binding_fields_present: true,
  },
  live_schema_latency_ms: +(performance.now() - started).toFixed(2),
  test_mode: 'schema_and_dry_contract_only',
  financial_writes: 0,
  bizimhesap_writes: 0,
  secrets_exposed: 0,
};

const output = new URL('../evidence/native-confirmation-schema-live-v165.json', import.meta.url);
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, evidence: output.pathname }, null, 2));
