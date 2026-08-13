function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
export async function onRequestGet({env}){
  if(!env.APERION_DB)return json({ok:false,error:'missing_d1_binding'},503);
  try{
    const [checkpoint,objectives,work,approvals,commitments,health,connectors]=await env.APERION_DB.batch([
      env.APERION_DB.prepare('SELECT * FROM session_checkpoints ORDER BY created_at DESC LIMIT 1'),
      env.APERION_DB.prepare("SELECT objective_key,title,desired_outcome,status,priority,target_date FROM objectives WHERE status IN ('active','at_risk','blocked') ORDER BY priority DESC,target_date LIMIT 10"),
      env.APERION_DB.prepare("SELECT work_key,action_type,title,owner,due_at,status,approval_required FROM work_items WHERE status NOT IN ('completed','cancelled') ORDER BY due_at LIMIT 20"),
      env.APERION_DB.prepare("SELECT id,action_type,status,created_at FROM approval_queue WHERE status='pending' ORDER BY created_at LIMIT 20"),
      env.APERION_DB.prepare("SELECT commitment_key,commitment_type,title,due_at,expected_at,status,priority,time_bucket FROM commitment_timeline WHERE time_bucket IN ('overdue','approaching','upcoming') ORDER BY CASE time_bucket WHEN 'overdue' THEN 1 WHEN 'approaching' THEN 2 ELSE 3 END,COALESCE(due_at,expected_at) LIMIT 30"),
      env.APERION_DB.prepare('SELECT source_key,status,error_code,last_success_at,checked_at FROM source_health ORDER BY source_key'),
      env.APERION_DB.prepare('SELECT connector_key,title,maturity,status FROM connector_registry ORDER BY title')
    ]);
    return json({ok:true,protocol:'aperion-session-bootstrap-v1',generated_at:new Date().toISOString(),last_checkpoint:checkpoint.results?.[0]||null,objectives:objectives.results||[],work_items:work.results||[],pending_approvals:approvals.results||[],commitments:commitments.results||[],source_health:health.results||[],connectors:connectors.results||[]});
  }catch(error){return json({ok:false,error:'bootstrap_not_ready',message:error.message},503)}
}

