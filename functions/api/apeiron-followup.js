import { authorized } from './session-checkpoint.js';
import { appendEvent } from '../shared/memory-event-ledger.js';

const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const ref=value=>typeof value==='string'&&/^(?:gmail|thread):[a-f0-9]{32,64}$/.test(value);

export async function onRequestPost({request,env}) {
  if (!env.APERION_DB) return json({ok:false,error:'missing_d1_binding'},503);
  if (!await authorized(request,env)) return json({ok:false,error:'unauthorized'},401);
  if (Number(request.headers.get('content-length')||0)>1024) return json({ok:false,error:'body_too_large'},413);
  let body;
  try { body=await request.json(); } catch { return json({ok:false,error:'invalid_json'},400); }
  if (!ref(body.thread_ref)||!ref(body.message_ref)||!Number.isFinite(Date.parse(body.received_at))) return json({ok:false,error:'invalid_reply_reference'},400);
  const row=await env.APERION_DB.prepare("SELECT followup_key,entity_ref,title,stage FROM aperion_followups WHERE thread_ref=? AND stage='WAITING_EXTERNAL' ORDER BY created_at DESC LIMIT 1").bind(body.thread_ref).first();
  if (!row) return json({ok:true,matched:false,writes:0});
  const event=await appendEvent(env.APERION_DB,{event_type:'external_reply_received',occurred_at:body.received_at,source_type:'gmail',source_ref:body.message_ref,
    actor:'gmail_watcher',scope:'AperiON',summary:`Dış yanıt alındı: ${row.title}`.slice(0,180),risk_class:'READ',result_status:'observed',
    verification_status:'source_metadata_verified',provenance_ref:body.message_ref,metadata:{}});
  const update=await env.APERION_DB.prepare("UPDATE aperion_followups SET stage='RESPONSE_RECEIVED',source_event_id=?,next_action='Yanıtı incele ve sonraki adımı belirle',updated_at=datetime('now') WHERE followup_key=? AND stage='WAITING_EXTERNAL'")
    .bind(event.event_id,row.followup_key).run();
  return json({ok:true,matched:true,followup_key:row.followup_key,stage:'RESPONSE_RECEIVED',event_id:event.event_id,duplicate:event.duplicate,updated:Number(update?.meta?.changes??update?.changes??0)>0});
}
