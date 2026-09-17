import { containsSecret, normalize, sha256 } from './project-memory.js';

const TYPES = new Set(['FACT','DECISION','RULE','PREFERENCE','ENTITY','DOCUMENT','EVENT','TASK','RESULT','VERIFICATION']);
const RISKS = new Set(['READ','REVERSIBLE_LOW_RISK','WRITE_EXTERNAL','FINANCIAL']);
const SAFE_META = new Set(['document_no','amount','currency','category','payment_account','paid_status','verified_at','duplicate','source_hash','verification_method','drive_file_id','version_hash','acceptance_code']);
const text = (v, n = 240) => String(v ?? '').trim().slice(0, n);

export function safeMetadata(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('metadata_invalid');
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!SAFE_META.has(key)) continue;
    if (!['string','number','boolean'].includes(typeof raw) || containsSecret(String(raw))) throw new Error('metadata_unsafe');
    out[key] = typeof raw === 'string' ? text(raw, 160) : raw;
  }
  return out;
}

export async function normalizeEvent(input) {
  const required = ['event_type','occurred_at','source_type','source_ref','actor','scope','summary','risk_class','result_status','verification_status','provenance_ref'];
  for (const key of required) if (!text(input?.[key])) throw new Error(`event_${key}_required`);
  if (!RISKS.has(input.risk_class) || !Number.isFinite(Date.parse(input.occurred_at))) throw new Error('event_type_or_time_invalid');
  const entityRefs = Array.isArray(input.entity_refs) ? input.entity_refs.map(v => text(v, 160)).filter(Boolean).slice(0, 20) : [];
  const metadata = safeMetadata(input.metadata);
  const record = {
    event_id: text(input.event_id, 100) || `evt:${(await sha256(`${input.source_type}|${input.source_ref}|${input.event_type}`)).slice(0, 40)}`,
    event_type: text(input.event_type, 80), occurred_at: new Date(input.occurred_at).toISOString(),
    source_type: text(input.source_type, 80), source_ref: text(input.source_ref, 240), actor: text(input.actor, 120),
    scope: text(input.scope, 120), company: text(input.company, 160) || null,
    entity_refs_json: JSON.stringify(entityRefs), task_id: text(input.task_id, 100) || null,
    command_id: text(input.command_id, 100) || null, summary: text(input.summary, 600),
    risk_class: input.risk_class, result_status: text(input.result_status, 80),
    verification_status: text(input.verification_status, 80), provenance_ref: text(input.provenance_ref, 240),
    supersedes_event_id: text(input.supersedes_event_id, 100) || null, metadata_json: JSON.stringify(metadata),
  };
  if (Object.values(record).some(v => typeof v === 'string' && containsSecret(v))) throw new Error('secret_material_rejected');
  return record;
}

