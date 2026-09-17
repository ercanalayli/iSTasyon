import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { memoryRequest } from './lib/memory_transport.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outbox = path.join(root, '.aperion-memory-outbox');
let input = '';
for await (const chunk of process.stdin) input += chunk;
let hook = {};
try { hook = JSON.parse(input); } catch {}
if (hook.cwd && path.resolve(hook.cwd).toLowerCase() !== root.toLowerCase()) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

let names = [];
try { names = (await fs.readdir(outbox)).filter(name => name.endsWith('.json') && !name.endsWith('.ok.json')).sort(); } catch {}
let processed = 0;
let failed = 0;
for (const name of names.slice(0, 10)) {
  const file = path.join(outbox, name);
  const marker = `${file.slice(0,-5)}.ok.json`;
  let alreadyProcessed = false;
  try { await fs.access(marker); alreadyProcessed = true; } catch {}
  if (alreadyProcessed) continue;
  try {
    const event = JSON.parse(await fs.readFile(file, 'utf8'));
    if (event.result_status !== 'completed_verified' || event.verification_status !== 'read_back_verified'
      || !event.task_id || !event.provenance_ref) throw new Error('readback_proof_required');
    const written = await memoryRequest('/v1/memory', { method: 'POST', body: { kind: 'verified_result', event } });
    const ledger = await memoryRequest(`/v1/memory?view=ledger&ref=${encodeURIComponent(event.task_id)}`);
    if (!ledger.rows.some(row => row.event_id === written.event_id && row.provenance_ref === event.provenance_ref))
      throw new Error('independent_ledger_readback_missing');
    await fs.writeFile(marker, `${JSON.stringify({ event_id: written.event_id, task_id: event.task_id,
      duplicate: written.duplicate, verified_at: new Date().toISOString() })}\n`, 'utf8');
    processed += 1;
  } catch { failed += 1; }
}
console.log(JSON.stringify({ continue: true, ...(failed ? { systemMessage: `ApeirON memory outbox: ${failed} verified event could not be ingested; retry pending.` } : {}) }));
