import assert from 'node:assert/strict';
import { rankAttention, buildToday, formatTodayBrief } from '../functions/shared/attention-engine.js';
import { resolveNaturalCommand, SKILL_REGISTRY_V1 } from '../functions/shared/skill-registry.js';
import { onRequestGet, onRequestPost } from '../functions/api/apeiron-today.js';

const now=new Date('2026-09-17T07:00:00.000Z');
const base={scope:'ALAYLI MEDİKAL',status:'open',confidence:.95,actionability:.8};
const scenarios=[
  {...base,id:'today',title:'Bugün vadeli ödeme',due_at:'2026-09-17',importance:.85,risk:.75,financial_impact:12000},
  {...base,id:'overdue',title:'Gecikmiş ödeme',due_at:'2026-09-16',importance:.9,risk:.9,financial_impact:20000},
  {...base,id:'approval',title:'Finansal onay',importance:.9,risk:.9,approval_required:true,financial_risk:true},
  {...base,id:'failed',title:'Başarısız Codex görevi',importance:.85,risk:.8,failed:true},
  {...base,id:'gmail',title:'Yeni kritik Gmail',importance:.8,risk:.8,new_important_message:true},
  {...base,id:'drive',title:'Değişmiş önemli Drive belgesi',importance:.65,risk:.6,reason_codes:['DATA_CONFLICT']},
  {...base,id:'stale',title:'Bayat fiyat bilgisi',importance:.7,risk:.75,stale_critical:true},
  {...base,id:'low',title:'Düşük önem mesajı',importance:.1,risk:.1,actionability:.1,confidence:.6},
  {...base,id:'duplicate',canonical_ref:'same:today',title:'Bugün vadeli ödeme',due_at:'2026-09-17',importance:.85,risk:.75,financial_impact:12000},
];
scenarios[0].canonical_ref='same:today';
const ranked=rankAttention(scenarios,now);
const ids=ranked.map(row=>row.id);
assert.equal(ranked.length,7,'duplicate and low importance suppressed');
assert.equal(ranked.filter(row=>row.canonical_ref==='same:today').length,1);
assert.ok(!ids.includes('low'));
assert.ok(ranked.find(row=>row.id==='overdue').reason_codes.includes('OVERDUE'));
assert.ok(ranked.find(row=>row.canonical_ref==='same:today').reason_codes.includes('DUE_TODAY'));
assert.equal(ranked.find(row=>row.id==='approval').action_class,'ONAY_GEREKLI');
assert.ok(ranked.find(row=>row.id==='failed').reason_codes.includes('FAILED_AUTOMATION'));
assert.ok(ranked.find(row=>row.id==='gmail').reason_codes.includes('NEW_IMPORTANT_MESSAGE'));
assert.ok(ranked.find(row=>row.id==='drive').reason_codes.includes('DATA_CONFLICT'));
assert.ok(ranked.find(row=>row.id==='stale').reason_codes.includes('STALE_CRITICAL_FACT'));
assert.ok(ranked[0].attention_score>=ranked.at(-1).attention_score);

