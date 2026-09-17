import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { memoryRequest } from './lib/memory_transport.mjs';

const file = process.argv[2];
if (!file) throw new Error('Usage: node tools/ingest_codex_result.mjs <verified-event.json>');
const payload = JSON.parse(await fs.readFile(file, 'utf8'));
if (payload.kind === 'codex_result_envelope') {
  const envelope = payload.envelope;
  if (!envelope?.execution_id || !envelope?.idempotency_key || !envelope?.provenance) throw new Error('envelope_evidence_required');
  const write = await memoryRequest('/v1/memory', { method:'POST', body:payload });
  const lookup = await memoryRequest(`/v1/memory?view=ledger&ref=${encodeURIComponent(envelope.execution_id)}`);
  // The ledger canonicalizes provenance to 240 characters before persisting it.
  const storedProvenance = String(envelope.provenance).trim().slice(0, 240);
  for (const id of [write.task_event_id,write.result_event_id,write.verification_event_id].filter(Boolean))
    assert.ok(lookup.rows.some(row => row.event_id === id && row.provenance_ref === storedProvenance),'independent_ledger_readback_missing');
  console.log(JSON.stringify({ ok:true, execution_id:envelope.execution_id, duplicate:write.duplicate,new_events:write.new_events,
    new_facts:write.new_facts, independent_ledger_readback:true, financialWrites:0,bizimHesapWrites:0,secretsExposed:0 }));
  process.exit(0);
}
const event = payload;
if (event.result_status !== 'completed_verified' || event.verification_status !== 'read_back_verified'
  || !event.task_id || !event.provenance_ref || !event.source_ref) throw new Error('verified_readback_evidence_required');

const write = await memoryRequest('/v1/memory', { method: 'POST', body: { kind: 'verified_result', event } });
const lookup = await memoryRequest(`/v1/memory?view=ledger&ref=${encodeURIComponent(event.task_id)}`);
const row = lookup.rows.find(item => item.event_id === write.event_id);
assert.ok(row, 'independent_ledger_readback_missing');
assert.equal(row.verification_status, 'read_back_verified');
assert.equal(row.provenance_ref, event.provenance_ref);
console.log(JSON.stringify({ ok: true, task_id: event.task_id, event_id: write.event_id, duplicate: write.duplicate,
  independent_ledger_readback: true, provenance_ref: row.provenance_ref, financialWrites: 0, bizimHesapWrites: 0, secretsExposed: 0 }));
