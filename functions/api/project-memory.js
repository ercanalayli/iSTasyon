import { authorized } from './session-checkpoint.js';
import { appendEvent, ingestVerifiedResult, ingestCodexEnvelope, ingestRuleCandidate, upsertEntity, linkEntities, mapDriveDocument, ingestDriveChange } from '../shared/memory-event-ledger.js';

function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
function clean(value) { return String(value || '').trim().slice(0, 200); }

export async function onRequestPost({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  if (!await authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  try {
    if (Number(request.headers.get('content-length') || 0) > 32768) return json({ ok: false, error: 'body_too_large' }, 413);
    const body = await request.json();
    if (JSON.stringify(body).length > 32768) return json({ ok: false, error: 'body_too_large' }, 413);
    const kind = clean(body.kind);
    let result;
    if (kind === 'verified_result') result = await ingestVerifiedResult(env.APERION_DB, body.event);
    else if (kind === 'codex_result_envelope') {
      result = await ingestCodexEnvelope(env.APERION_DB, body.envelope);
      try {
        await env.APERION_DB.prepare(`INSERT INTO source_health(source_key,status,error_code,message,last_success_at,checked_at,evidence_ref)
          VALUES('codex_result_ingest','ok','OK',NULL,datetime('now'),datetime('now'),'codex_result_envelope')
          ON CONFLICT(source_key) DO UPDATE SET status=excluded.status,error_code=excluded.error_code,
            last_success_at=excluded.last_success_at,checked_at=excluded.checked_at,evidence_ref=excluded.evidence_ref`).run();
      } catch { /* A health probe must never turn a committed envelope into a failed response. */ }
    }
    else if (kind === 'rule_candidate') result = await ingestRuleCandidate(env.APERION_DB, body.event);
    else if (kind === 'event') result = await appendEvent(env.APERION_DB, body.event);
    else if (kind === 'entity') result = { entity_id: await upsertEntity(env.APERION_DB, body.entity) };
    else if (kind === 'relation') result = { relation_id: await linkEntities(env.APERION_DB, body.relation) };
    else if (kind === 'drive_document') result = { document_id: await mapDriveDocument(env.APERION_DB, body.document) };
    else if (kind === 'drive_change') result = await ingestDriveChange(env.APERION_DB, body.document);
    else if (kind === 'source_health') {
      const source=body.health?.source_key;
      const status=body.health?.status;
      const checkedAt=body.health?.checked_at;
      if (!['gmail','google_drive'].includes(source) || !['ok','blocked'].includes(status) || !Number.isFinite(Date.parse(checkedAt))) throw new Error('invalid_source_health');
      await env.APERION_DB.prepare(`INSERT INTO source_health(source_key,status,error_code,message,last_success_at,checked_at,evidence_ref)
        VALUES(?,?,?,NULL,?,?,'unified_google_watchers')
        ON CONFLICT(source_key) DO UPDATE SET status=excluded.status,error_code=excluded.error_code,
          last_success_at=COALESCE(excluded.last_success_at,source_health.last_success_at),checked_at=excluded.checked_at,evidence_ref=excluded.evidence_ref`)
        .bind(source,status,status==='ok'?'OK':'WATCHER_FAILED',status==='ok'?checkedAt:null,checkedAt).run();
      result={source_key:source,status};
    }
    else return json({ ok: false, error: 'kind_not_allowed' }, 400);
    return json({ ok: true, ...result });
  } catch (error) { return json({ ok: false, error: String(error.message || error).slice(0, 100) }, 400); }
}

export async function onRequestGet({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  if (!await authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  const url = new URL(request.url);
  const subject = clean(url.searchParams.get('subject'));
  const predicate = clean(url.searchParams.get('predicate'));
  const mode = clean(url.searchParams.get('view') || 'context');
  const ref = clean(url.searchParams.get('ref'));
  const from = clean(url.searchParams.get('from'));
  const to = clean(url.searchParams.get('to'));
  const likeSubject = `%${subject}%`, likePredicate = `%${predicate}%`;
  try {
    if (mode === 'ledger') {
      const result = await env.APERION_DB.prepare(`SELECT event_id,event_type,occurred_at,recorded_at,source_type,source_ref,actor,scope,company,entity_refs_json,task_id,command_id,summary,risk_class,result_status,verification_status,provenance_ref,supersedes_event_id,metadata_json
        FROM memory_events WHERE (?='' OR source_ref=? OR task_id=? OR command_id=? OR json_extract(metadata_json,'$.document_no')=?) AND (?='' OR occurred_at>=?) AND (?='' OR occurred_at<=?) ORDER BY occurred_at DESC LIMIT 200`)
        .bind(ref,ref,ref,ref,ref,from,from,to,to).all();
      return json({ ok: true, view: 'ledger', rows: result.results || [] });
    }
    if (mode === 'executions') {
      const result = await env.APERION_DB.prepare(`SELECT * FROM memory_executions WHERE (?='' OR execution_id=? OR task_type=? OR company=?) ORDER BY occurred_at DESC LIMIT 100`).bind(ref,ref,ref,ref).all();
      return json({ ok:true, view:'executions', rows:result.results || [] });
    }
    if (mode === 'candidates') {
      const result = await env.APERION_DB.prepare(`SELECT * FROM memory_document_candidates WHERE (?='' OR document_id=? OR status=?) ORDER BY created_at DESC LIMIT 100`).bind(ref,ref,ref).all();
      return json({ ok:true, view:'candidates', rows:result.results || [] });
    }
    if (mode === 'entities') {
      const result = await env.APERION_DB.prepare(`SELECT e.*,r.predicate,o.entity_id AS related_id,o.canonical_name AS related_name,r.provenance_ref AS relation_provenance
        FROM memory_entities e LEFT JOIN memory_entity_relations r ON r.subject_entity_id=e.entity_id AND r.superseded_by IS NULL
        LEFT JOIN memory_entities o ON o.entity_id=r.object_entity_id WHERE (?='' OR e.entity_id=? OR e.canonical_name LIKE ?) ORDER BY e.canonical_name LIMIT 200`)
        .bind(ref,ref,`%${ref}%`).all();
      return json({ ok: true, view: 'entities', rows: result.results || [] });
    }
    if (mode === 'documents') {
      const result = await env.APERION_DB.prepare(`SELECT * FROM memory_documents WHERE (?='' OR document_id=? OR drive_file_id=? OR canonical_name LIKE ?) ORDER BY document_date DESC LIMIT 200`)
        .bind(ref,ref,ref,`%${ref}%`).all();
      return json({ ok: true, view: 'documents', rows: result.results || [] });
    }
    if (mode === 'decisions') {
      const history = await env.APERION_DB.prepare(`SELECT d.*,s.source_key FROM memory_decisions d JOIN memory_sources s ON s.id=d.source_id WHERE (?='' OR d.scope LIKE ? OR d.decision LIKE ?) ORDER BY d.effective_date DESC,d.updated_at DESC LIMIT 200`).bind(subject,likeSubject,likeSubject).all();
      return json({ok:true,view:'decisions',rows:history.results||[]});
    }
    const queries = {
      facts: env.APERION_DB.prepare(`SELECT f.*,group_concat(s.source_key) AS source_keys FROM memory_facts f LEFT JOIN memory_fact_sources fs ON fs.fact_id=f.id LEFT JOIN memory_sources s ON s.id=fs.source_id WHERE f.status IN ('active','needs_review') AND (?='' OR f.subject ${subject.length > 30 ? '=' : 'LIKE'} ?) AND (?='' OR f.predicate LIKE ?) GROUP BY f.id ORDER BY f.last_seen DESC LIMIT 200`).bind(subject,subject.length > 30 ? subject : likeSubject,predicate,likePredicate),
      decisions: env.APERION_DB.prepare(`SELECT d.*,s.source_key FROM memory_decisions d JOIN memory_sources s ON s.id=d.source_id WHERE d.status='active' AND (?='' OR d.scope LIKE ? OR d.decision LIKE ?) ORDER BY d.effective_date DESC LIMIT 100`).bind(subject,likeSubject,likeSubject),
      conflicts: env.APERION_DB.prepare(`SELECT c.*,a.fact_key AS fact_a_key,b.fact_key AS fact_b_key FROM memory_conflicts c JOIN memory_facts a ON a.id=c.fact_a_id JOIN memory_facts b ON b.id=c.fact_b_id WHERE c.status='needs_review' ORDER BY c.created_at DESC LIMIT 100`),
      sources: env.APERION_DB.prepare(`SELECT source_key,source_type,project_ref,conversation_ref,session_ref,file_path,source_date,content_hash,last_synced_at,adapter_status FROM memory_sources ORDER BY last_synced_at DESC LIMIT 200`),
      sync: env.APERION_DB.prepare(`SELECT source_key,cursor,content_hash,status,last_synced_at,last_error FROM memory_sync_state ORDER BY last_synced_at DESC LIMIT 200`),
    };
    if (queries[mode] && mode !== 'context') { const result=await queries[mode].all(); return json({ok:true,view:mode,rows:result.results||[]}); }
    const [facts,decisions,conflicts,sources,sync]=await Promise.all(Object.values(queries).map(q=>q.all()));
    return json({ok:true,view:'context',query:{subject,predicate},active_facts:facts.results||[],active_decisions:decisions.results||[],open_conflicts:conflicts.results||[],sources:sources.results||[],sync_state:sync.results||[]});
  } catch (error) { return json({ok:false,error:'project_memory_schema_not_ready',message:String(error.message||error).slice(0,200)},503); }
}
