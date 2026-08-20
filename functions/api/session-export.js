import { authorized } from './session-checkpoint.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  if (!await authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  try {
    const [checkpoints, facts, relations, objectives, workItems] = await env.APERION_DB.batch([
      env.APERION_DB.prepare('SELECT checkpoint_key,session_ref,summary,completed_json,pending_json,blockers_json,next_action,evidence_refs_json,created_at FROM session_checkpoints ORDER BY created_at DESC LIMIT 200'),
      env.APERION_DB.prepare("SELECT fact_key,subject_type,subject_ref,predicate,value_json,truth_state,source_ref,observed_at,valid_until,status FROM current_state_facts WHERE status='active' ORDER BY observed_at DESC LIMIT 1000"),
      env.APERION_DB.prepare("SELECT from_type,from_ref,relation_type,to_type,to_ref,evidence_ref,confidence,valid_from,valid_until,status FROM memory_relations WHERE status='active' LIMIT 1000"),
      env.APERION_DB.prepare("SELECT objective_key,title,desired_outcome,status,priority,target_date FROM objectives WHERE status NOT IN ('completed','cancelled') ORDER BY priority DESC LIMIT 200"),
      env.APERION_DB.prepare("SELECT work_key,action_type,title,owner,due_at,status,approval_required FROM work_items WHERE status NOT IN ('completed','cancelled') ORDER BY due_at LIMIT 500"),
    ]);
    return json({
      ok: true,
      protocol: 'aperion-portable-memory-v1',
      generated_at: new Date().toISOString(),
      privacy: 'structured_state_only_no_raw_chat',
      checkpoints: checkpoints.results || [],
      current_state_facts: facts.results || [],
      memory_relations: relations.results || [],
      objectives: objectives.results || [],
      work_items: workItems.results || [],
    });
  } catch (error) {
    return json({ ok: false, error: 'memory_export_failed', message: error.message }, 500);
  }
}
