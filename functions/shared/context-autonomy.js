import { effectiveFreshness, recallMemory } from './memory-recall.js';
import { resolveNaturalCommand, SKILL_REGISTRY_V1 } from './skill-registry.js';

const PACKS = Object.freeze({
  ALAYLI_FINANS:{scope:'ALAYLI MEDİKAL',terms:['ALAYLI','finans','çay','kasa']},
  MURAT_TICARET:{scope:'MURAT TİCARET',terms:['Murat Ticaret','MURAT TICARET']},
  BIZIMHESAP:{scope:'ALAYLI MEDİKAL',terms:['BizimHesap','AI-0646']},
  UMUTEVLERI:{scope:'UMUTEVLERI',terms:['UMUTEVLERI','UMUT EVLERİ']},
  APEIRON_SYSTEM:{scope:'AperiON',terms:['AperiON','Memory OS','Computer Use']}
});
const MAX_TEXT=220;
const tidy=(value,max=MAX_TEXT)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,max);
const lc=value=>tidy(value).toLocaleLowerCase('tr-TR');
const secretLike=value=>/(?:password|parola|şifre|token|bearer|api[_ -]?key|client[_ -]?secret|otp|cvv|cvc)/i.test(String(value||''));
const unique=(list,key)=>[...new Map(list.map(item=>[key(item),item])).values()];
const iso=now=>now.toISOString();

export function choosePack(question) {
  const q=lc(question);
  if (/murat\s*ticaret/.test(q)) return 'MURAT_TICARET';
  if (/umut\s*evleri|umutevleri/.test(q)) return 'UMUTEVLERI';
  if (/bizimhesap|ai-\d{4}/.test(q)) return 'BIZIMHESAP';
  if (/aperion|memory os|computer use|sistem/.test(q)) return 'APEIRON_SYSTEM';
  return 'ALAYLI_FINANS';
}

async function query(db,sql,params=[]) {
  try { return {available:true,rows:(await db.prepare(sql).bind(...params).all()).results||[]}; }
  catch { return {available:false,rows:[]}; }
}

