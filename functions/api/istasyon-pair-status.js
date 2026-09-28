import {ensureDashboardSchema,json,randomToken,sha256Hex} from '../shared/istasyon-dashboard-auth.js';

export async function onRequestGet({request,env}){
  if(!env.APERION_DB || !(await ensureDashboardSchema(env.APERION_DB))) return json({ok:false,error:'store_unavailable'},503);
  const nonce=new URL(request.url).searchParams.get('nonce')||'';
  if(!/^[A-Za-z0-9_-]{20,160}$/.test(nonce)) return json({ok:false,error:'invalid_nonce'},400);
  const row=await env.APERION_DB.prepare(`SELECT status,expires_at FROM istasyon_dashboard_pair_requests WHERE browser_nonce=? LIMIT 1`).bind(nonce).first();
  if(!row) return json({ok:false,error:'pairing_not_found'},404);
  if(row.status==='pending') return json({ok:true,status:'pending'});
  if(row.status==='approved'){
    const token=randomToken(32),hash=await sha256Hex(token);
    await env.APERION_DB.prepare(`UPDATE istasyon_dashboard_pair_requests SET
      status='issued',session_token_sha256=?,session_expires_at=datetime('now','+30 days'),updated_at=datetime('now')
      WHERE browser_nonce=? AND status='approved'`).bind(hash,nonce).run();
    return json({ok:true,status:'issued',dashboard_token:token,expires_in_days:30});
  }
  return json({ok:true,status:row.status});
}
