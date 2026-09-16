import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { appendEvent, ingestVerifiedResult, ingestRuleCandidate, recordFact, upsertEntity, linkEntities, mapDriveDocument } from '../functions/shared/memory-event-ledger.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const native = new DatabaseSync(':memory:');
native.exec(fs.readFileSync(path.join(root,'migrations','0022_project_conversation_memory.sql'),'utf8'));
native.exec(fs.readFileSync(path.join(root,'migrations','0023_memory_event_ledger.sql'),'utf8'));
const db = { prepare(sql) { const statement=native.prepare(sql); let args=[]; return {
  bind(...values) { args=values; return this; }, first() { return statement.get(...args)||null; },
  all() { return {results:statement.all(...args)}; }, run() { return statement.run(...args); }
}; } };
const checks=[];
const check=(name,fn)=>{fn();checks.push(name);};
const occurredAt='2026-09-16T12:00:00.000Z';
const verified={ occurred_at:occurredAt, source_type:'bizimhesap_readback', source_ref:'fixture:AI-0646', actor:'desktop_agent',
  scope:'ALAYLI MEDİKAL',company:'ALAYLI MEDİKAL',task_id:'fixture-task-0646',command_id:'fixture-command-0646',
  summary:'50 TRY MARKET gideri Ercan Nakit Kasa; belge AI-0646',risk_class:'FINANCIAL',result_status:'completed_verified',
  verification_status:'read_back_verified',provenance_ref:'fixture:readback:AI-0646',
  metadata:{document_no:'AI-0646',amount:50,currency:'TRY',category:'MARKET',payment_account:'Ercan Nakit Kasa',paid_status:'ödenmiş',duplicate:false,verification_method:'read_back'} };
const result=await ingestVerifiedResult(db,verified);
check('A document number lookup',()=>assert.equal(native.prepare("SELECT json_extract(metadata_json,'$.document_no') AS number FROM memory_events WHERE json_extract(metadata_json,'$.document_no')='AI-0646'").get().number,'AI-0646'));
check('B first verified Computer Use expense',()=>assert.equal(native.prepare("SELECT event_type FROM memory_events WHERE source_type='bizimhesap_readback' AND verification_status='read_back_verified' ORDER BY occurred_at LIMIT 1").get().event_type,'task_result_verified'));
const rule=await ingestRuleCandidate(db,{ occurred_at:occurredAt,actor:'Ercan',scope:'ALAYLI MEDİKAL',company:'ALAYLI MEDİKAL',
  user_correction_ref:'fixture:user-correction:market',verified_event_id:result.event_id,summary:'çay / çay masrafı / çay gideri → MARKET' });
check('C tea category rule',()=>assert.equal(native.prepare("SELECT object_value FROM memory_facts WHERE predicate='expense_category' AND status='active'").get().object_value,'MARKET'));
const company=await upsertEntity(db,{entity_type:'company',canonical_name:'ALAYLI MEDİKAL',scope:'ALAYLI MEDİKAL',provenance_ref:result.event_id});
const account=await upsertEntity(db,{entity_type:'cash_account',canonical_name:'Ercan Nakit Kasa',scope:'ALAYLI MEDİKAL',provenance_ref:result.event_id});
await linkEntities(db,{subject_entity_id:company,predicate:'has_account',object_entity_id:account,source_event_id:result.event_id,provenance_ref:result.event_id});
check('D ALAYLI cash-account relation',()=>assert.equal(native.prepare("SELECT o.canonical_name AS name FROM memory_entity_relations r JOIN memory_entities o ON o.entity_id=r.object_entity_id WHERE r.predicate='has_account'").get().name,'Ercan Nakit Kasa'));
check('E provenance retained',()=>{assert.equal(native.prepare('SELECT provenance_ref FROM memory_events WHERE event_id=?').get(result.event_id).provenance_ref,'fixture:readback:AI-0646');assert.ok(native.prepare('SELECT COUNT(*) AS n FROM memory_fact_sources').get().n>0);});
const duplicate=await ingestVerifiedResult(db,verified);
check('F duplicate result deduped',()=>{assert.equal(duplicate.duplicate,true);assert.equal(native.prepare('SELECT COUNT(*) AS n FROM memory_events WHERE event_type=?').get('task_result_verified').n,1);});
await recordFact(db,{subject:'ALAYLI MEDİKAL çay gideri',predicate:'expense_category',object_value:'YENİ KATEGORİ',scope:'ALAYLI MEDİKAL',
  source_key:'fixture:user-correction:new',source_type:'user_correction',source_ref:'fixture:new',authority:'user_correction',observed_at:'2027-01-01T00:00:00.000Z'});
check('G later correction supersedes, does not erase',()=>{assert.equal(native.prepare("SELECT status FROM memory_facts WHERE object_value='MARKET'").get().status,'superseded');assert.equal(native.prepare("SELECT status FROM memory_facts WHERE object_value='YENİ KATEGORİ'").get().status,'active');});
await mapDriveDocument(db,{drive_file_id:'fixture-drive-id',version_hash:'sha256:fixture',canonical_name:'AI-0646 doğrulama',document_type:'readback_proof',
  provenance_ref:'fixture:drive',related_entities:[company,account],extracted_fact_keys:[]});
check('Drive vault stores mapping, not file bytes',()=>assert.equal(native.prepare('SELECT COUNT(*) AS n FROM memory_documents').get().n,1));
assert.throws(()=>native.prepare('UPDATE memory_events SET summary=? WHERE event_id=?').run('changed',result.event_id),/append_only_event/);
assert.throws(()=>native.prepare('DELETE FROM memory_events WHERE event_id=?').run(result.event_id),/append_only_event/);
check('Append-only update/delete guards',()=>assert.equal(native.prepare('SELECT COUNT(*) AS n FROM memory_events').get().n,2));
console.log(JSON.stringify({mode:'fixture_only',passed:checks.length,total:checks.length,checks,financial_writes:0,bizimhesap_writes:0,secrets_exposed:0}));
