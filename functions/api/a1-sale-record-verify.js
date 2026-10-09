function json(value,status=200){
  return new Response(JSON.stringify(value),{
    status,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
  });
}
function clean(value,max=500){return String(value==null?'':value).trim().slice(0,max);}
function number(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function fingerprint(row){
  return [
    clean(row.firma_id||'alayli',80),
    clean(row.tarih,10),
    clean(row.fatura_no,120),
    clean(row.urun_kod,100),
    clean(row.barkod,100),
    clean(row.unvan,200),
    clean(row.urun,500),
    number(row.adet,0),
    number(row.ciro,0)
  ].join('|');
}
export async function onRequestPost({request,env}){
  if(!env.APERION_DB)return json({ok:false,error:'missing_d1_binding'},503);
  try{
    const body=await request.json();
    const records=Array.isArray(body.records)?body.records:[];
    if(!records.length||records.length>500)return json({ok:false,error:'records_must_be_1_to_500'},400);
    const keys=[...new Set(records.map(r=>clean(r.event_key,180)).filter(Boolean))];
    if(keys.length!==records.length)return json({ok:false,error:'invalid_or_duplicate_event_key'},400);
    const found=new Map();
    for(let i=0;i<keys.length;i+=80){
      const part=keys.slice(i,i+80);
      const placeholders=part.map(()=>'?').join(',');
      const rs=await env.APERION_DB.prepare(
        `SELECT event_key,payload_json FROM canonical_events
          WHERE event_type='sale.invoice' AND truth_state='confirmed'
            AND event_key IN (${placeholders})`
      ).bind(...part).all();
      for(const row of rs.results||[])found.set(String(row.event_key),row.payload_json);
    }
    for(const record of records){
      const raw=found.get(clean(record.event_key,180));
      if(!raw)return json({ok:false,error:'event_not_confirmed'},401);
      let canonical={};
      try{canonical=JSON.parse(raw||'{}');}catch{return json({ok:false,error:'canonical_payload_invalid'},503);}
      if(fingerprint(canonical)!==fingerprint(record))return json({ok:false,error:'payload_mismatch'},401);
    }
    return json({ok:true,verified:records.length});
  }catch(error){
    return json({ok:false,error:'verification_failed',message:String(error?.message||error).slice(0,160)},400);
  }
}
