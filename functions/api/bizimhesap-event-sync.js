// AperiON | Generic read-only BizimHesap event intake.
// This endpoint ONLY writes observed source events into AperiON D1; it NEVER writes to ERP.
// The Windows reader must provide stable source identifiers, proper timestamps and evidence.
function response(value,status=200) {
  return new Response(JSON.stringify(value),{status,headers:{
    'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
const TYPES=new Set([
  'stock.product','stock.movement','inventory.stock',
  'customer.record','customer.movement','account.movement',
  'cash.movement','bank.movement','invoice.document','invoice.received',
  'payment.outgoing','collection.incoming','expense.record'
]);
function allowed(request,env) {
  const secret=env.APERION_BRIDGE_SECRET;
  return Boolean(secret && request.headers.get('authorization')===`Bearer ${secret}`);
}
function txt(v,max=250) {
  return String(v===undefined||v===null?'':v).trim().slice(0,max);
}
async function sha(value) {
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function onRequestPost({request,env}) {
  if(!allowed(request,env))return response({ok:false,error:'unauthorized'},401);
  if(!env.APERION_DB)return response({ok:false,error:'missing_d1_binding'},503);
  try {
    const body=await request.json();
    const records=Array.isArray(body.records)?body.records:[];
    if(!records.length||records.length>300)return response({ok:false,error:'expected_1_to_300_records'},400);
    const connector=await env.APERION_DB.prepare(
      `SELECT id FROM connector_registry WHERE connector_key='bizimhesap' LIMIT 1`
    ).first();
    if(!connector?.id)return response({ok:false,error:'bizimhesap_connector_missing'},503);
    const statements=[];
    const seen=new Set();
    for(const item of records) {
      const eventType=txt(item.event_type,80),sourceId=txt(item.source_id,180),
        company=txt(item.firma_id,80),occurred=txt(item.occurred_at,35);
      if(!TYPES.has(eventType)||!sourceId||!company||
        !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(occurred)||
        !item.payload||typeof item.payload!=='object'||Array.isArray(item.payload)) {
        return response({ok:false,error:'invalid_source_event'},400);
      }
      const key=`bizimhesap:${eventType}:${await sha(company+'|'+sourceId)}`;
      if(seen.has(key))continue;
      seen.add(key);
      // Do not trust 'confirmed' from a caller unless the source offers concrete evidence.
      const evidence=txt(item.evidence_ref,500);
      const truth=item.operation==='deleted'?'deleted':
        item.source_verified===true&&evidence?'confirmed':'observed';
      const payload={...item.payload,firma_id:company,source_id:sourceId,
        source_operation:txt(item.operation||'upsert',30)};
      const serialized=JSON.stringify(payload);
      if(serialized.length>25000)return response({ok:false,error:'payload_too_large'},413);
      const hash=await sha(serialized);
      statements.push(env.APERION_DB.prepare(
        `INSERT INTO canonical_events
          (event_key,connector_id,external_ref,event_type,occurred_at,truth_state,
           subject_type,subject_ref,payload_json,evidence_ref,content_hash,received_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
         ON CONFLICT(event_key) DO UPDATE SET
           truth_state=excluded.truth_state,occurred_at=excluded.occurred_at,
           payload_json=excluded.payload_json,evidence_ref=excluded.evidence_ref,
           content_hash=excluded.content_hash,received_at=datetime('now')`
      ).bind(key,connector.id,sourceId,eventType,occurred,truth,'bizimhesap',company,
        serialized,evidence||null,hash));
    }
    if(statements.length)await env.APERION_DB.batch(statements);
    return response({ok:true,accepted:statements.length,
      note:'AperiON D1 only; no Google Sheets or ERP write claim',
      generated_at:new Date().toISOString()});
  } catch(err) {
    return response({ok:false,error:'event_sync_failed',message:String(err.message||err).slice(0,140)},400);
  }
}