export async function buildContextPack(db,packId,question,{now=new Date(),tokenBudget=1200}={}) {
  const spec=PACKS[packId];
  if (!spec) throw new Error('unknown_pack');
  const budget=Math.max(300,Math.min(2500,Number(tokenBudget)||1200));
  const term=spec.terms[0];
  const match=`%${term}%`;
  const [entities,facts,decisions,events,documents,conflicts,work,followups,skills]=await Promise.all([
    query(db,'SELECT entity_id,entity_type,canonical_name,scope,provenance_ref FROM memory_entities WHERE scope=? OR canonical_name LIKE ? ORDER BY created_at DESC LIMIT 12',[spec.scope,match]),
    query(db,`SELECT f.fact_key,f.subject,f.predicate,f.object_value,f.scope,f.confidence,f.authority,f.valid_from,f.valid_to,f.status,
      q.freshness,q.freshness_policy,q.valid_until,q.last_verified_at,q.source_authority,q.provenance_ref
      FROM memory_facts f LEFT JOIN memory_objects o ON o.object_type='FACT' AND o.canonical_ref=f.fact_key
      LEFT JOIN memory_quality q ON q.object_key=o.object_key
      WHERE f.status='active' AND (f.scope=? OR f.subject LIKE ? OR f.object_value LIKE ?)
      ORDER BY f.last_seen DESC LIMIT 35`,[spec.scope,match,match]),
    query(db,"SELECT decision_key,decision,scope,effective_date,source_id FROM memory_decisions WHERE status='active' AND (scope=? OR decision LIKE ?) ORDER BY effective_date DESC LIMIT 12",[spec.scope,match]),
    query(db,`SELECT event_id,event_type,occurred_at,summary,source_type,source_ref,verification_status,provenance_ref
      FROM memory_events WHERE (scope=? OR company=? OR summary LIKE ?) AND verification_status IN ('read_back_verified','source_content_verified','corroborated')
      ORDER BY occurred_at DESC LIMIT 18`,[spec.scope,spec.scope,match]),
    query(db,`SELECT document_id,drive_file_id,canonical_name,version_hash,document_date,summary,provenance_ref
      FROM memory_documents WHERE superseded_by IS NULL AND (canonical_name LIKE ? OR related_entities_json LIKE ?)
      ORDER BY document_date DESC LIMIT 12`,[match,match]),
    query(db,`SELECT conflict_key,subject,predicate,status,created_at FROM memory_conflicts
      WHERE status='needs_review' AND (subject LIKE ? OR predicate LIKE ?) ORDER BY created_at DESC LIMIT 12`,[match,match]),
    query(db,"SELECT work_key,title,status,due_at,approval_required FROM work_items WHERE status NOT IN ('completed','cancelled','verified','done') AND title LIKE ? ORDER BY due_at LIMIT 15",[match]),
    query(db,"SELECT followup_key,title,stage,due_at,next_action,provenance_ref FROM aperion_followups WHERE stage NOT IN ('COMPLETED','CANCELLED') AND (title LIKE ? OR entity_ref LIKE ?) ORDER BY due_at LIMIT 15",[match,match]),
    query(db,"SELECT task_type,status,verified_executions,provenance_ref FROM memory_skill_candidates WHERE scope=? ORDER BY updated_at DESC LIMIT 8",[spec.scope])
  ]);
  const freshFacts=facts.rows.filter(row=>!secretLike(`${row.subject} ${row.predicate} ${row.object_value}`))
    .map(row=>({...row,freshness:effectiveFreshness(row)}))
    .filter(row=>row.freshness!=='stale' && !(row.valid_to && Date.parse(row.valid_to)<now.getTime()));
  const safeEvents=events.rows.filter(row=>!secretLike(row.summary));
  const safeDocs=documents.rows.filter(row=>!secretLike(`${row.canonical_name} ${row.summary}`));
  const activeRules=unique([
    ...freshFacts.filter(row=>/category|rule|price|policy|hesap|fiyat/i.test(row.predicate)).map(row=>({key:row.fact_key,statement:`${tidy(row.subject)}: ${tidy(row.predicate)} = ${tidy(row.object_value)}`,confidence:row.confidence,freshness:row.freshness,valid_from:row.valid_from,valid_until:row.valid_to,source_authority:row.source_authority||row.authority,source_ref:row.provenance_ref||row.fact_key})),
    ...decisions.rows.filter(row=>!secretLike(row.decision)).map(row=>({key:row.decision_key,statement:tidy(row.decision),valid_from:row.effective_date,source_ref:`decision:${row.decision_key}`}))
  ],row=>row.key).slice(0,12);
  const openItems=unique([...work.rows.filter(row=>!secretLike(row.title)).map(row=>({id:`work:${row.work_key}`,title:tidy(row.title),status:row.status,due_at:row.due_at,approval_required:Boolean(row.approval_required)})),
    ...followups.rows.filter(row=>!secretLike(`${row.title} ${row.next_action}`)).map(row=>({id:`followup:${row.followup_key}`,title:tidy(row.title),status:row.stage,due_at:row.due_at,next_action:tidy(row.next_action),source_ref:row.provenance_ref}))],row=>row.id).slice(0,15);
  const sourceRefs=[...new Set([...entities.rows.map(x=>x.provenance_ref),...activeRules.map(x=>x.source_ref),...safeEvents.map(x=>x.provenance_ref),...safeDocs.map(x=>x.provenance_ref),...followups.rows.map(x=>x.provenance_ref)].filter(Boolean))];
  const pack={pack_id:packId,scope:spec.scope,generated_at:iso(now),freshness:facts.available&&events.available?'source_bounded':'partial_source_unavailable',
    entities:entities.rows.map(row=>({id:row.entity_id,type:row.entity_type,name:row.canonical_name,source_ref:row.provenance_ref})),
    active_rules:activeRules,open_items:openItems,
    relevant_documents:safeDocs.map(row=>({document_id:row.document_id,name:tidy(row.canonical_name),version_hash:row.version_hash,date:row.document_date,summary:tidy(row.summary),source_ref:row.provenance_ref})),
    recent_verified_events:safeEvents.map(row=>({event_id:row.event_id,type:row.event_type,occurred_at:row.occurred_at,summary:tidy(row.summary),verification_status:row.verification_status,source_ref:row.provenance_ref})),
    conflicts:conflicts.rows.filter(row=>!secretLike(`${row.subject} ${row.predicate}`)),source_refs:sourceRefs,skills:skills.rows.filter(row=>row.status==='candidate'||row.status==='production_ready'),
    token_budget:budget,source_availability:{entities:entities.available,facts:facts.available,decisions:decisions.available,events:events.available,documents:documents.available,conflicts:conflicts.available,work:work.available,followups:followups.available,skills:skills.available}};
  // Each query is bounded; additionally bound the serialized pack rather than silently loading a whole archive.
  const cap=budget*5;
  while (JSON.stringify(pack).length>cap) {
    const arrays=['recent_verified_events','relevant_documents','open_items','active_rules','entities'];
    const candidate=arrays.sort((a,b)=>pack[b].length-pack[a].length)[0];
    if (!candidate || !pack[candidate].length) break;
    pack[candidate].pop();
  }
  pack.source_refs=[...new Set([...pack.entities.map(x=>x.source_ref),...pack.active_rules.map(x=>x.source_ref),...pack.relevant_documents.map(x=>x.source_ref),...pack.recent_verified_events.map(x=>x.source_ref),...pack.open_items.map(x=>x.source_ref)].filter(Boolean))];
  pack.evidence_count=pack.entities.length+pack.active_rules.length+pack.relevant_documents.length+pack.recent_verified_events.length;
  pack.unknown=pack.evidence_count===0;
  return pack;
}

