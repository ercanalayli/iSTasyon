import {allowedChatId,ensureDashboardSchema,json,randomToken,sha256Hex} from '../shared/istasyon-dashboard-auth.js';

export async function onRequestPost({request,env}){
  if(!env.APERION_DB || !(await ensureDashboardSchema(env.APERION_DB))) return json({ok:false,error:'store_unavailable'},503);
  const bot=env.HERMES_TELEGRAM_BOT_TOKEN||env.TELEGRAM_BOT_TOKEN||'';
  const chat=await allowedChatId(env);
  if(!bot||!chat) return json({ok:false,error:'telegram_pairing_unavailable'},503);
  let body={}; try{body=await request.json()}catch(_){}
  const nonce=String(body.browser_nonce||'').trim();
  if(!/^[A-Za-z0-9_-]{20,160}$/.test(nonce)) return json({ok:false,error:'invalid_nonce'},400);
  const recent=await env.APERION_DB.prepare("SELECT COUNT(*) c FROM istasyon_dashboard_pair_requests WHERE created_at > datetime('now','-1 minute')").first();
  if(Number(recent?.c||0)>6) return json({ok:false,error:'rate_limited'},429);

  const code=randomToken(32), hash=await sha256Hex(code);
  await env.APERION_DB.prepare(`INSERT INTO istasyon_dashboard_pair_requests
    (browser_nonce,code_sha256,status,expires_at,updated_at)
    VALUES(?,?,'pending',datetime('now','+10 minutes'),datetime('now'))
    ON CONFLICT(browser_nonce) DO UPDATE SET
      code_sha256=excluded.code_sha256,status='pending',expires_at=excluded.expires_at,
      approved_at=NULL,session_token_sha256=NULL,session_expires_at=NULL,updated_at=datetime('now')`)
    .bind(nonce,hash).run();

  const origin=new URL(request.url).origin;
  const confirm=origin+'/api/istasyon-pair-confirm?nonce='+encodeURIComponent(nonce)+'&code='+encodeURIComponent(code);
  const tg=await fetch('https://api.telegram.org/bot'+bot+'/sendMessage',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({chat_id:chat,text:'🔐 İstasyON panel giriş isteği\n\nBu isteği sen başlattıysan aşağıdaki düğmeye dokun.',
      reply_markup:{inline_keyboard:[[{text:'✅ Bu iPhone’u İstasyON’a bağla',url:confirm}]]}})
  });
  if(!tg.ok) return json({ok:false,error:'telegram_delivery_failed'},502);
  return json({ok:true,status:'telegram_sent',expires_in_seconds:600});
}
