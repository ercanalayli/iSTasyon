import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { memoryRequest } from './lib/memory_transport.mjs';

const file = process.argv[2];
if (!file) throw new Error('Usage: node tools/ingest_codex_result.mjs <verified-event.json>');
const event = JSON.parse(await fs.readFile(file, 'utf8'));
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