export function entity360(pack) {
  const take=(items,predicate)=>items.filter(predicate);
  const communication=take(pack.recent_verified_events,row=>/mail|message|reply|yanıt|iletişim/i.test(`${row.type} ${row.summary}`));
  const contracts=take(pack.relevant_documents,row=>/sözleşme|contract/i.test(`${row.name} ${row.summary}`));
  const invoices=take(pack.relevant_documents,row=>/fatura|invoice/i.test(`${row.name} ${row.summary}`));
  const prices=take(pack.active_rules,row=>/price|fiyat|birim/i.test(row.statement));
  const approvals=take(pack.open_items,row=>row.approval_required||row.status==='WAITING_APPROVAL');
  const risks=pack.conflicts.map(row=>({type:'unresolved_conflict',subject:row.subject,predicate:row.predicate,source_ref:`conflict:${row.conflict_key}`}));
  return {entity:pack.entities[0]||null,scope:pack.scope,as_of:pack.generated_at,completeness:pack.unknown?'no_verified_entity':'partial_source_backed',
    last_communications:communication.slice(0,5),open_tasks:pack.open_items,waiting_approvals:approvals,
    contracts,price_rules:prices,invoices,documents:pack.relevant_documents,
    recent_verified_events:pack.recent_verified_events,risks,next_action:pack.open_items[0]?.next_action||null,
    source_refs:pack.source_refs,missing_fields:['last_communications','contracts','price_rules','invoices'].filter(field=>({last_communications:communication,contracts,price_rules:prices,invoices})[field].length===0)};
}

export function classifyIntent(text) {
  const q=lc(text);
  const domain=/gider|masraf|ödeme|tahsilat|fatura|çay|kasa|tl\b|₺|fiyat|cari/.test(q)?'FINANCE':
    /mail|e-posta|gmail/.test(q)?'EMAIL':/drive|belge|dosya/.test(q)?'DRIVE':
    /kargo|sevkiyat|teslimat/.test(q)?'LOGISTICS':/takvim|randevu|toplantı/.test(q)?'CALENDAR':
    /mesaj|whatsapp|telegram/.test(q)?'MESSAGING':/windows|chrome|bilgisayar|computer use/.test(q)?'WINDOWS':'GENERAL';
  const intent=/\b(onayla|onaylıyorum|evet kaydet)\b/.test(q)?'APPROVE':/\b(iptal|vazgeç)\b/.test(q)?'CANCEL':
    /hatırlat|anımsat/.test(q)?'REMIND':/izle|takip et|haber ver/.test(q)?'MONITOR':
    /kaydet|gönder|oluştur|işle|sil|değiştir/.test(q)?'EXECUTE':/hazırla|taslak/.test(q)?'PREPARE':
    /analiz|karşılaştır|neden|risk/.test(q)?'ANALYZE':/ara|bul|nerede/.test(q)?'SEARCH':
    /hatırla|unutma|hafızaya/.test(q)?'REMEMBER':'ASK';
  return {intent,domain};
}

