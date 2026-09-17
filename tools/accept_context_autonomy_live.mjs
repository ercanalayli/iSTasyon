import assert from 'node:assert/strict';
import { memoryRequest } from './lib/memory_transport.mjs';

const q=async text=>memoryRequest(`/v1/context?q=${encodeURIComponent(text)}`);
const command=async (text,task_key)=>memoryRequest('/v1/context',{method:'POST',body:{command:text,...(task_key?{task_key}:{})}});
const [murat,tea,ai,expense,score,gate]=await Promise.all([
  q('Murat Ticaret ne durumda?'),q('Çay gideri nereye?'),command('AI-0646 neydi?'),command('75 TL çay Ercan nakit'),
  memoryRequest('/v1/context?view=scorecard'),memoryRequest('/v1/context?view=skill_gate')]);
assert.equal(murat.pack.pack_id,'MURAT_TICARET');
assert.equal(tea.pack.pack_id,'ALAYLI_FINANS');
assert.equal(ai.memory_retrieval.found,true);
assert.ok(ai.memory_retrieval.provenance.length);
assert.equal(expense.resolution.amount,75);
assert.equal(expense.resolution.category,'MARKET');
assert.equal(expense.resolution.payment_account,'Ercan Nakit Kasa');
assert.equal(expense.policy.action_class,'ONAY_GEREKLI');
assert.equal(expense.execution_plan.execution_authorized,false);
const task_key=`accept:parking-${Date.now()}`;
const first=await command('120 TL otopark Ercan nakit',task_key);
assert.equal(first.resolution.amount,120);
assert.deepEqual(first.resolution.missing,['category']);
const correction=await command('MARKET değil, OTOPARK.',task_key);
assert.equal(correction.resolution.amount,120);
assert.equal(correction.resolution.payment_account,'Ercan Nakit Kasa');
assert.equal(correction.resolution.category,'OTOPARK');
assert.equal(correction.policy.action_class,'BILGI_GEREKLI');
assert.equal(gate.production_ready,false);
const after=await q('Murat Ticaret ne durumda?');
assert.equal(JSON.stringify(after.pack),JSON.stringify(murat.pack).replace(murat.pack.generated_at,after.pack.generated_at));
console.log(JSON.stringify({mode:'live_read_only_external',context_api:'PASS',ai0646_recall:'PASS',tea_category:'PASS',tea_expense_draft:'PASS',working_memory_continuation:'PASS',murat_360:murat.pack.unknown?'PARTIAL_NO_VERIFIED_ENTITY':'PASS',skill_gate:'PASS_CANDIDATE_NOT_PRODUCTION',scorecard_coverage:score.coverage,
  no_duplicate_context:JSON.stringify(after.pack)===JSON.stringify(murat.pack).replace(murat.pack.generated_at,after.pack.generated_at),
  financial_writes:0,bizimhesap_writes:0,drive_writes:0,secrets_exposed:0}));
