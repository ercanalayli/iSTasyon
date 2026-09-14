import { authorized } from './session-checkpoint.js';

function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
function clean(value) { return String(value || '').trim().slice(0, 200); }

export async function onRequestGet({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  if (!await authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  const url = new URL(request.url);
  const subject = clean(url.searchParams.get('subject'));
  const predicate = clean(url.searchParams.get('predicate'));
  const mode = clean(url.searchParams.get('view') || 'context');
  const likeSubject = `%${subject}%`, likePredicate = `%${predicate}%`;
  try {
    if (mode === 'decisions') {
      const history = await env.APERION_DB.prepare(`SELECT d.*,s.source_key FROM memory_decisions d JOIN memory_sources s ON s.id=d.source_id WHERE (?='' OR d.scope LIKE ? OR d.decision LIKE ?) ORDER BY d.effective_date DESC,d.updated_at DESC LIMIT 200`).bind(subject,likeSubject,likeSubject).all();
      return json({ok:true,view:'decisions',rows:history.results||[]});
    }
    const queries = {
      facts: env.APERION_DB.prepare(`SELECT f.*,group_concat(s.source_key) AS source_keys FROM memory_facts f LEFT JOIN memory_fact_sources fs ON fs.fact_id=f.id LEFT JOIN memory_sources s ON s.id=fs.source_id WHERE f.status IN ('active','needs_review') AND (?='' OR f.subject LIKE ?) AND (?='' OR f.predicate LIKE ?) GROUP BY f.id ORDER BY f.last_seen DESC LIMIT 200`).bind(subject,likeSubject,predicate,likePredicate),
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