export function actionPolicy({intent,domain,missing=[],conflicts=[],candidates=1,operation=''}) {
  if (missing.length||conflicts.length||candidates>1) return {action_class:'BILGI_GEREKLI',reason:missing.length?'missing_fields':conflicts.length?'unresolved_conflict':'multiple_candidates'};
  if (intent==='EXECUTE'&&(domain==='FINANCE'||domain==='MESSAGING'||/delete|permission|share|send|financial/i.test(operation))) return {action_class:'ONAY_GEREKLI',reason:'material_external_write'};
  if (intent==='APPROVE') return {action_class:'BILGI_GEREKLI',reason:'approval_must_bind_exact_pending_action'};
  return {action_class:'OTOMATIK',reason:'read_only_or_low_risk'};
}

export function planExecution({intent,domain,action_class,available={}}) {
  const order=['native_connector','deterministic_browser','computer_use','human'];
  const selected=order.find(engine=>available[engine])||'human';
  return {engine:selected,preference_order:order,mode:action_class==='ONAY_GEREKLI'?'prepare_only':intent==='EXECUTE'?'eligible_after_policy':'read_only',execution_authorized:false};
}

const AUTHORITY={user_correction:5,verified_real_action:4,original_document:3,reliable_system:2,inference:1};
export function resolveConflict(candidates,now=new Date(),scope=null) {
  const active=candidates.filter(row=>(!scope||row.scope===scope)&&row.status!=='superseded'&&(!row.valid_from||Date.parse(row.valid_from)<=now.getTime())&&(!row.valid_until||Date.parse(row.valid_until)>=now.getTime()));
  if (!active.length) return {status:'BILGI_GEREKLI',reason:'no_current_candidate'};
  const ranked=[...active].sort((a,b)=>(AUTHORITY[b.source_authority]||0)-(AUTHORITY[a.source_authority]||0)||Date.parse(b.last_verified_at||b.valid_from||0)-Date.parse(a.last_verified_at||a.valid_from||0));
  const top=ranked[0],peer=ranked[1];
  if (peer&&top.value!==peer.value&&(AUTHORITY[top.source_authority]||0)===(AUTHORITY[peer.source_authority]||0)&&Date.parse(top.last_verified_at||top.valid_from||0)===Date.parse(peer.last_verified_at||peer.valid_from||0)) return {status:'BILGI_GEREKLI',reason:'equal_authority_conflict',candidates:ranked.slice(0,2)};
  return {status:'resolved',value:top.value,source_ref:top.source_ref,source_authority:top.source_authority,valid_from:top.valid_from,excluded:ranked.slice(1).map(row=>row.source_ref)};
}

export async function readWorkingContext(db,taskKey,now=new Date()) {
  if (!taskKey) return null;
  const row=await db.prepare('SELECT state_json,previous_intent,scope,expires_at FROM aperion_working_context WHERE task_key=? AND expires_at>?').bind(taskKey,iso(now)).first();
  if (!row) return null;
  return {state:JSON.parse(row.state_json),previous_intent:row.previous_intent,scope:row.scope,expires_at:row.expires_at};
}

