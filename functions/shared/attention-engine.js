const REASONS = new Set(['DUE_TODAY','OVERDUE','FINANCIAL_RISK','WAITING_APPROVAL','FAILED_AUTOMATION','NEW_IMPORTANT_MESSAGE','DATA_CONFLICT','STALE_CRITICAL_FACT','USER_COMMITMENT','OPPORTUNITY']);
const CLOSED = new Set(['completed','cancelled','verified','done','superseded']);
const clean = (value, max = 180) => String(value ?? '').replace(/\s+/g,' ').trim().slice(0,max);
const lower = value => clean(value).toLocaleLowerCase('tr-TR');
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const dateOnly = value => {
  const raw=clean(value,40);
  const local=raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (local) return `${local[3].length===2?`20${local[3]}`:local[3]}-${local[2].padStart(2,'0')}-${local[1].padStart(2,'0')}`;
  return raw.slice(0,10);
};

export function istanbulDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const byType = Object.fromEntries(parts.map(part => [part.type,part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function daysFromToday(value, today) {
  if (!dateOnly(value)) return null;
  const due = Date.parse(`${dateOnly(value)}T00:00:00Z`);
  const start = Date.parse(`${today}T00:00:00Z`);
  return Number.isFinite(due) ? Math.round((due-start)/86400000) : null;
}

function classify(item) {
  if (item.waiting_on_user || item.approval_required || item.kind === 'approval') return 'ONAY_GEREKLI';
  if (item.confidence < 0.7 || item.truth_state && !['confirmed','verified'].includes(lower(item.truth_state))) return 'BILGI_GEREKLI';
  return 'OTOMATIK';
}

export function scoreAttention(input, today) {
  const item = { ...input };
  const reasons = new Set((item.reason_codes || []).filter(code => REASONS.has(code)));
  const delta = daysFromToday(item.due_at,today);
  if (delta === 0) reasons.add('DUE_TODAY');
  if (delta != null && delta < 0) reasons.add('OVERDUE');
  if (item.approval_required || item.waiting_on_user) reasons.add('WAITING_APPROVAL');
  if (item.failed) reasons.add('FAILED_AUTOMATION');
  if (item.conflict) reasons.add('DATA_CONFLICT');
  if (item.stale_critical) reasons.add('STALE_CRITICAL_FACT');
  if (item.new_important_message) reasons.add('NEW_IMPORTANT_MESSAGE');
  if (item.user_commitment) reasons.add('USER_COMMITMENT');
  if (item.opportunity) reasons.add('OPPORTUNITY');
  if (item.financial_impact > 0 || item.financial_risk) reasons.add('FINANCIAL_RISK');
  const urgency = delta == null ? number(item.urgency) : delta < 0 ? 1 : delta === 0 ? .9 : delta <= 3 ? .65 : .2;
  const importance = Math.max(0,Math.min(1,number(item.importance)));
  const risk = Math.max(0,Math.min(1,number(item.risk)));
  const confidence = Math.max(0,Math.min(1,number(item.confidence ?? .7)));
  const actionability = Math.max(0,Math.min(1,number(item.actionability ?? .7)));
  const financial = Math.min(1,Math.log10(1+Math.max(0,number(item.financial_impact)))/6);
  const score = Math.round(100*(.25*urgency+.18*importance+.16*risk+.12*financial+.12*Number(Boolean(item.waiting_on_user || item.approval_required))+.06*Number(Boolean(item.waiting_on_external))+.06*Number(Boolean(item.stale_critical))+.05*actionability)*(.65+.35*confidence));
  return { ...item,attention_score:score,reason_codes:[...reasons],action_class:classify({ ...item,confidence }),confidence };
}

function dedupeKey(item) {
  if (item.canonical_ref) return `canonical:${lower(item.canonical_ref)}`;
  const title = lower(item.title).replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  return `${lower(item.scope)}|${title}|${dateOnly(item.due_at)}|${number(item.financial_impact).toFixed(2)}`;
}

export function rankAttention(items, now = new Date()) {
  const today = istanbulDate(now);
  const unique = new Map();
  for (const raw of items) {
    if (!raw || CLOSED.has(lower(raw.status))) continue;
    const item = scoreAttention(raw,today);
    const key = dedupeKey(item);
    const prior = unique.get(key);
    if (!prior) unique.set(key,item);
    else unique.set(key,{...prior,...(item.attention_score>prior.attention_score?item:prior),reason_codes:[...new Set([...prior.reason_codes,...item.reason_codes])],provenance:[...new Set([...(prior.provenance||[]),...(item.provenance||[])])],attention_score:Math.max(prior.attention_score,item.attention_score)});
  }
  return [...unique.values()].filter(item => item.attention_score >= 25 || item.reason_codes.some(code => ['WAITING_APPROVAL','FAILED_AUTOMATION','OVERDUE','DATA_CONFLICT'].includes(code)))
    .sort((a,b) => b.attention_score-a.attention_score || String(a.id).localeCompare(String(b.id)));
}

async function rows(db, sql) {
  try { return { available:true,rows:(await db.prepare(sql).all()).results || [] }; }
  catch (error) { return { available:false,rows:[],error:clean(error?.message,100) }; }
}

export async function buildToday(db, now = new Date()) {
  const today = istanbulDate(now);
  const [commitments,work,approvals,executions,events,conflicts,staleFacts,health,documents] = await Promise.all([
    rows(db,"SELECT commitment_key,title,commitment_type,amount,currency,due_at,expected_at,status,priority,truth_state,approval_required,source_ref,evidence_ref,next_action FROM commitments WHERE status NOT IN ('completed','cancelled','verified') ORDER BY COALESCE(due_at,expected_at) LIMIT 100"),
    rows(db,"SELECT work_key,title,action_type,due_at,status,approval_required,idempotency_key FROM work_items WHERE status NOT IN ('completed','cancelled','verified','done') ORDER BY due_at LIMIT 100"),
    rows(db,"SELECT id,item_type,status,evidence_ref,created_at FROM approval_queue WHERE status IN ('needs_review','pending','awaiting_approval') ORDER BY created_at LIMIT 100"),
    rows(db,"SELECT execution_id,task_type,occurred_at,result_status,verification_status,provenance_ref,company FROM memory_executions WHERE result_status NOT IN ('completed_verified','completed') ORDER BY occurred_at DESC LIMIT 50"),
    rows(db,"SELECT event_id,event_type,occurred_at,source_type,source_ref,scope,summary,risk_class,result_status,verification_status,provenance_ref,metadata_json FROM memory_events WHERE occurred_at>=datetime('now','-7 days') AND source_type IN ('gmail','google_drive','codex_computer_use') ORDER BY occurred_at DESC LIMIT 100"),
    rows(db,"SELECT conflict_key,subject,predicate,created_at FROM memory_conflicts WHERE status='needs_review' ORDER BY created_at DESC LIMIT 30"),
    rows(db,"SELECT f.fact_key,f.subject,f.predicate,f.object_value,q.confidence,q.last_verified_at,q.freshness_policy,q.provenance_ref FROM memory_facts f JOIN memory_objects o ON o.object_type='FACT' AND o.canonical_ref=f.fact_key JOIN memory_quality q ON q.object_key=o.object_key WHERE f.status='active' AND (q.freshness='stale' OR (q.freshness_policy='price_30d' AND q.last_verified_at<datetime('now','-30 days'))) LIMIT 30"),
    rows(db,"SELECT source_key AS source_id,status,message,last_success_at,checked_at FROM source_health"),
    rows(db,"SELECT document_id,drive_file_id,canonical_name,document_date,provenance_ref FROM memory_documents WHERE superseded_by IS NULL AND document_date>=datetime('now','-7 days') ORDER BY document_date DESC LIMIT 30")
  ]);
  const candidates=[];
  for(const row of commitments.rows) candidates.push({id:`commitment:${row.commitment_key}`,canonical_ref:row.source_ref||null,kind:'commitment',title:row.title,scope:'AperiON',due_at:row.due_at||row.expected_at,status:row.status,importance:lower(row.priority)==='high'?.9:.65,risk:row.amount?.5:.25,financial_impact:number(row.amount),approval_required:Boolean(row.approval_required),truth_state:row.truth_state,confidence:row.truth_state==='confirmed'?.9:.5,actionability:.85,user_commitment:true,next_action:row.next_action,provenance:[row.evidence_ref||row.source_ref].filter(Boolean)});
  for(const row of work.rows) candidates.push({id:`work:${row.work_key}`,canonical_ref:row.idempotency_key||null,kind:'work',title:row.title,scope:'AperiON',due_at:row.due_at,status:row.status,importance:.6,risk:.3,confidence:.8,actionability:.9,approval_required:Boolean(row.approval_required),provenance:[`work:${row.work_key}`]});
  for(const row of approvals.rows) candidates.push({id:`approval:${row.id}`,kind:'approval',title:`Bekleyen onay: ${row.item_type||'inceleme'}`,scope:'AperiON',status:row.status,importance:.8,risk:.8,confidence:.95,actionability:1,approval_required:true,financial_risk:/finan|payment|expense|gider|bank/i.test(row.item_type||''),provenance:[row.evidence_ref||`approval:${row.id}`]});
  for(const row of executions.rows) candidates.push({id:`execution:${row.execution_id}`,kind:'failed_automation',title:`Başarısız Codex işi: ${row.task_type}`,scope:row.company||'AperiON',status:row.result_status,importance:.8,risk:.8,confidence:.95,actionability:.8,failed:true,provenance:[row.provenance_ref]});
  for(const row of events.rows) {
    if (row.source_type==='codex_computer_use' && /completed_verified|read_back_verified/.test(`${row.result_status}|${row.verification_status}`)) continue;
    let metadata={}; try { metadata=JSON.parse(row.metadata_json||'{}'); } catch { /* Corrupt metadata is ignored. */ }
    candidates.push({id:`event:${row.event_id}`,canonical_ref:row.source_ref,kind:'event',title:row.summary,scope:row.scope,status:'open',due_at:metadata.due_date,financial_impact:number(metadata.amount),importance:row.risk_class==='FINANCIAL'?.8:.6,risk:row.risk_class==='FINANCIAL'?.8:.4,confidence:row.verification_status==='source_content_verified'?.95:.7,actionability:.6,new_important_message:row.source_type==='gmail',financial_risk:row.risk_class==='FINANCIAL',provenance:[row.provenance_ref]});
  }
  for(const row of conflicts.rows) candidates.push({id:`conflict:${row.conflict_key}`,kind:'conflict',title:`Veri çelişkisi: ${row.subject} / ${row.predicate}`,scope:'AperiON',status:'open',importance:.8,risk:.8,confidence:.9,actionability:.7,conflict:true,provenance:[`conflict:${row.conflict_key}`]});
  for(const row of staleFacts.rows) candidates.push({id:`stale:${row.fact_key}`,kind:'stale_fact',title:`Eski kritik bilgi: ${row.subject} / ${row.predicate}`,scope:'AperiON',status:'open',importance:.7,risk:.7,confidence:number(row.confidence),actionability:.7,stale_critical:true,provenance:[row.provenance_ref]});
  for(const row of documents.rows) candidates.push({id:`document:${row.document_id}`,canonical_ref:`drive:${row.drive_file_id}`,kind:'document',title:`Önemli Drive değişikliği: ${row.canonical_name}`,scope:'AperiON',status:'open',urgency:.4,importance:.7,risk:.45,confidence:.9,actionability:.7,provenance:[row.provenance_ref]});
  for(const row of health.rows.filter(row=>['blocked','missing','stale'].includes(lower(row.status)))) candidates.push({id:`health:${row.source_id}`,kind:'failed_automation',title:`Kaynak sağlığı: ${row.source_id} (${row.status})`,scope:'AperiON',status:'open',importance:.7,risk:.75,confidence:.95,actionability:.7,failed:true,provenance:[row.source_id,row.checked_at].filter(Boolean)});
  const ranked=rankAttention(candidates,now);
  const categories={approvals:ranked.filter(x=>x.reason_codes.includes('WAITING_APPROVAL')),financial:ranked.filter(x=>x.reason_codes.includes('FINANCIAL_RISK')),failed:ranked.filter(x=>x.reason_codes.includes('FAILED_AUTOMATION')),new_information:ranked.filter(x=>x.reason_codes.includes('NEW_IMPORTANT_MESSAGE')||x.kind==='document')};
  return {date:today,generated_at:now.toISOString(),source_health:health.rows,source_availability:{commitments:commitments.available,work:work.available,approvals:approvals.available,executions:executions.available,events:events.available,conflicts:conflicts.available,stale_facts:staleFacts.available,health:health.available,documents:documents.available},priorities:ranked.slice(0,3),...categories,items:ranked,duplicate_suppressed:candidates.length-new Set(candidates.map(dedupeKey)).size,read_only:true};
}

export function formatTodayBrief(today) {
  const line=(item,i)=>`${i+1}. ${item.action_class} — ${clean(item.title,120)} [${item.reason_codes.join(', ')}]`;
  const seen=new Set(today.priorities.map(item=>item.id));
  const section=(name,items)=>{
    const fresh=items.filter(item=>!seen.has(item.id)).slice(0,3);
    fresh.forEach(item=>seen.add(item.id));
    return `\n${name}\n${fresh.length?fresh.map(item=>`• ${item.action_class} — ${clean(item.title,120)}`).join('\n'):items.length?'• Önceliklerde gösterildi':'• Yok'}`;
  };
  const unhealthy=today.source_health.filter(row=>!['confirmed','ok','healthy'].includes(lower(row.status)));
  const healthLine=!today.source_availability.health?'• BILGI_GEREKLI — kaynak sağlığı okunamadı':unhealthy.length?unhealthy.map(row=>`• ${clean(row.source_id)}: ${clean(row.status)}`).join('\n'):'• Bağlı kaynaklarda bildirilen arıza yok';
  return [`Günaydın ApeirON — ${today.date}`,'Salt okunur günlük brifing · mali kayıt oluşturulmadı',`\nKAYNAK SAĞLIĞI\n${healthLine}`,`\nEN FAZLA 3 ÖNCELİK\n${today.priorities.length?today.priorities.map(line).join('\n'):'• Doğrulanmış öncelik yok'}`,section('BEKLEYEN ONAYLAR',today.approvals),section('FİNANSAL / VADE RİSKİ',today.financial),section('BAŞARISIZ İŞLER',today.failed),section('ÖNEMLİ YENİ BİLGİ',today.new_information),`\nÖNERİLEN SONRAKİ EYLEM\n${today.priorities[0]?`• 1 numaralı önceliği ${today.priorities[0].action_class==='ONAY_GEREKLI'?'onaya sun':'ele al'}; sonucu doğrula.`:'• Kaynakları doğrula; eksik veriden karar üretme.'}`].join('\n').slice(0,3900);
}
