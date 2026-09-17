import { authorized } from './session-checkpoint.js';
import { buildContextPack, choosePack, entity360, routeCommand, saveWorkingContext, realTaskScorecard, skillProductionGate } from '../shared/context-autonomy.js';
import { SKILL_REGISTRY_V1 } from '../shared/skill-registry.js';
import { istanbulDate } from '../shared/attention-engine.js';

const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

export async function onRequestGet({request,env}) {
  if (!env.APERION_DB) return json({ok:false,error:'missing_d1_binding'},503);
  if (!await authorized(request,env)) return json({ok:false,error:'unauthorized'},401);
  const url=new URL(request.url);
  const q=(url.searchParams.get('q')||'').slice(0,240);
  const view=url.searchParams.get('view')||'pack';
  try {
    if (view==='scorecard') return json({ok:true,...await realTaskScorecard(env.APERION_DB,istanbulDate())});
    if (view==='skill_gate') {
      const skill=SKILL_REGISTRY_V1['BizimHesap.GiderKaydet'];
      const row=await env.APERION_DB.prepare("SELECT verified_executions FROM memory_skill_candidates WHERE task_type=? LIMIT 1").bind(skill.skill_id).first();
      return json({ok:true,skill_id:skill.skill_id,status:skill.status,...skillProductionGate(skill,row?.verified_executions||0)});
    }
    if (!q) return json({ok:false,error:'query_required'},400);
    const pack=await buildContextPack(env.APERION_DB,choosePack(q),q,{tokenBudget:Number(url.searchParams.get('token_budget'))||1200});
    if (view==='entity360') return json({ok:true,read_only:true,entity360:entity360(pack)});
    return json({ok:true,read_only:true,pack});
  } catch { return json({ok:false,error:'context_unavailable'},503); }
}

export async function onRequestPost({request,env}) {
  if (!env.APERION_DB) return json({ok:false,error:'missing_d1_binding'},503);
  if (!await authorized(request,env)) return json({ok:false,error:'unauthorized'},401);
  if (Number(request.headers.get('content-length')||0)>4096) return json({ok:false,error:'body_too_large'},413);
  let body;
  try { body=await request.json(); } catch { return json({ok:false,error:'invalid_json'},400); }
  if (JSON.stringify(body).length>4096||typeof body.command!=='string'||body.command.length>240) return json({ok:false,error:'invalid_command'},400);
  try {
    const result=await routeCommand(env.APERION_DB,body.command,{taskKey:body.task_key});
    let working_context=null;
    if (body.task_key&&result.resolution&&(result.resolution.intent==='expense'||result.resolution.continued)) {
      const state={amount:result.resolution.amount,currency:result.resolution.currency,category:result.resolution.category,
        payment_account:result.resolution.payment_account,company:result.resolution.scope||result.context_pack.scope,
        operation:'expense',date:result.resolution.date,paid_status:result.resolution.paid_status,missing:result.resolution.missing};
      working_context=await saveWorkingContext(env.APERION_DB,body.task_key,result.context_pack.scope,state,'expense');
    }
    return json({ok:true,external_write:false,financial_write:false,read_only_external:true,...result,working_context_saved:working_context&&{task_key:working_context.task_key,expires_at:working_context.expires_at}});
  } catch { return json({ok:false,error:'command_resolution_unavailable'},503); }
}
