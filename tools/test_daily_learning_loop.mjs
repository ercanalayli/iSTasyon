import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { ingestCodexEnvelope, ingestDriveChange } from '../functions/shared/memory-event-ledger.js';
import { recallMemory, effectiveFreshness } from '../functions/shared/memory-recall.js';

const native = new DatabaseSync(':memory:');
for (const number of ['0022_project_conversation_memory','0023_memory_event_ledger','0024_memory_quality_recall','0025_daily_learning_loop','0026_memory_freshness_policy'])
  native.exec(fs.readFileSync(new URL(`../migrations/${number}.sql`,import.meta.url),'utf8'));
const db = { prepare(sql) { const statement=native.prepare(sql); let args=[]; return {
  bind(...values) { args=values; return this; }, first() { return statement.get(...args)||null; },
  all() { return { results:statement.all(...args) }; }, run() { return statement.run(...args); },
}; } };
const envelope = { execution_id:'fixture-cu-access-1',task_type:'BizimHesap.ErisimDogrula',occurred_at:'2026-09-17T08:00:00Z',
  scope:'ALAYLI MEDİKAL',company:'ALAYLI MEDİKAL',source:'codex_computer_use',user_intent_summary:'ALAYLI MEDİKAL hesabını salt okunur doğrula',
  action_summary:'BizimHesap hesabı ekrandan ve hesap adından doğrulandı',result_status:'completed_verified',verification_status:'read_back_verified',
  entities:['ALAYLI MEDİKAL','BizimHesap'],artifacts:[],document_refs:[],external_record_refs:[],learned_rule_candidates:[],
  provenance:'fixture:computer-use:screenshot',idempotency_key:'fixture-cu-access-1:v1' };
const first = await ingestCodexEnvelope(db,envelope);
assert.equal(first.new_events,3);
assert.equal(first.new_facts,0);
assert.equal(native.prepare("SELECT COUNT(*) AS n FROM memory_event_entity_links").get().n,6);
const second = await ingestCodexEnvelope(db,envelope);
assert.equal(second.duplicate,true);
assert.equal(second.new_events,0);
assert.equal(native.prepare("SELECT COUNT(*) AS n FROM memory_events").get().n,3);
const failed = await ingestCodexEnvelope(db,{...envelope,execution_id:'fixture-cu-failed',idempotency_key:'fixture-cu-failed:v1',result_status:'failed',verification_status:'failed',action_summary:'Giriş mümkün olmadı'});
assert.equal(failed.new_events,2);
assert.equal(failed.new_facts,0);
const drive = {drive_file_id:'fixture-doc',canonical_name:'ApeirON operational note',document_type:'application/vnd.google-apps.document',
  modified_at:'2026-09-17T08:00:00Z',version_hash:'c'.repeat(64),content_hash:'c'.repeat(64),
  candidates:[{subject:'ALAYLI MEDİKAL',predicate:'teslim tarihi',object_value:'18 Eylül 2026',confidence:0.55,
    source_authority:'unreviewed_document',extraction_method:'key_value_line',supporting_location:'line:2'}]};
const document = await ingestDriveChange(db,drive);
assert.equal(document.inserted_candidates,1);
assert.equal(document.inserted_facts,0);
assert.equal(native.prepare("SELECT status FROM memory_document_candidates").get().status,'needs_review');
assert.equal((await ingestDriveChange(db,drive)).duplicate,true);
assert.equal(native.prepare("SELECT COUNT(*) AS n FROM memory_document_candidates").get().n,1);
assert.equal(effectiveFreshness({freshness:'current',freshness_policy:'price_30d',last_verified_at:'2025-01-01T00:00:00Z'}),'stale');
assert.equal(effectiveFreshness({freshness:'current',freshness_policy:'until_superseded',last_verified_at:'2025-01-01T00:00:00Z'}),'current');
assert.equal(effectiveFreshness({freshness:'current',freshness_policy:'contract_365d',valid_until:'2025-12-31T00:00:00Z'}),'stale');
const recall = await recallMemory(db,'Son doğrulanmış ALAYLI Computer Use kontrolü neydi?');
assert.equal(recall.found,true);
assert.ok(recall.provenance.length);
console.log(JSON.stringify({ok:true,fixture_only:true,execution_events:3,dedupe_new_events:0,failed_success_facts:0,
  document_candidates:1,durable_facts_from_unreviewed_document:0,freshness_policy:true,recall:recall.found,financial_writes:0,bizimhesap_writes:0,drive_writes:0}));
