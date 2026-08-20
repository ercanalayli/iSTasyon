import { authorized } from './session-checkpoint.js';
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function parseJson(value,fallback=[]){try{return value?JSON.parse(value):fallback}catch{return fallback}}
function normalizeCheckpoint(row){return row?{...row,completed:parseJson(row.completed_json),pending:parseJson(row.pending_json),blockers:parseJson(row.blockers_json),evidence_refs:parseJson(row.evidence_refs_json)}:null}
export async function onRequestGet({request,env}){
  if(!env.APERION_DB)return json({ok:false,error:'missing_d1_binding'},503);
  if(!await authorized(request,env))return json({ok:false,error:'unauthorized'},401);
  try{
    const [checkpoint,objectives,work,approvals,commitments,health,connectors,memoryCounts,lastSnapshot]=await env.APERION_DB.batch([
      env.APERION_DB.prepare('SELECT * FROM session_checkpoints ORDER BY created_at DESC LIMIT 1'),
      env.APERION_DB.prepare("SELECT objective_key,title,desired_outcome,status,priority,target_date FROM objectives WHERE status IN ('active','at_risk','blocked') ORDER BY priority DESC,target_date LIMIT 10"),
      env.APERION_DB.prepare("SELECT work_key,action_type,title,owner,due_at,status,approval_required FROM work_items WHERE status NOT IN ('completed','cancelled') ORDER BY due_at LIMIT 20"),
      env.APERION_DB.prepare("SELECT id,item_type AS action_type,status,created_at FROM approval_queue WHERE status IN ('needs_review','pending') ORDER BY created_at LIMIT 20"),
      env.APERION_DB.prepare("SELECT commitment_key,commitment_type,title,due_at,expected_at,status,priority,time_bucket FROM commitment_timeline WHERE time_bucket IN ('overdue','approaching','upcoming') ORDER BY CASE time_bucket WHEN 'overdue' THEN 1 WHEN 'approaching' THEN 2 ELSE 3 END,COALESCE(due_at,expected_at) LIMIT 30"),
      env.APERION_DB.prepare('SELECT source_key,status,error_code,last_success_at,checked_at FROM source_health ORDER BY source_key'),
      env.APERION_DB.prepare('SELECT connector_key,title,maturity,status FROM connector_registry ORDER BY title'),
      env.APERION_DB.prepare('SELECT (SELECT COUNT(*) FROM session_checkpoints) AS checkpoints,(SELECT COUNT(*) FROM current_state_facts WHERE status=\'active\') AS active_facts,(SELECT COUNT(*) FROM working_state_snapshots) AS snapshots'),
      env.APERION_DB.prepare('SELECT snapshot_key,state_json,next_action,evidence_refs_json,created_at FROM working_state_snapshots ORDER BY created_at DESC LIMIT 1')
    ]);
    const checkpointRow=normalizeCheckpoint(checkpoint.results?.[0]||null);
    const snapshot=lastSnapshot.results?.[0]||null;
    return json({ok:true,protocol:'aperion-session-bootstrap-v2',generated_at:new Date().toISOString(),context_policy:{raw_chat_loaded:false,recent_turn_limit:8,structured_memory:true},memory_status:memoryCounts.results?.[0]||{},last_checkpoint:checkpointRow,last_working_state:snapshot?{...snapshot,state:parseJson(snapshot.state_json,{}),evidence_refs:parseJson(snapshot.evidence_refs_json)}:null,objectives:objectives.results||[],work_items:work.results||[],pending_approvals:approvals.results||[],commitments:commitments.results||[],source_health:health.results||[],connectors:connectors.results||[]});
  }catch(error){return json({ok:false,error:'bootstrap_not_ready',message:error.message},503)}
}