export async function saveWorkingContext(db,taskKey,scope,state,intent,{now=new Date(),ttlMinutes=45}={}) {
  if (!/^[a-zA-Z0-9:_-]{8,100}$/.test(taskKey)) throw new Error('invalid_task_key');
  await db.prepare('DELETE FROM aperion_working_context WHERE expires_at<=?').bind(iso(now)).run();
  const safe=Object.fromEntries(Object.entries(state||{}).filter(([key,value])=>['amount','currency','category','payment_account','company','operation','date','paid_status','missing'].includes(key)&&!secretLike(`${key} ${value}`)));
  const expiry=new Date(now.getTime()+Math.min(120,Math.max(5,ttlMinutes))*60000).toISOString();
  await db.prepare(`INSERT INTO aperion_working_context(task_key,scope,state_json,previous_intent,updated_at,expires_at)
    VALUES(?,?,?,?,?,?) ON CONFLICT(task_key) DO UPDATE SET scope=excluded.scope,state_json=excluded.state_json,
    previous_intent=excluded.previous_intent,updated_at=excluded.updated_at,expires_at=excluded.expires_at`)
    .bind(taskKey,scope,JSON.stringify(safe),intent,iso(now),expiry).run();
  return {task_key:taskKey,expires_at:expiry,state:safe};
}

export async function routeCommand(db,command,{taskKey,now=new Date(),available={native_connector:true,deterministic_browser:true,computer_use:true}}={}) {
  const recall=await recallMemory(db,command).catch(()=>({found:false,provenance:[]}));
  const packId=choosePack(command);
  const pack=await buildContextPack(db,packId,command,{now});
  const classification=classifyIntent(command);
  const previous=taskKey?await readWorkingContext(db,taskKey,now):null;
  let resolution=await resolveNaturalCommand(db,command,[]);
  const correction=lc(command).match(/(?:market\s+değil,?\s*)?([\p{L}]+)\.?$/u);
  if (previous&&resolution.intent==='unknown'&&correction&&/değil|düzelt/i.test(command)) {
    const category=correction[1].toLocaleUpperCase('tr-TR');
    resolution={...previous.state,category,category_unverified:true,missing:['category_catalog_verification'],intent:previous.previous_intent||'expense',status:'draft_only',execution_authorized:false,financial_write:false,continued:true};
  }
  const missing=resolution.missing||[];
  const policy=actionPolicy({intent:classification.intent,domain:classification.domain,missing,conflicts:pack.conflicts});
  if (resolution.intent==='expense'||resolution.continued) {
    policy.action_class=missing.length?'BILGI_GEREKLI':'ONAY_GEREKLI';
    policy.reason=missing.length?'missing_fields':'financial_write_requires_action_time_approval';
  }
  const plan=planExecution({...classification,action_class:policy.action_class,available});
  return {memory_retrieval:{found:Boolean(recall.found),answer:recall.answer||null,provenance:recall.provenance||[]},context_pack:pack,classification,resolution,policy,execution_plan:plan,working_context:previous?{found:true,expires_at:previous.expires_at}: {found:false}};
}

export function skillProductionGate(skill,verifiedExamples=0) {
  const checks={examples:verifiedExamples>=3,required_fields:Array.isArray(skill.required_fields)&&skill.required_fields.length>=4,
    risk_policy:Boolean(skill.approval_policy),duplicate_policy:Boolean(skill.duplicate_check),verification_policy:Boolean(skill.verification_policy),failure_recovery:Boolean(skill.failure_recovery)};
  return {production_ready:Object.values(checks).every(Boolean),checks};
}

export async function realTaskScorecard(db,date) {
  const rows=(await db.prepare(`SELECT result_status,verification_status,COUNT(*) AS n FROM memory_executions
    WHERE substr(occurred_at,1,10)=? AND task_type NOT LIKE 'Development.%' GROUP BY result_status,verification_status`).bind(date).all()).results||[];
  const total=rows.reduce((sum,row)=>sum+row.n,0);
  return {date,total_real_tasks:total,completed_verified:rows.filter(x=>x.result_status==='completed_verified'&&x.verification_status==='read_back_verified').reduce((a,x)=>a+x.n,0),
    failed_safe:rows.filter(x=>/fail|cancel/.test(x.result_status)).reduce((a,x)=>a+x.n,0),needs_user_info:null,needs_approval:null,
    user_had_to_use_pc:null,user_had_to_repeat_command:null,memory_used:null,memory_learned:null,average_user_interventions:null,
    source:'memory_executions',coverage:'partial; interaction metrics are not instrumented',fabricated_zeroes:false};
}
