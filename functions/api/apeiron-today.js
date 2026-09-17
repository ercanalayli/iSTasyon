import { authorized } from './session-checkpoint.js';
import { buildToday, formatTodayBrief } from '../shared/attention-engine.js';
import { resolveNaturalCommand, SKILL_REGISTRY_V1 } from '../shared/skill-registry.js';

const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

export async function onRequestGet({request,env}) {
  if (!env.APERION_DB) return json({ok:false,error:'missing_d1_binding'},503);
  if (!await authorized(request,env)) return json({ok:false,error:'unauthorized'},401);
  const view=new URL(request.url).searchParams.get('view');
  if (view==='skills') {
    try {
      const rows=(await env.APERION_DB.prepare("SELECT task_type,status,verified_executions,provenance_ref,updated_at FROM memory_skill_candidates WHERE task_type='BizimHesap.GiderKaydet' LIMIT 1").all()).results||[];
      const candidate=rows[0];
      const skills=Object.values(SKILL_REGISTRY_V1).map(contract=>candidate?{
        ...contract,status:candidate.status,verified_examples:candidate.verified_executions,
        memory_provenance:candidate.provenance_ref,last_verified_at:candidate.updated_at
      }:contract);
      return json({ok:true,registry_version:1,source:candidate?'memory_os_d1':'contract_only',skills});
    } catch { return json({ok:false,error:'skill_registry_memory_unavailable'},503); }
  }
  try {
    const today=await buildToday(env.APERION_DB);
    if (view==='brief') return json({ok:true,view:'brief',date:today.date,text:formatTodayBrief(today),read_only:true});
    return json({ok:true,view:'today',...today});
  }
  catch { return json({ok:false,error:'today_unavailable'},503); }
}

export async function onRequestPost({request,env}) {
  if (!env.APERION_DB) return json({ok:false,error:'missing_d1_binding'},503);
  if (!await authorized(request,env)) return json({ok:false,error:'unauthorized'},401);
  if (Number(request.headers.get('content-length')||0)>4096) return json({ok:false,error:'body_too_large'},413);
  let body;
  try { body=await request.json(); } catch { return json({ok:false,error:'invalid_json'},400); }
  if (JSON.stringify(body).length>4096 || typeof body.command!=='string') return json({ok:false,error:'invalid_command'},400);
  try {
    const today=await buildToday(env.APERION_DB);
    if (/kaynağ|kaynak|nereden bili/i.test(body.command)) {
      const selected=today.items.find(item=>item.id===body.item_id);
      return json({ok:true,read_only:true,resolution:selected?
        {intent:'explain_source',item_id:selected.id,title:selected.title,provenance:selected.provenance,action_class:'OTOMATIK',execution_authorized:false}:
        {intent:'explain_source',action_class:'BILGI_GEREKLI',missing:['item_id'],execution_authorized:false}});
    }
    const resolution=await resolveNaturalCommand(env.APERION_DB,body.command,today.priorities);
    return json({ok:true,read_only:true,resolution});
  } catch { return json({ok:false,error:'command_resolution_unavailable'},503); }
}
