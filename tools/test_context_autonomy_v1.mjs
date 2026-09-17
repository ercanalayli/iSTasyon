import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { buildContextPack, entity360, choosePack, classifyIntent, actionPolicy, planExecution, resolveConflict, readWorkingContext, saveWorkingContext, routeCommand, skillProductionGate } from '../functions/shared/context-autonomy.js';
import { SKILL_REGISTRY_V1 } from '../functions/shared/skill-registry.js';
import { onRequestPost as linkFollowupReply } from '../functions/api/apeiron-followup.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const native=new DatabaseSync(':memory:');
for (const file of ['0022_project_conversation_memory.sql','0023_memory_event_ledger.sql','0024_memory_quality_recall.sql','0026_memory_freshness_policy.sql','0027_context_autonomy_v1.sql']) native.exec(fs.readFileSync(path.join(root,'migrations',file),'utf8'));
native.exec("CREATE TABLE work_items(work_key TEXT,title TEXT,status TEXT,due_at TEXT,approval_required INTEGER)");
const db={prepare(sql){const stmt=native.prepare(sql);let args=[];return {bind(...values){args=values;return this;},all(){return {results:stmt.all(...args)};},first(){return stmt.get(...args)||null;},run(){return stmt.run(...args);}}}};
const now=new Date('2026-09-17T09:00:00Z');
const checks=[];
const check=async(name,fn)=>{await fn();checks.push(name);};

native.exec(`INSERT INTO memory_sources(source_key,source_type,content_hash) VALUES
 ('user-correction:tea','user_correction','a'),('drive:murat-price-v1','google_drive','b'),('drive:murat-price-v2','google_drive','c');
 INSERT INTO memory_facts(fact_key,subject,predicate,object_value,scope,confidence,authority,valid_from,status)
 VALUES('tea-market','ALAYLI çay gideri','expense_category','MARKET','ALAYLI MEDİKAL',1,'user_correction','2026-09-16','active'),
 ('murat-price-old','Murat Ticaret','unit_price','100 TRY','MURAT TİCARET',.9,'document','2026-08-01','superseded'),
 ('murat-price-new','Murat Ticaret','unit_price','110 TRY','MURAT TİCARET',1,'user_correction','2026-09-17','active');
 INSERT INTO memory_fact_sources(fact_id,source_id) SELECT f.id,s.id FROM memory_facts f,memory_sources s WHERE (f.fact_key='tea-market' AND s.source_key='user-correction:tea') OR (f.fact_key='murat-price-old' AND s.source_key='drive:murat-price-v1') OR (f.fact_key='murat-price-new' AND s.source_key='drive:murat-price-v2');
 INSERT INTO memory_entities(entity_id,entity_type,canonical_name,scope,provenance_ref) VALUES
 ('entity:murat','company','Murat Ticaret','MURAT TİCARET','drive:murat-price-v2'),
 ('entity:cash','cash_account','Ercan Nakit Kasa','ALAYLI MEDİKAL','bizimhesap:AI-0646');
 INSERT INTO memory_events(event_id,event_type,occurred_at,source_type,source_ref,actor,scope,company,summary,risk_class,result_status,verification_status,provenance_ref,metadata_json)
 VALUES('evt:ai0646','expense_recorded_verified','2026-09-16T09:00:00Z','bizimhesap_readback','bizimhesap:expense:AI-0646','agent','ALAYLI MEDİKAL','ALAYLI MEDİKAL','AI-0646 50 TRY MARKET Ercan Nakit Kasa paid','FINANCIAL','completed_verified','read_back_verified','bizimhesap:expense:AI-0646','{"document_no":"AI-0646","amount":50,"currency":"TRY","category":"MARKET","payment_account":"Ercan Nakit Kasa","paid_status":"Ödenmiş","duplicate":false}'),
 ('evt:murat-email','reply_received','2026-09-17T08:00:00Z','gmail','gmail:murat:thread-1','watcher','MURAT TİCARET','MURAT TİCARET','Murat Ticaret yanıtı doğrulandı','READ','observed','source_content_verified','gmail:murat:thread-1','{}');
 INSERT INTO memory_documents(document_id,drive_file_id,canonical_name,version_hash,document_type,document_date,summary,provenance_ref,superseded_by)
 VALUES('doc:murat:v2','drive-murat-id','Murat Ticaret fiyat listesi','sha256:v2','price_list','2026-09-17','Güncel fiyat listesi','drive:murat-price-v2',NULL);
 INSERT INTO aperion_followups(followup_key,entity_ref,thread_ref,lifecycle_type,stage,title,next_action,provenance_ref)
 VALUES('followup:murat','entity:murat','gmail:murat:thread-1','mail_reply','WAITING_EXTERNAL','Murat Ticaret yanıtı bekleniyor','Yanıt gelince Today listesine al','gmail:murat:sent');`);

