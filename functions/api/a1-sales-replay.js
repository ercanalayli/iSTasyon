function json(value,status=200){
  return new Response(JSON.stringify(value),{
    status,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
  });
}
function authorized(request,env){
  const configured=String(env.APERION_BRIDGE_SECRET||'');
  const supplied=String(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  return configured.length>=32&&supplied===configured;
}
const LIVE_URL='https://script.google.com/macros/s/AKfycbzm567JGBoRpHX-Sjxr0NKfpzckCEcNcSIiyqUHoND7M734kSk4_TdYFq9RBEzlottUPA/exec';
export async function onRequestPost({request,env}){
  if(!authorized(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!env.APERION_DB)return json({ok:false,error:'missing_d1_binding'},503);
  try{
    const body=await request.json().catch(()=>({}));
    const limit=Math.max(1,Math.min(500,Number(body.limit)||100));
    const rs=await env.APERION_DB.prepare(
      `SELECT event_key,received_at,payload_json
         FROM canonical_events
        WHERE event_type='sale.invoice' AND truth_state='confirmed'
        ORDER BY received_at DESC,event_key DESC LIMIT ?`
    ).bind(limit).all();
    const records=[];
    for(const row of rs.results||[]){
      try{
        const sale=JSON.parse(row.payload_json||'{}');
        records.push({...sale,event_key:String(row.event_key),received_at:String(row.received_at||'')});
      }catch{}
    }
    if(!records.length)return json({ok:true,replayed:0,appended:0,duplicates:0});
    const response=await fetch(LIVE_URL,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({action:'bizimhesap_sales',records}),
      signal:AbortSignal.timeout(45000)
    });
    const text=await response.text();
    let result={};
    try{result=JSON.parse(text||'{}');}catch{result={ok:false,error:'invalid_sheet_response'};}
    if(!response.ok||result.ok!==true){
      return json({ok:false,error:'sheet_replay_failed',sheet_status:response.status,detail:String(result.error||text).slice(0,180)},502);
    }
    return json({
      ok:true,
      replayed:records.length,
      appended:Number(result.appended||0),
      duplicates:Number(result.duplicates||0),
      sheet:String(result.sheet||'BIZIMHESAP_CANLI_SATIS')
    });
  }catch(error){
    return json({ok:false,error:'replay_failure',message:String(error?.message||error).slice(0,180)},500);
  }
}
