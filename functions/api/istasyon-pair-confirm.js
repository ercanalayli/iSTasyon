import {ensureDashboardSchema,sha256Hex} from '../shared/istasyon-dashboard-auth.js';

const page=(title,text,status=200)=>new Response('<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;background:#07101d;color:#eef5ff;display:grid;place-items:center;min-height:100vh;margin:0"><main style="max-width:520px;padding:28px;text-align:center"><h1>'+title+'</h1><p style="color:#a9bad0;line-height:1.6">'+text+'</p></main></body></html>',{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
export async function onRequestGet({request,env}){
  if(!env.APERION_DB || !(await ensureDashboardSchema(env.APERION_DB))) return page('Bağlantı kurulamadı','İstasyON veri kasasına erişilemiyor.',503);
  const u=new URL(request.url),nonce=u.searchParams.get('nonce')||'',code=u.searchParams.get('code')||'';
  const hash=await sha256Hex(code);
  const row=await env.APERION_DB.prepare(`UPDATE istasyon_dashboard_pair_requests
    SET status='approved',approved_at=datetime('now'),updated_at=datetime('now')
    WHERE browser_nonce=? AND code_sha256=? AND status='pending' AND expires_at > datetime('now')
    RETURNING browser_nonce`).bind(nonce,hash).first();
  if(!row) return page('İstek geçersiz','Eşleştirme bağlantısı kullanılmış veya süresi dolmuş.',400);
  return page('İstasyON bağlandı ✓','Şimdi bu sayfayı kapatıp İstasyON paneline dön. Panel birkaç saniye içinde otomatik açılacak.');
}
