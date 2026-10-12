// READ-ONLY BizimHesap browser. Device pairing uses only auth POST endpoints; ERP financial POST, deletion and credentials are prohibited.
// Cloudflare Workers Git Builds production deployment trigger: 2026-10-10.
// Authorization is a Cloudflare Worker secret, never accepted in URL/query params.
import puppeteer from '@cloudflare/puppeteer';
import {ensurePairStore, validTicket, claimTicket,checkSession,renewSession,revokeSession, matchingOrigin,sessionCookie} from './mobile-pairing.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

async function isAuthorized(given, expected) {
  if (!given || !expected) return false;
  const encode = (s) => new TextEncoder().encode(s);
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encode(given)),
    crypto.subtle.digest('SHA-256', encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let mismatch = 0;
  for (let i = 0; i < x.length; i++) mismatch |= x[i] ^ y[i];
  return mismatch === 0;
}


function setupPage(handoff='') {
  // Only a 64-hex handoff reaches the HTML. Never store credentials or tokens in JS storage.
  const safe=/^[0-9a-f]{64}$/.test(handoff)?handoff:'';
  const html=String.raw`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>AperiON · BizimHesap mobil giriş</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:580px;margin:auto;padding:30px 22px;background:#111926;color:#edf4fb;line-height:1.6}p,small{color:#becdda}button,a{display:block;background:#2768d9;color:white;padding:14px;border:0;border-radius:12px;text-align:center;text-decoration:none;font-size:17px;font-weight:600;margin:16px 0;width:100%;box-sizing:border-box}#open,#check{display:none}#state{padding:18px;border:1px solid #364459;border-radius:12px}</style></head><body><h2>AperiON · BizimHesap</h2><p>Bu cihazı eşleştir. Şifreni yalnız açılan gerçek BizimHesap giriş ekranına yaz. Kayıt oluşturulmaz.</p><div id="state">Cihaz eşleştirmesi doğrulanıyor…</div><button id="pair" type="button" style="display:none">Bu iPhone’u eşleştir</button><button id="start" type="button" style="display:none">Güvenli tarayıcıyı aç</button><a id="open" target="_blank" rel="noreferrer noopener">BizimHesap giriş ekranı</a><button id="check" type="button">Giriş ekranını kontrol et</button><button id="renew" type="button">Bu cihaz yetkisini yenile (30 gün)</button><button id="revoke" type="button">Bu cihazın erişimini iptal et</button><p><small>Cihaz izni 30 gün kullanılmadığında sona erer; yetkili olduğun sürece yenilenebilir. BizimHesap'ın kendi oturumu/MFA süresi ayrı. Tüm finansal yazmalar kapalıdır. Telegram’dan /bhiptal ile tüm cihazları iptal edebilirsin.</small></p><script>
const ticket=`+JSON.stringify(safe)+`;
history.replaceState(null,'','/setup');
const $=id=>document.getElementById(id);
let browserId=null;
async function api(url,data={}){const r=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(data),cache:'no-store'});return {ok:r.ok,body:await r.json()}}
function paired(){ $('pair').style.display='none';$('start').style.display='block';$('state').textContent='Cihaz eşleştirildi. BizimHesap’a giriş için güvenli tarayıcıyı aç.'}
if(ticket){$('pair').style.display='block';$('state').textContent='Bağlantı 10 dakika geçerli ve yalnızca bir kez kullanılabilir.'}
else paired();
$('pair').onclick=async()=>{ $('pair').disabled=true;try{const r=await api('/setup/claim',{handoff:ticket});if(!r.ok){$('state').textContent='Bağlantı kullanılmış, geçersiz veya süresi dolmuş. Telegram’dan yeni /bhbagla iste.';return}paired()}catch(_){$('state').textContent='Bağlantı doğrulanamadı.'}finally{$('pair').disabled=false}};
$('start').onclick=async()=>{ $('start').disabled=true;$('state').textContent='Sunucu tarayıcısı hazırlanıyor…';try{const r=await api('/setup/start');if(!r.ok){$('state').textContent=r.body.error==='daily_browser_quota_exceeded'?'Ücretsiz bulut tarayıcı kotası doldu. Sonra yeniden dene.':'Tarayıcı açılamadı: '+(r.body.error||'oturum hatası');return}browserId=r.body.session_id;$('open').href=r.body.live_view_url;$('open').style.display='block';$('check').style.display='block';$('state').textContent='Güvenli tarayıcı hazır. BizimHesap girişini aç ve gerekiyorsa MFA tamamla.'}catch(_){$('state').textContent='Sunucu tarayıcısı şu an kullanılamıyor.'}finally{$('start').disabled=false}};
$('check').onclick=async()=>{if(!browserId)return;const r=await api('/setup/check',{session_id:browserId});$('state').textContent=r.body.navigation_detected?'BizimHesap uygulama menüsü görüldü. Şirket ve gerçek kimlik doğrulaması henüz tamamlanmadı.':'BizimHesap uygulaması doğrulanamadı; tekrar giriş yap.'};
$('renew').onclick=async()=>{const r=await api('/setup/renew');$('state').textContent=r.ok?'Cihaz erişimi yenilendi (30 gün).':'Yenileme başarısız; Telegram’dan /bhbagla ile tekrar eşleştir.'};
$('revoke').onclick=async()=>{const r=await api('/setup/revoke');if(r.ok){$('state').textContent='Bu cihazın eşleştirmesi iptal edildi.';$('start').style.display='none';$('open').style.display='none';$('check').style.display='none'}else{$('state').textContent='İptal doğrulanamadı. Telegram’dan /bhiptal yaz.'}};
</script></body></html>`;
  return new Response(html,{headers:{
    'content-type':'text/html;charset=utf-8',
    'cache-control':'no-store, private','x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer','x-frame-options':'DENY',
    'content-security-policy':"default-src 'none';script-src 'unsafe-inline';style-src 'unsafe-inline';connect-src 'self';base-uri 'none';form-action 'none';frame-ancestors 'none'"
  }});
}
async function startSecureSetup(env) {
  let browser; let stage='launch';
  try{
    browser=await puppeteer.launch(env.BROWSER,{keep_alive:180000});
    stage='open_tab';
    const page=await browser.newPage();
    stage='navigate';
    await page.goto('https://uygulama.bizimhesap.com/web/ngn/newportal',{waitUntil:'domcontentloaded',timeout:20000});
    const cdp=await page.createCDPSession();
    stage='live_view';
    const result=await cdp.send('Cloudflare.getLiveView',{mode:'tab',expiresInMs:900000});
    const session_id=browser.sessionId();
    const live_view_url=result.devtoolsFrontendUrl;
    if(typeof live_view_url!=='string'||!live_view_url.startsWith('https://live.browser.run/')) throw Error('invalid_live_view');
    browser.disconnect();browser=null;
    return json({ok:true,session_id,live_view_url,write_enabled:false});
  }catch(error){
    if(browser){try{await browser.close()}catch(_){}}
    const message=String(error?.message||'');
    const quota=/429|time limit exceeded for today|daily browser|quota exceeded/i.test(message);
    const concurrency=/concurrent|too many sessions|too many browsers/i.test(message);
    const category=quota?'daily_browser_quota_exceeded':concurrency?'browser_concurrency_limit':error?.name==='TimeoutError'?'navigation_timeout':'browser_setup_unavailable';
    return json({ok:false,error:category,stage},quota?429:503);
  }
}
async function checkSecureSetup(env,request) {
  let payload={};try{payload=await request.json()}catch(_){}
  const sid=String(payload.session_id||'');
  if(!/^[a-zA-Z0-9-]{20,90}$/.test(sid))return json({ok:false,error:'invalid_session'},400);
  let browser;
  try{
    browser=await puppeteer.connect(env.BROWSER,sid);
    const pages=await browser.pages();
    const page=pages.find(p=>p.url().startsWith('https://uygulama.bizimhesap.com')||p.url().startsWith('https://bizimhesap.com'));
    if(!page) return json({ok:true,authenticated:false,reason:'not_at_bizimhesap',write_enabled:false});
    const v=await page.evaluate(()=>{
       const t=(document.body?.innerText||'').toLowerCase();
       return {login:/giriş yap|oturum aç|şifreniz|şifre gir|e-posta adresi/.test(t),app:/nakit yönetimi|masraflar|hesaplarım|ürünler|müşteriler|alışlar/.test(t)};
    });
    const navigation_detected=Boolean(v.app&&!v.login);
    return json({ok:true,authenticated:false,navigation_detected,reason:navigation_detected?'app_navigation_only_company_unverified':'login_not_confirmed',write_enabled:false});
  }catch(e){return json({ok:false,authenticated:false,error:'session_unavailable'},503)}
  finally{if(browser){try{browser.disconnect()}catch(_){}}}
}

