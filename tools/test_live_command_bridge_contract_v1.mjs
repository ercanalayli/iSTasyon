import assert from 'node:assert/strict';

const endpoint = 'https://aperion-command-bridge.yenicespor-finans.workers.dev';
const response = await fetch(endpoint + '/openapi.json', { signal: AbortSignal.timeout(15000) });
assert.equal(response.status, 200);
const schema = await response.json();

const prepare = schema.paths?.['/v1/chatgpt/commands']?.post;
const approve = schema.paths?.['/v1/chatgpt/approve']?.post;
assert(prepare);
assert(approve);
assert.equal(prepare.operationId, 'prepareApeirONCommand');
assert.equal(prepare['x-openai-isConsequential'], false);
assert.equal(approve['x-openai-isConsequential'], true);

const required = approve.requestBody?.content?.['application/json']?.schema?.required || [];
for (const field of ['command_id','payload_hash','conversation_key','approval_text']) {
  assert(required.includes(field));
}

const health = await fetch(endpoint + '/health', { signal: AbortSignal.timeout(15000) });
assert.equal(health.status, 200);

console.log(JSON.stringify({
  ok:true,
  status:'PASS',
  endpoint,
  prepare_consequential:false,
  approve_consequential:true,
  exact_binding_fields:['command_id','payload_hash','conversation_key','approval_text'],
  live_health:true,
  financial_writes:0,
  bizimhesap_writes:0
}));