await check('A Murat 360 scoped',async()=>{const p=await buildContextPack(db,'MURAT_TICARET','Murat Ticaret ne durumda?',{now});assert.equal(p.pack_id,'MURAT_TICARET');assert.equal(p.entities.length,1);assert.ok(p.relevant_documents.length===1);assert.ok(p.open_items.length===1);assert.ok(p.recent_verified_events.length===1);assert.ok(!JSON.stringify(p).includes('100 TRY'));assert.ok(p.source_refs.length>=2);const view=entity360(p);assert.equal(view.entity.name,'Murat Ticaret');assert.ok(view.price_rules.length===1);assert.ok(view.last_communications.length===1);});
await check('B tea category',async()=>{const p=await buildContextPack(db,'ALAYLI_FINANS','Çay gideri nereye?',{now});assert.ok(p.active_rules.some(x=>x.statement.includes('MARKET')));});
await check('C AI-0646 recall',async()=>{const r=await routeCommand(db,'AI-0646 neydi?',{now});assert.equal(r.memory_retrieval.found,true);assert.match(r.memory_retrieval.answer,/50/);assert.ok(r.memory_retrieval.provenance.length);});
await check('D tea expense draft',async()=>{const r=await routeCommand(db,'75 TL çay Ercan nakit',{now});assert.equal(r.resolution.amount,75);assert.equal(r.resolution.category,'MARKET');assert.equal(r.policy.action_class,'ONAY_GEREKLI');assert.equal(r.execution_plan.execution_authorized,false);});
await check('E missing field continuation',async()=>{const first=await routeCommand(db,'120 TL otopark Ercan nakit',{now,taskKey:'task:parking-1'});assert.deepEqual(first.resolution.missing,['category']);await saveWorkingContext(db,'task:parking-1','ALAYLI MEDİKAL',{amount:first.resolution.amount,payment_account:first.resolution.payment_account,company:'ALAYLI MEDİKAL',operation:'expense'},'expense',{now});const next=await routeCommand(db,'MARKET değil, OTOPARK.',{now,taskKey:'task:parking-1'});assert.equal(next.resolution.amount,120);assert.equal(next.resolution.payment_account,'Ercan Nakit Kasa');assert.equal(next.resolution.category,'OTOPARK');assert.equal(next.policy.action_class,'BILGI_GEREKLI');assert.equal(await readWorkingContext(db,'task:parking-1',new Date(now.getTime()+46*60000)),null);});
await check('F price conflict',async()=>{const r=resolveConflict([{value:'100 TRY',source_authority:'original_document',source_ref:'drive:v1',valid_from:'2026-08-01'},{value:'110 TRY',source_authority:'user_correction',source_ref:'user:correction',valid_from:'2026-09-17'}],now);assert.equal(r.value,'110 TRY');assert.equal(resolveConflict([{value:1,source_authority:'original_document',source_ref:'a',valid_from:'2026-09-17'},{value:2,source_authority:'original_document',source_ref:'b',valid_from:'2026-09-17'}],now).status,'BILGI_GEREKLI');});
await check('G Drive document plus correction',async()=>{const p=await buildContextPack(db,'MURAT_TICARET','Murat Ticaret fiyatı',{now});assert.equal(p.relevant_documents[0].version_hash,'sha256:v2');assert.ok(p.active_rules.some(x=>x.statement.includes('110 TRY')));assert.ok(!p.active_rules.some(x=>x.statement.includes('100 TRY')));});
await check('H waiting external lifecycle',async()=>{const p=await buildContextPack(db,'MURAT_TICARET','Murat Ticaret yanıtı',{now});assert.equal(p.open_items[0].status,'WAITING_EXTERNAL');assert.equal(p.recent_verified_events[0].type,'reply_received');
  native.prepare('UPDATE aperion_followups SET thread_ref=? WHERE followup_key=?').run(`thread:${'a'.repeat(64)}`,'followup:murat');
  const env={APERION_DB:db,APERION_BRIDGE_SECRET:'fixture-secret-context-test-1234567890'};
  const request=new Request('https://fixture.test/v1/followup',{method:'POST',headers:{authorization:`Bearer ${env.APERION_BRIDGE_SECRET}`,'content-type':'application/json'},body:JSON.stringify({thread_ref:`thread:${'a'.repeat(64)}`,message_ref:`gmail:${'b'.repeat(64)}`,received_at:now.toISOString()})});
  const result=await (await linkFollowupReply({request,env})).json();
  assert.equal(result.matched,true);assert.equal(result.stage,'RESPONSE_RECEIVED');
  assert.equal(native.prepare('SELECT stage FROM aperion_followups WHERE followup_key=?').get('followup:murat').stage,'RESPONSE_RECEIVED');
});

assert.equal(choosePack('BizimHesap hesabı'),'BIZIMHESAP');
assert.deepEqual(classifyIntent('Murat Ticaret için fatura hazırla'),{intent:'PREPARE',domain:'FINANCE'});
assert.equal(actionPolicy({intent:'EXECUTE',domain:'FINANCE'}).action_class,'ONAY_GEREKLI');
assert.equal(planExecution({intent:'ASK',domain:'GENERAL',action_class:'OTOMATIK',available:{native_connector:false,deterministic_browser:false,computer_use:true}}).engine,'computer_use');
assert.equal(skillProductionGate(SKILL_REGISTRY_V1['BizimHesap.GiderKaydet'],1).production_ready,false);
console.log(JSON.stringify({mode:'fixture_only',context_tests:`${checks.length}/8`,checks,financial_writes:0,bizimhesap_writes:0,secrets_exposed:0}));