export default {
  async fetch(request, env) {
    const u = new URL(request.url);
    if (u.pathname === '/setup' && request.method === 'GET') {
      if (!(await ensurePairStore(env.APERION_DB))) return json({ok:false,error:'pairing_store_unavailable'},503);
      const handoff=u.searchParams.get('handoff')||'';
      if(handoff){
        if(!(await validTicket(env.APERION_DB,handoff)))return json({ok:false,error:'invalid_expired_or_used_handoff'},401);
        return setupPage(handoff);
      }
      if(!(await checkSession(env.APERION_DB,request))) return json({ok:false,error:'mobile_device_not_paired'},401);
      return setupPage();
    }
    if (u.pathname.startsWith('/setup/') && request.method==='POST') {
      if(!(await ensurePairStore(env.APERION_DB)))return json({ok:false,error:'pairing_store_unavailable'},503);
      if(!matchingOrigin(request))return json({ok:false,error:'origin_rejected'},403);
      if(u.pathname==='/setup/claim'){
        let body={};try{body=await request.json()}catch(_){}
        const result=await claimTicket(env.APERION_DB,String(body.handoff||''));
        if(!result.ok)return json({ok:false,error:'ticket_used_or_expired'},401);
        const response=json({ok:true,device_paired:true,write_enabled:false});
        const headers=new Headers(response.headers);
        headers.set('Set-Cookie',sessionCookie(result.session));
        return new Response(response.body,{status:response.status,headers});
      }
      const mobile=await checkSession(env.APERION_DB,request);
      if(!mobile)return json({ok:false,error:'mobile_session_expired_or_revoked'},401);
      if(u.pathname==='/setup/start')return startSecureSetup(env);
      if(u.pathname==='/setup/check')return checkSecureSetup(env,request);
      if(u.pathname==='/setup/renew'){
        const renewed=await renewSession(env.APERION_DB,request);
        if(!renewed.ok)return json({ok:false,error:'renewal_failed'},401);
        const response=json({ok:true,device_paired:true,write_enabled:false});
        const headers=new Headers(response.headers);
        headers.set('Set-Cookie',sessionCookie(renewed.session));
        return new Response(response.body,{status:response.status,headers});
      }
      if(u.pathname==='/setup/revoke'){
        const revoked=await revokeSession(env.APERION_DB,request);
        if(!revoked)return json({ok:false,error:'revoke_failed'},503);
        const response=json({ok:true,device_revoked:true});
        const headers=new Headers(response.headers);
        headers.set('Set-Cookie',sessionCookie('',0));
        return new Response(response.body,{status:response.status,headers});
      }
    }
    if (u.pathname === '/health' && request.method === 'GET') {
      const pairingStoreReady=await ensurePairStore(env.APERION_DB);
      return json({ok:true,mode:'READ_ONLY_PREFLIGHT',write_enabled:false,
        browser_binding:!!env.BROWSER,pairing_store_ready:pairingStoreReady,
        setup_version:'20261012-mobile-revocable-v3'});
    }
    if (u.pathname !== '/probe') return json({ error: 'not_found' }, 404);
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
    if (!await isAuthorized(request.headers.get('x-aperion-bridge-secret'), env.APERION_BRIDGE_SECRET)) {
      return json({ error: 'unauthorized' }, 401);
    }

    let browser;
    try {
      browser = await puppeteer.launch(env.BROWSER);
      const page = await browser.newPage();
      const response = await page.goto('https://uygulama.bizimhesap.com/web/ngn/acc/ngncosts', {
        waitUntil: 'domcontentloaded',
        timeout: 18000,
      });
      const visible = (await page.evaluate(() => (document.body?.innerText || '').slice(0, 10000))).toLowerCase();
      const path = new URL(page.url()).pathname;
      const challenge = /captcha|access denied|verify you are human|challenge|too many requests|hızlı giriş/.test(visible);
      const login = /giriş yap|oturum aç|şifreniz|şifre gir|e-posta adresi/.test(visible);
      const appNav = /nakit yönetimi|masraflar|masraf kalemi|hesaplarım/.test(visible);
      return json({
        ok: true, mode: 'READ_ONLY_PREFLIGHT', write_enabled: false,
        page_status: response?.status() ?? null,
        page_path: path, challenge_detected: challenge,
        login_detected: login, app_navigation_detected: appNav,
        next_step: challenge ? 'captcha_or_antibot_blocker' : login ? 'one_time_authorization_required' : appNav ? 'verify_authenticated_account' : 'inspect_login_flow',
      });
    } catch (error) {
      return json({
        ok: false, mode: 'READ_ONLY_PREFLIGHT', write_enabled: false,
        error_type: error?.name === 'TimeoutError' ? 'navigation_timeout' : 'browser_unavailable',
      }, 503);
    } finally {
      if (browser) { try { await browser.close(); } catch { /* no response data */ } }
    }
  },
};
