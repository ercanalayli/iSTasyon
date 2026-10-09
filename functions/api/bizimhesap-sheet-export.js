// AperiON | Authenticated, read-only BizimHesap event export for the Google Sheets mirror.
// It never posts to BizimHesap and it does not expose data without APERION_BRIDGE_SECRET.
function json(value,status=200) {
  return new Response(JSON.stringify(value),{
    status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}
  });
}
function authorized(request,env) {
  const secret=env.APERION_BRIDGE_SECRET;
  const header=request.headers.get('authorization')||'';
  return Boolean(secret && header===`Bearer ${secret}`);
}
function cursorFrom(text) {
  if(!text) return ['', ''];
  if(text.length>1200) throw new Error('cursor_too_long');
  const a=JSON.parse(text);
  if(!Array.isArray(a)||a.length!==2||a.some(v=>typeof v!=='string'||v.length>600)) {
    throw new Error('invalid_cursor');
  }
  return a;
}
export async function onRequestGet({request,env}) {
  if(!authorized(request,env)) return json({ok:false,error:'unauthorized'},401);
  if(!env.APERION_DB) return json({ok:false,error:'missing_d1_binding'},503);
  try {
    const url=new URL(request.url);
    const limit=Math.max(1,Math.min(250,Number(url.searchParams.get('limit'))||150));
    const [lastTime,lastKey]=cursorFrom(url.searchParams.get('cursor'));
    const rs=await env.APERION_DB.prepare(
      `SELECT e.event_key,e.event_type,e.external_ref,e.occurred_at,
              e.received_at,e.truth_state,e.payload_json,e.evidence_ref,e.content_hash
       FROM canonical_events e
       JOIN connector_registry c ON c.id=e.connector_id
       WHERE c.connector_key='bizimhesap'
         AND e.event_type NOT LIKE 'notification.%'
         AND (e.received_at>? OR (e.received_at=? AND e.event_key>?))
       ORDER BY e.received_at ASC,e.event_key ASC LIMIT ?`
    ).bind(lastTime,lastTime,lastKey,limit).all();
    const records=(rs.results||[]).map(r=>{
      let payload={};
      try { payload=JSON.parse(r.payload_json||'{}'); } catch { payload={_parse_error:true}; }
      return {event_key:r.event_key,event_type:r.event_type,
        external_ref:r.external_ref,occurred_at:r.occurred_at,received_at:r.received_at,
        truth_state:r.truth_state,payload,evidence_ref:r.evidence_ref,content_hash:r.content_hash};
    });
    const last=records[records.length-1];
    return json({ok:true,source:'cloudflare_d1.canonical_events',scope:'bizimhesap',
      count:records.length,has_more:records.length===limit,
      cursor:last?JSON.stringify([last.received_at,last.event_key]):url.searchParams.get('cursor')||'',
      records,generated_at:new Date().toISOString()});
  } catch(error) {
    return json({ok:false,error:'event_export_failure',message:String(error.message||error).slice(0,180)},503);
  }
}