const tableRows={
  commitments:[{commitment_key:'c1',title:'Bugün vadeli ödeme',commitment_type:'payable',amount:12000,currency:'TRY',due_at:'2026-09-17',status:'open',priority:'high',truth_state:'confirmed',approval_required:1,evidence_ref:'fixture:commitment'}],
  work_items:[{work_key:'w1',title:'Fiyatı kontrol et',status:'planned',due_at:'2026-09-18',approval_required:0}],
  approval_queue:[{id:'a1',item_type:'financial_expense',status:'needs_review',evidence_ref:'fixture:approval'}],
  memory_executions:[{execution_id:'x1',task_type:'DriveSync',occurred_at:'2026-09-17T06:00:00Z',result_status:'failed',verification_status:'failed',provenance_ref:'fixture:execution'}],
  memory_events:[{event_id:'e1',event_type:'mail_attention',occurred_at:'2026-09-17T05:00:00Z',source_type:'gmail',source_ref:'gmail:fixture',scope:'ALAYLI',summary:'Yeni kritik Gmail',risk_class:'FINANCIAL',result_status:'observed',verification_status:'source_metadata_verified',provenance_ref:'fixture:gmail'}],
  memory_conflicts:[{conflict_key:'cf1',subject:'Fiyat',predicate:'unit_price'}],
  memory_facts:[{fact_key:'price1',subject:'Fiyat',predicate:'unit_price',object_value:'100',confidence:.8,last_verified_at:'2026-08-01',freshness_policy:'price_30d',provenance_ref:'fixture:price'}],
  source_health:[{source_id:'gmail',status:'confirmed',checked_at:'2026-09-17T06:00:00Z'}],
  memory_documents:[{document_id:'d1',drive_file_id:'drive1',canonical_name:'Önemli belge',document_date:'2026-09-17',provenance_ref:'fixture:drive'}]
};
const db={prepare(sql){
  const table=Object.keys(tableRows).find(key=>sql.includes(`FROM ${key}`));
  return {async all(){return {results:table?tableRows[table]:[]};},async first(){
    if(sql.includes("FROM memory_entities WHERE entity_type='cash_account'")) return {canonical_name:'Ercan Nakit Kasa',provenance_ref:'fixture:AI-0646:account'};
    if(sql.includes('FROM memory_facts f JOIN memory_fact_sources')) return {fact_key:'tea',object_value:'MARKET',confidence:1,authority:'user_correction',valid_from:'2026-09-16',object_key:'fact:tea',freshness:'current',freshness_policy:'until_superseded',source_authority:'user_correction+verified_bizimhesap',sources:'fixture:user_correction | fixture:AI-0646'};
    return null;
  }};
}};
const today=await buildToday(db,now);
assert.equal(today.priorities.length,3);
assert.equal(today.approvals.length,2);
assert.equal(today.failed.length,1);
assert.ok(today.new_information.some(item=>item.kind==='document'));
assert.match(formatTodayBrief(today),/Günaydın ApeirON/);
assert.ok(formatTodayBrief(today).length<3901);

const tea=await resolveNaturalCommand(db,'75 TL çay Ercan nakit',today.priorities);
assert.equal(tea.scope,'ALAYLI MEDİKAL');
assert.equal(tea.amount,75);
assert.equal(tea.category,'MARKET');
assert.equal(tea.payment_account,'Ercan Nakit Kasa');
assert.equal(tea.financial_write,false);
assert.equal(tea.execution_authorized,false);
assert.deepEqual(tea.category_provenance.map(item=>item.source_ref),['fixture:user_correction','fixture:AI-0646']);
const parking=await resolveNaturalCommand(db,'120 TL otopark Ercan nakit',today.priorities);
assert.equal(parking.category,null);
assert.deepEqual(parking.missing,['category']);
assert.equal(SKILL_REGISTRY_V1['BizimHesap.GiderKaydet'].status,'candidate');
assert.equal((await resolveNaturalCommand(db,'İlkini yap',today.priorities)).execution_authorized,false);

const env={APERION_DB:db,APERION_BRIDGE_SECRET:'fixture-secret-for-today-api-only-123456789'};
const unauthorized=await onRequestGet({request:new Request('https://fixture.test/api/apeiron-today'),env});
assert.equal(unauthorized.status,401);
const headers={authorization:`Bearer ${env.APERION_BRIDGE_SECRET}`};
const skills=await (await onRequestGet({request:new Request('https://fixture.test/api/apeiron-today?view=skills',{headers}),env})).json();
assert.equal(skills.skills[0].skill_id,'BizimHesap.GiderKaydet');
const interpreted=await (await onRequestPost({request:new Request('https://fixture.test/api/apeiron-today',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({command:'75 TL çay Ercan nakit'})}),env})).json();
assert.equal(interpreted.resolution.category,'MARKET');
assert.equal(interpreted.read_only,true);
const source=await (await onRequestPost({request:new Request('https://fixture.test/api/apeiron-today',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({command:'Bunun kaynağı ne?',item_id:today.priorities[0].id})}),env})).json();
assert.deepEqual(source.resolution.provenance,today.priorities[0].provenance);
console.log(JSON.stringify({mode:'fixture_only',attention_scenarios:'9/9',today:'PASS',reason_codes:'PASS',duplicate_suppression:'PASS',skill_registry:'PASS',memory_aware_intent:'PASS',tea_provenance:'PASS',daily_brief:'PASS',financial_writes:0,bizimhesap_writes:0}));