export async function appendEvent(db, input) {
  const event = await normalizeEvent(input);
  const prior = await db.prepare('SELECT event_id,summary,metadata_json FROM memory_events WHERE event_id=? OR (source_type=? AND source_ref=? AND event_type=?) LIMIT 1')
    .bind(event.event_id,event.source_type,event.source_ref,event.event_type).first();
  if (prior) {
    if (prior.event_id !== event.event_id || prior.summary !== event.summary || prior.metadata_json !== event.metadata_json) throw new Error('event_identity_conflict');
    return { event_id: event.event_id, duplicate: true };
  }
  const inserted = await db.prepare(`INSERT OR IGNORE INTO memory_events(event_id,event_type,occurred_at,source_type,source_ref,actor,scope,company,entity_refs_json,task_id,command_id,summary,risk_class,result_status,verification_status,provenance_ref,supersedes_event_id,metadata_json)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(event.event_id,event.event_type,event.occurred_at,event.source_type,event.source_ref,event.actor,event.scope,event.company,event.entity_refs_json,event.task_id,event.command_id,event.summary,event.risk_class,event.result_status,event.verification_status,event.provenance_ref,event.supersedes_event_id,event.metadata_json).run();
  const stored = await db.prepare('SELECT event_id,summary,metadata_json FROM memory_events WHERE event_id=? OR (source_type=? AND source_ref=? AND event_type=?) LIMIT 1')
    .bind(event.event_id,event.source_type,event.source_ref,event.event_type).first();
  if (!stored || stored.event_id !== event.event_id || stored.summary !== event.summary || stored.metadata_json !== event.metadata_json) throw new Error('event_identity_conflict');
  return { event_id: event.event_id, duplicate: Number(inserted?.meta?.changes ?? inserted?.changes ?? 1) === 0 };
}

export async function linkObject(db, type, canonicalRef, scope, eventId, supersedes = null) {
  if (!TYPES.has(type)) throw new Error('object_type_invalid');
  const key = `obj:${(await sha256(`${type}|${canonicalRef}`)).slice(0, 40)}`;
  await db.prepare(`INSERT OR IGNORE INTO memory_objects(object_key,object_type,canonical_ref,scope,source_event_id,supersedes_object_key) VALUES(?,?,?,?,?,?)`)
    .bind(key,type,text(canonicalRef,240),text(scope,120),eventId,supersedes).run();
  return key;
}

async function quality(db, objectKey, { confidence, freshness, validFrom, scope, authority, verifiedAt, provenance }) {
  await db.prepare(`INSERT OR IGNORE INTO memory_quality
    (object_key,confidence,freshness,valid_from,scope,source_authority,last_verified_at,provenance_ref)
    VALUES(?,?,?,?,?,?,?,?)`).bind(objectKey,confidence,freshness,validFrom,scope,authority,verifiedAt,provenance).run();
}

export async function ingestVerifiedResult(db, input) {
  if (input.result_status !== 'completed_verified' || input.verification_status !== 'read_back_verified' || !input.provenance_ref || !input.task_id)
    throw new Error('verified_result_proof_required');
  const result = await appendEvent(db, { ...input, event_type: 'task_result_verified' });
  const task = await linkObject(db,'TASK',input.task_id,input.scope,result.event_id);
  const output = await linkObject(db,'RESULT',`${input.task_id}:result`,input.scope,result.event_id);
  const verification = await linkObject(db,'VERIFICATION',`${input.task_id}:verification`,input.scope,result.event_id);
  for (const objectKey of [task,output,verification]) await quality(db,objectKey,{ confidence:0.99,freshness:'historical_verified',validFrom:input.occurred_at,
    scope:input.scope,authority:input.source_type,verifiedAt:input.occurred_at,provenance:input.provenance_ref });
  return result;
}

export async function ingestRuleCandidate(db, input) {
  if (!input.user_correction_ref) throw new Error('user_correction_provenance_required');
  let verifiedSource = null;
  if (input.verified_event_id) {
    verifiedSource = await db.prepare(`SELECT source_type,source_ref FROM memory_events WHERE event_id=? AND verification_status='read_back_verified' AND result_status='completed_verified'`).bind(input.verified_event_id).first();
    if (!verifiedSource) throw new Error('verified_event_not_found');
  }
  const category = text(input.category || 'MARKET', 80);
  const subject = text(input.subject || `${input.scope} çay gideri`, 160);
  const event = await appendEvent(db, { ...input, event_type: 'user_rule_correction', source_type: 'user_correction', source_ref: input.user_correction_ref,
    risk_class: 'READ', result_status: 'candidate', verification_status: verifiedSource ? 'corroborated' : 'awaiting_source',
    provenance_ref: input.user_correction_ref, summary: input.summary || 'Çay gideri kategorisi MARKET olarak düzeltildi.' });
  const ruleObject = await linkObject(db,'RULE',`${subject}:expense_category→${category}`,input.scope,event.event_id);
  const fact = await recordFact(db, { subject, predicate: 'expense_category', object_value: category, scope: input.scope,
    source_key: `user-correction:${input.user_correction_ref}`, source_type: 'user_correction', source_ref: input.user_correction_ref,
    authority: 'user_correction', event_id: event.event_id, observed_at: input.occurred_at });
  const factObject = await linkObject(db,'FACT',fact.fact_key,input.scope,event.event_id);
  for (const objectKey of [ruleObject,factObject]) await quality(db,objectKey,{ confidence:1,freshness:'current',validFrom:input.occurred_at,
    scope:input.scope,authority:'user_correction',verifiedAt:verifiedSource?input.occurred_at:null,provenance:input.user_correction_ref });
  if (verifiedSource) {
    const sourceKey = `${verifiedSource.source_type}:${verifiedSource.source_ref}`;
    await db.prepare(`INSERT OR IGNORE INTO memory_sources(source_key,source_type,source_date,content_hash,adapter_status) VALUES(?,?,?,?,?)`)
      .bind(sourceKey,verifiedSource.source_type,input.occurred_at,await sha256(`${verifiedSource.source_type}|${verifiedSource.source_ref}`),'verified').run();
    await db.prepare(`INSERT OR IGNORE INTO memory_fact_sources(fact_id,source_id) SELECT f.id,s.id FROM memory_facts f,memory_sources s WHERE f.fact_key=? AND s.source_key=?`)
      .bind(fact.fact_key,sourceKey).run();
  }
  return event;
}

export async function recordFact(db, input) {
  for (const field of ['subject','predicate','object_value','scope','source_key','source_type','source_ref','authority'])
    if (!text(input[field])) throw new Error(`fact_${field}_required`);
  if (Object.values(input).some(v => typeof v === 'string' && containsSecret(v))) throw new Error('secret_material_rejected');
  const sourceHash = await sha256(`${input.source_type}|${input.source_ref}`);
  await db.prepare(`INSERT OR IGNORE INTO memory_sources(source_key,source_type,source_date,content_hash,adapter_status) VALUES(?,?,?,?,?)`)
    .bind(input.source_key,input.source_type,input.observed_at||new Date().toISOString(),sourceHash,'verified').run();
  const key = `fact:${(await sha256(`${normalize(input.scope)}|${normalize(input.subject)}|${normalize(input.predicate)}|${normalize(input.object_value)}`)).slice(0,40)}`;
  const same = await db.prepare('SELECT id,status FROM memory_facts WHERE fact_key=?').bind(key).first();
  if (same) {
    await db.prepare(`INSERT OR IGNORE INTO memory_fact_sources(fact_id,source_id) SELECT ?,id FROM memory_sources WHERE source_key=?`).bind(same.id,input.source_key).run();
    return { fact_key: key, duplicate: true };
  }
  const active = await db.prepare(`SELECT id,fact_key,object_value FROM memory_facts WHERE subject=? AND predicate=? AND scope=? AND status='active'`)
    .bind(input.subject,input.predicate,input.scope).all();
  const alternatives = (active.results||[]).filter(row => normalize(row.object_value)!==normalize(input.object_value));
  const correction = input.authority === 'user_correction' || (input.authority === 'verified_document_version' && input.subject.startsWith('Drive document '));
  const status = alternatives.length && !correction ? 'needs_review' : 'active';
  await db.prepare(`INSERT INTO memory_facts(fact_key,subject,predicate,object_value,scope,valid_from,confidence,status,authority,supersedes_fact_id)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(key,input.subject,input.predicate,input.object_value,input.scope,input.observed_at||new Date().toISOString(),correction?1:0.9,status,input.authority,correction&&alternatives.length?alternatives[0].id:null).run();
  const created = await db.prepare('SELECT id FROM memory_facts WHERE fact_key=?').bind(key).first();
  await db.prepare(`INSERT OR IGNORE INTO memory_fact_sources(fact_id,source_id) SELECT ?,id FROM memory_sources WHERE source_key=?`).bind(created.id,input.source_key).run();
  for (const old of alternatives) {
    if (correction) await db.prepare(`UPDATE memory_facts SET status='superseded',valid_to=?,superseded_by_fact_id=? WHERE id=? AND status='active'`)
      .bind(input.observed_at||new Date().toISOString(),created.id,old.id).run();
    else {
      const conflictKey = `conflict:${(await sha256([old.fact_key,key].sort().join('|'))).slice(0,40)}`;
      await db.prepare(`INSERT OR IGNORE INTO memory_conflicts(conflict_key,subject,predicate,fact_a_id,fact_b_id) VALUES(?,?,?,?,?)`)
        .bind(conflictKey,input.subject,input.predicate,old.id,created.id).run();
    }
  }
  return { fact_key: key, duplicate: false, status };
}

export async function upsertEntity(db, input) {
  const allowed = new Set(['person','company','customer','supplier','bank','cash_account','bank_account','document','invoice','expense','shipment','contract','project','application','device']);
  if (!allowed.has(input.entity_type) || !input.provenance_ref) throw new Error('entity_invalid');
  const entityId = input.entity_id || `entity:${(await sha256(`${input.entity_type}|${normalize(input.scope)}|${normalize(input.canonical_name)}`)).slice(0,40)}`;
  await db.prepare('INSERT OR IGNORE INTO memory_entities(entity_id,entity_type,canonical_name,scope,external_ref,provenance_ref) VALUES(?,?,?,?,?,?)')
    .bind(entityId,input.entity_type,text(input.canonical_name,160),text(input.scope,120),text(input.external_ref,160)||null,text(input.provenance_ref,240)).run();
  return entityId;
}

export async function linkEntities(db, input) {
  const relationId = input.relation_id || `rel:${(await sha256(`${input.subject_entity_id}|${input.predicate}|${input.object_entity_id}|${input.valid_from||''}`)).slice(0,40)}`;
  await db.prepare('INSERT OR IGNORE INTO memory_entity_relations(relation_id,subject_entity_id,predicate,object_entity_id,valid_from,source_event_id,provenance_ref) VALUES(?,?,?,?,?,?,?)')
    .bind(relationId,input.subject_entity_id,text(input.predicate,80),input.object_entity_id,input.valid_from||null,input.source_event_id||null,input.provenance_ref).run();
  return relationId;
}

export async function mapDriveDocument(db, input) {
  if (!input.drive_file_id || !input.version_hash || !input.provenance_ref) throw new Error('document_provenance_required');
  const documentId = input.document_id || `doc:${(await sha256(`${input.drive_file_id}|${input.version_hash}`)).slice(0,40)}`;
  const entities = Array.isArray(input.related_entities) ? input.related_entities.slice(0,20) : [];
  const facts = Array.isArray(input.extracted_fact_keys) ? input.extracted_fact_keys.slice(0,30) : [];
  await db.prepare('INSERT OR IGNORE INTO memory_documents(document_id,drive_file_id,canonical_name,version_hash,document_type,document_date,related_entities_json,summary,extracted_fact_keys_json,provenance_ref) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .bind(documentId,text(input.drive_file_id,160),text(input.canonical_name,240),text(input.version_hash,160),text(input.document_type,80),input.document_date||null,JSON.stringify(entities),text(input.summary,600)||null,JSON.stringify(facts),text(input.provenance_ref,240)).run();
  return documentId;
}

export async function ingestDriveChange(db, input) {
  const fileId = text(input?.drive_file_id,160);
  const versionHash = text(input?.version_hash,160);
  const name = text(input?.canonical_name,240);
  const modifiedAt = text(input?.modified_at,80);
  if (!fileId || !/^[a-f0-9]{64}$/.test(versionHash) || !name || !Number.isFinite(Date.parse(modifiedAt))) throw new Error('drive_change_invalid');
  if ([fileId,name,input?.acceptance_code].some(value => containsSecret(String(value || '')))) throw new Error('secret_material_rejected');
  const code = text(input.acceptance_code,80);
  if (code && !/^APN-MEM-[0-9]{8}(?:-V[0-9]+)?$/.test(code)) throw new Error('drive_code_invalid');
  const sourceKey = `drive:${fileId}`;
  const versionKey = `${sourceKey}:${versionHash}`;
  const prior = await db.prepare('SELECT document_id,version_hash FROM memory_documents WHERE drive_file_id=? AND superseded_by IS NULL ORDER BY created_at DESC LIMIT 1').bind(fileId).first();
  if (prior?.version_hash === versionHash) return { document_id: prior.document_id, duplicate: true };
  const summary = code ? `ApeirON kalıcı hafıza kabul kodu: ${code}` : 'ApeirON belge sürümü gözlendi.';
  const event = await appendEvent(db, { event_type: 'drive_document_version', occurred_at: modifiedAt,
    source_type: 'google_drive', source_ref: versionKey, actor: 'Google Drive watcher', scope: 'ApeirON',
    summary, risk_class: 'READ', result_status: 'observed', verification_status: code ? 'source_content_verified' : 'source_metadata_verified',
    provenance_ref: versionKey, supersedes_event_id: prior ? (await db.prepare('SELECT source_event_id FROM memory_objects WHERE object_type=? AND canonical_ref=?').bind('DOCUMENT',prior.document_id).first())?.source_event_id : null,
    metadata: { drive_file_id: fileId, version_hash: versionHash, ...(code ? { acceptance_code: code } : {}) } });
  const documentId = await mapDriveDocument(db, { drive_file_id: fileId, version_hash: versionHash, canonical_name: name,
    document_type: text(input.document_type,100) || 'application/octet-stream', document_date: modifiedAt,
    summary, provenance_ref: versionKey });
  if (prior && prior.document_id !== documentId) await db.prepare('UPDATE memory_documents SET superseded_by=? WHERE document_id=? AND superseded_by IS NULL').bind(documentId,prior.document_id).run();
  const documentObject = await linkObject(db,'DOCUMENT',documentId,'ApeirON',event.event_id);
  await quality(db,documentObject,{ confidence:code?0.95:0.65,freshness:code?'current':'unknown',validFrom:modifiedAt,
    scope:'ApeirON',authority:code?'source_content_verified':'source_metadata_verified',verifiedAt:code?modifiedAt:null,provenance:versionKey });
  const sourceHash = await sha256(`google_drive|${fileId}`);
  await db.prepare('INSERT OR IGNORE INTO memory_sources(source_key,source_type,source_date,content_hash,adapter_status) VALUES(?,?,?,?,?)')
    .bind(sourceKey,'google_drive',modifiedAt,sourceHash,'verified').run();
  await db.prepare('INSERT INTO memory_sync_state(source_key,cursor,content_hash,checkpoint_json,status,last_synced_at,last_error) VALUES(?,?,?,?,?,datetime(\'now\'),NULL) ON CONFLICT(source_key) DO UPDATE SET cursor=excluded.cursor,content_hash=excluded.content_hash,checkpoint_json=excluded.checkpoint_json,status=excluded.status,last_synced_at=excluded.last_synced_at,last_error=NULL')
    .bind(sourceKey,text(input.cursor,240)||null,versionHash,JSON.stringify({ document_id: documentId }),'synced').run();
  if (code) await recordFact(db, { subject: `Drive document ${fileId}`, predicate: 'acceptance_code', object_value: code, scope: 'ApeirON',
    source_key: versionKey, source_type: 'google_drive', source_ref: versionKey, authority: 'verified_document_version', observed_at: modifiedAt });
  return { document_id: documentId, event_id: event.event_id, duplicate: event.duplicate };
}
