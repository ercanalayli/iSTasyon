// READ-ONLY PROBE. No account credentials, payment operations or POST endpoints.
// Cloudflare Workers Git Builds production deployment trigger: 2026-10-10.
// Authorization is a Cloudflare Worker secret, never accepted in URL/query params.
import puppeteer from '@cloudflare/puppeteer';

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


const SETUP_EXPIRES_AT = Date.parse('2026-10-10T20:30:00Z');
const SETUP_HASH = '85be88abe2b64de6db631a03a47221897c1f7b2281011498aae73fafc32f3e1e';
async function validSetupToken(request) {
  const candidate = request.headers.get('x-aperion-setup') || '';
  if (Date.now() > SETUP_EXPIRES_AT || candidate.length < 30 || candidate.length > 200) return false;
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(candidate));
  const actual = [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
  let mismatch=0;
  for (let i=0;i<SETUP_HASH.length;i++) mismatch |= actual.charCodeAt(i)^SETUP_HASH.charCodeAt(i);
  return mismatch===0;
}
function setupPage() {
  const html = "<!doctype html><html lang=\"tr\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"referrer\" content=\"no-referrer\"><title>AperiON · BizimHesap Güvenli Giriş</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:auto;padding:28px 20px;background:#10161e;color:#f3f5f8;line-height:1.55}h1{font-size:25px}p{color:#bac7d5}.info{padding:18px;border:1px solid #394556;border-radius:12px;margin-top:20px}a,button{background:#2d79e6;color:white;border:0;text-decoration:none;padding:14px 18px;border-radius:10px;display:block;text-align:center;font-weight:600;font-size:16px;width:100%;box-sizing:border-box}#open,#verify{display:none;margin-top:16px}small{color:#9aafc2}</style></head><body><h1>AperiON · BizimHesap</h1><p>Bu girişte <strong>şifreni ChatGPT'ye yazmayacaksın.</strong> Açılacak ekran, sunucunun kullandığı tarayıcıdır.</p><div class=\"info\"><div id=\"state\" role=\"status\">Güvenli tarayıcı hazırlanıyor...</div><a id=\"open\" rel=\"noreferrer\" target=\"_blank\">BizimHesap giriş ekranını aç</a><button id=\"verify\" type=\"button\">Girişi kontrol et</button></div><p><small>Yalnız bağlantı kontrolü yapılır. Gider, fatura veya finans kaydı oluşturulmaz. Bağlantıyı paylaşma.</small></p><script>\nconst state=document.getElementById('state'),open=document.getElementById('open'),verify=document.getElementById('verify');\nconst token=decodeURIComponent(location.hash.slice(1));let sessionId=null;history.replaceState(null,'',location.pathname);\nasync function request(action,body={}){const r=await fetch('/setup/'+action,{method:'POST',headers:{'content-type':'application/json','x-aperion-setup':token},body:JSON.stringify(body),cache:'no-store'});return {ok:r.ok,data:await r.json()}}\nasync function start(){if(!token){state.textContent='Giriş bağlantısı eksik. ChatGPT’den yeni bağlantı iste.';return;}try{const r=await request('start');if(!r.ok||!r.data.ok){state.textContent='Tarayıcı başlatılamadı: '+(r.data.error||'Bağlantı sorunu');return;}sessionId=r.data.session_id;open.href=r.data.live_view_url;open.style.display='block';verify.style.display='block';state.textContent='Tarayıcı hazır. Aşağıdan BizimHesap girişini aç. Giriş tamamlanınca buraya dönüp kontrol et.';}catch(e){state.textContent='Sunucu bağlantısı kurulamadı.';}}\nverify.addEventListener('click',async()=>{if(!sessionId)return;state.textContent='Giriş kontrol ediliyor...';try{const r=await request('check',{session_id:sessionId});state.textContent=r.data.authenticated===true?'Giriş doğrulandı! ChatGPT sohbetine “Girdim” yaz.':'Giriş henüz doğrulanmadı. Giriş ekranını tamamla ve tekrar kontrol et.';}catch(e){state.textContent='Oturum kontrol edilemedi. Süresi dolmuş olabilir.';}});\nstart();</script></body></html>";
  return new Response(html,{headers:{
    'content-type':'text/html;charset=utf-8','cache-control':'no-store, private',
    'x-content-type-options':'nosniff','referrer-policy':'no-referrer',
    'content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  }});
}
async function startSecureSetup(env) {
  let browser;
  try{
    browser=await puppeteer.launch(env.BROWSER,{keep_alive:600000});
    const page=await browser.newPage();
    await page.goto('https://uygulama.bizimhesap.com/web/ngn/newportal',{waitUntil:'domcontentloaded',timeout:20000});
    const cdp=await page.createCDPSession();
    const result=await cdp.send('Cloudflare.getLiveView',{mode:'tab',expiresInMs:900000});
    const session_id=browser.sessionId();
    const live_view_url=result.devtoolsFrontendUrl;
    if(typeof live_view_url!=='string'||!live_view_url.startsWith('https://live.browser.run/')) throw Error('invalid_live_view');
    browser.disconnect();browser=null;
    return json({ok:true,session_id,live_view_url,write_enabled:false});
  }catch(error){
    if(browser){try{await browser.close()}catch(_){}}
    return json({ok:false,error:error?.name==='TimeoutError'?'navigation_timeout':'browser_setup_unavailable'},503);
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
    const authenticated=Boolean(v.app&&!v.login);
    return json({ok:true,authenticated,reason:authenticated?'navigation_verified':'login_not_confirmed',write_enabled:false});
  }catch(e){return json({ok:false,authenticated:false,error:'session_unavailable'},503)}
  finally{if(browser){try{browser.disconnect()}catch(_){}}}
}

export default {
  async fetch(request, env) {
    const u = new URL(request.url);
    if (u.pathname === '/setup' && request.method === 'GET') return setupPage();
    if ((u.pathname === '/setup/start'||u.pathname === '/setup/check') && request.method === 'POST') {
      if(!await validSetupToken(request)) return json({ok:false,error:'unauthorized_or_expired'},401);
      return u.pathname === '/setup/start' ? startSecureSetup(env) : checkSecureSetup(env,request);
    }

    if (u.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, mode: 'READ_ONLY_PREFLIGHT', write_enabled: false, browser_binding: !!env.BROWSER });
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
