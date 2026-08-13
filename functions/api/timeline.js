function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
export async function onRequestGet({env,request}){
  if(!env.APERION_DB)return json({ok:false,error:'missing_d1_binding'},503);
  const url=new URL(request.url); const bucket=url.searchParams.get('bucket');
  try{
    const sql=`SELECT commitment_key,commitment_type,title,counterparty,owner,amount,currency,due_at,expected_at,status,priority,truth_state,next_action,time_bucket
      FROM commitment_timeline ${bucket?'WHERE time_bucket=?':''}
      ORDER BY CASE time_bucket WHEN 'overdue' THEN 1 WHEN 'approaching' THEN 2 WHEN 'upcoming' THEN 3 ELSE 4 END,COALESCE(due_at,expected_at) LIMIT 200`;
    const q=env.APERION_DB.prepare(sql); const rows=bucket?await q.bind(bucket).all():await q.all();
    const summary=await env.APERION_DB.prepare('SELECT * FROM morning_commitment_brief').all();
    return json({ok:true,generated_at:new Date().toISOString(),items:rows.results||[],summary:summary.results||[]});
  }catch(error){return json({ok:false,error:'timeline_not_ready',message:error.message},503)}
}
