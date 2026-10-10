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

export default {
  async fetch(request, env) {
    const u = new URL(request.url);
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
