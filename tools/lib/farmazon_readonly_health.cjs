'use strict';

// Read-only identity probe of an already open Farmazon tab.
// Never launches Chrome, navigates, types, clicks, logs in or returns page data.
const FARMAZON_HOSTS = new Set(['farmazon.com.tr', 'www.farmazon.com.tr']);
const BROKERS = Object.freeze(['http://127.0.0.1:9222', 'http://127.0.0.1:9223']);

function allowedFarmazonPage(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && FARMAZON_HOSTS.has(u.hostname) &&
      !/^\/(?:login|logout|signin|signout)(?:\/|$)/i.test(u.pathname);
  } catch { return false; }
}

function result(status, sessionFound = false, authenticated = false) {
  // Only status booleans cross the remote boundary. Do not expose account
  // name, tabs, DOM, credentials, cookies, or any product/customer content.
  return { site_id: 'farmazon', authenticated, session_found: sessionFound,
    status, source: 'existing_chrome_broker' };
}

async function probeFarmazonSession(options = {}) {
  const expectedAccount = String(options.expectedAccount ??
    process.env.APERION_FARMAZON_EXPECTED_ACCOUNT ?? '').trim();
  if (!expectedAccount) return result('expected_account_not_configured');
  const connect = options.connect ?? ((args) => require('puppeteer').connect(args));
  const brokers = options.brokers ?? BROKERS;
  let browserReached = false;
  for (const browserURL of brokers) {
    if (!BROKERS.includes(browserURL)) continue;
    let browser = null;
    try {
      browser = await connect({ browserURL, defaultViewport: null,
        timeout: 5000, protocolTimeout: 6000 });
      browserReached = true;
      const pages = await browser.pages();
      for (const page of pages) {
        if (!allowedFarmazonPage(page.url())) continue;
        const state = await page.evaluate((expected) => {
          const normal = value => String(value || '').trim()
            .toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ');
          const accountMatches = [...document.querySelectorAll('button')]
            .some(button => normal(button.textContent) === normal(expected));
          const links = [...document.querySelectorAll('a[href]')].map(a => a.href);
          const sameSitePath = (href, path) => {
            try {
              const u = new URL(href, location.href);
              return u.origin === location.origin && u.pathname === path;
            } catch { return false; }
          };
          return {
            accountMatches,
            hasOrders: links.some(href => sameSitePath(href, '/myprofile/orders')),
            hasCart: links.some(href => sameSitePath(href, '/cart'))
          };
        }, expectedAccount);
        const authenticated = Boolean(state && state.accountMatches &&
          state.hasOrders && state.hasCart);
        return result(authenticated ? 'authenticated_ui_verified' :
          'account_or_page_mismatch', true, authenticated);
      }
    } catch {
      // Do not retry login or open a new browser; try the next existing broker.
    } finally {
      try { browser?.disconnect(); } catch {}
    }
  }
  return result(browserReached ? 'farmazon_tab_not_found_in_broker' :
    'browser_broker_unavailable');
}

module.exports = { allowedFarmazonPage, probeFarmazonSession };
