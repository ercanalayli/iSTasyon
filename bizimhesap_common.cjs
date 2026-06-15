const fs = require('fs');
const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch {}

function loadEnvFallback() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFallback();

const DIAGNOSTICS_DIR = path.join(__dirname, 'diagnostics');
const DEFAULT_PROFILE_DIR = path.join(__dirname, '.bizimhesap-profile');

function boolEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return !['0', 'false', 'hayir', 'no'].includes(String(value).toLowerCase());
}

function normalizeText(value) {
  return String(value || '')
    .toLocaleUpperCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/İ/g, 'I')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ş/g, 'S')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function ensureDiagnosticsDir() {
  fs.mkdirSync(DIAGNOSTICS_DIR, { recursive: true });
  return DIAGNOSTICS_DIR;
}

function getBizimHesapConfig() {
  return {
    email: process.env.BIZIMHESAP_EMAIL || process.env.BIZIMHESAP_USER || 'alaylimedikal@gmail.com',
    password: process.env.BIZIMHESAP_PASSWORD || process.env.BIZIMHESAP_PASS || '',
    loginUrl: process.env.BIZIMHESAP_LOGIN_URL || 'https://bizimhesap.com/bhlogin',
    homeUrl: process.env.BIZIMHESAP_HOME_URL || 'https://bizimhesap.com/web/ngn/newportal',
    firmUrl: process.env.BIZIMHESAP_FIRM_URL || 'https://bizimhesap.com/web/ngn/sec/ngnmultiaccount',
  };
}

function requireBizimHesapPassword() {
  const config = getBizimHesapConfig();
  if (!config.password) {
    throw new Error('BIZIMHESAP_PASSWORD ortam degiskeni/GitHub secret icinde yok');
  }
  return config;
}

function launchOptions({ headless = true, width = 1366, height = 768 } = {}) {
  return {
    headless: boolEnv('BIZIMHESAP_HEADLESS', headless),
    userDataDir: process.env.BIZIMHESAP_PROFILE_DIR || DEFAULT_PROFILE_DIR,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-first-run',
    ],
    defaultViewport: { width, height },
  };
}

async function bodyText(page) {
  return page.evaluate(() => document.body?.innerText || '').catch(() => '');
}

async function savePageDiagnostics(page, baseName) {
  const dir = ensureDiagnosticsDir();
  await page.screenshot({ path: path.join(dir, `${baseName}.png`), fullPage: true }).catch(() => {});
  fs.writeFileSync(path.join(dir, `${baseName}.txt`), await bodyText(page), 'utf8');
}

async function isPasswordRequestPage(page) {
  const url = page.url();
  const text = normalizeText(await bodyText(page));
  return url.includes('ngnpasswordchangerequest') || text.includes('SIFRENIZI MI UNUTTUNUZ');
}

async function isBizimHesapAppPage(page) {
  const url = page.url();
  if (!url.includes('/web/ngn/') || await isPasswordRequestPage(page)) return false;
  const text = normalizeText(await bodyText(page));
  return !text.includes('TEKRAR HOS GELDINIZ') && !text.includes('GIRIS YAP');
}

async function isLoginPage(page) {
  const url = page.url();
  const text = normalizeText(await bodyText(page));
  const hasPassword = await page.$('#txtPassword, input[type="password"]').catch(() => null);
  return Boolean(hasPassword) || url.includes('/bhlogin') || text.includes('TEKRAR HOS GELDINIZ') || text.includes('E POSTA ADRESI');
}

async function assertNotPasswordRequest(page) {
  if (await isPasswordRequestPage(page)) {
    await savePageDiagnostics(page, 'bizimhesap_login_sorunu');
    throw new Error('BizimHesap giris dogrulamasi kontrol bekliyor');
  }
}

async function leavePasswordRequestIfPossible(page, log = () => {}) {
  if (!(await isPasswordRequestPage(page))) return true;
  const { firmUrl, homeUrl } = getBizimHesapConfig();
  log('  -> sifre/dogrulama sayfasi goruldu, oturumla devam deneniyor');
  for (const url of [firmUrl, homeUrl]) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 1200));
    if (!(await isPasswordRequestPage(page)) && page.url().includes('/web/ngn/')) {
      log('  -> oturum devam etti: ' + page.url());
      return true;
    }
  }
  await savePageDiagnostics(page, 'bizimhesap_login_sorunu');
  throw new Error('BizimHesap giris dogrulamasi kontrol bekliyor');
}

async function tryExistingBizimHesapSession(page, log = () => {}) {
  const { firmUrl, homeUrl } = getBizimHesapConfig();
  for (const url of [firmUrl, homeUrl]) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await page.waitForSelector('body', { timeout: 12000 }).catch(() => {});
    await leavePasswordRequestIfPossible(page, log).catch(() => {});
    if (await isBizimHesapAppPage(page)) {
      log('  -> kalici oturum acik: ' + page.url());
      return true;
    }
  }
  return false;
}

function firmaAliases(firma = {}) {
  return [
    firma.adi,
    firma.sektor,
    firma.arama,
    firma.id,
    'ALAYLI MEDIKAL',
    'ALAYLI MEDİKAL',
    'ALAYLI MEDIKAL ORTOPEDI',
    'ALAYLI MEDİKAL ORTOPEDİ',
    'ALAYLI MEDIKAL ORTOPEDI KULAK ISITME CIHAZLARI',
    'ALAYLI MEDİKAL ORTOPEDİ KULAK İŞİTME CİHAZLARI',
    'ALAYLI',
    'ALAYLI MED',
  ].filter(Boolean);
}

function preferredFirmaNames(firma = {}) {
  return [
    firma.adi,
    firma.arama,
    'ALAYLI MEDIKAL',
    'ALAYLI MEDÄ°KAL',
  ].filter(Boolean).map(normalizeText).filter(Boolean);
}

async function selectFirma(page, firma = {}, log = () => {}) {
  const { firmUrl } = getBizimHesapConfig();
  await page.goto(firmUrl, { waitUntil: 'networkidle2', timeout: 25000 }).catch(() => {});
  await page.waitForSelector('body', { timeout: 12000 });
  await leavePasswordRequestIfPossible(page, log);

  const aliases = firmaAliases(firma).map(normalizeText).filter(Boolean);
  const preferred = preferredFirmaNames(firma);
  const result = await page.evaluate(({ wanted, preferredWanted }) => {
    const normalize = value => String(value || '')
      .toLocaleUpperCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/İ/g, 'I')
      .replace(/Ğ/g, 'G')
      .replace(/Ü/g, 'U')
      .replace(/Ş/g, 'S')
      .replace(/Ö/g, 'O')
      .replace(/Ç/g, 'C')
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim();
    const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const nodes = [...document.querySelectorAll('button,a,span,div,h3,h4')]
      .filter(visible)
      .map(el => ({ el, text: String(el.innerText || el.value || el.title || '').replace(/\s+/g, ' ').trim() }))
      .filter(x => x.text && x.text.length < 180);
    const rowText = el => {
      const clickable = el.closest('a') || el.closest('button') || el;
      const row = clickable.closest('.btn,.panel,.card,.row,li,tr,div') || clickable;
      return normalize(row.innerText || clickable.innerText || el.innerText || '');
    };
    const scoreNode = x => {
      const text = normalize(x.text);
      const full = rowText(x.el);
      if (!wanted.some(w => text.includes(w) || full.includes(w))) return -1;

      let score = 0;
      if (preferredWanted.some(w => text === w || full === w)) score += 1000;
      if (preferredWanted.some(w => text.includes(w) || full.includes(w))) score += 700;
      if (text === 'ALAYLI MEDIKAL' || full === 'ALAYLI MEDIKAL') score += 900;
      if (text.includes('ALAYLI MEDIKAL') || full.includes('ALAYLI MEDIKAL')) score += 650;
      if (text.includes('ORTOPEDI') || full.includes('ORTOPEDI')) score += 60;
      if (text.includes('KULAK') || full.includes('KULAK') || text.includes('ISITME') || full.includes('ISITME')) score -= 500;
      if (text === 'ALAYLI' || full === 'ALAYLI') score += 20;
      score -= Math.max(0, text.length - 20);
      return score;
    };
    const match = nodes
      .map(x => ({ ...x, score: scoreNode(x) }))
      .filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score)[0];
    if (match) {
      const clickable = match.el.closest('a') || match.el.closest('button') || match.el;
      clickable.click();
      return { ok: true, selected: match.text, candidates: nodes.map(x => x.text).slice(0, 80) };
    }
    return { ok: false, candidates: nodes.map(x => x.text).slice(0, 80) };
  }, { wanted: aliases, preferredWanted: preferred });

  if (!result.ok) {
    const dir = ensureDiagnosticsDir();
    const visible = result.candidates.join('\n');
    fs.writeFileSync(path.join(dir, 'firma_listesi.txt'), visible || '(firma listesi okunamadi)', 'utf8');
    await page.screenshot({ path: path.join(dir, 'firma_secilemedi.png'), fullPage: true }).catch(() => {});
    throw new Error(`Firma secilemedi, gorunen firmalar: ${result.candidates.join(' | ') || 'yok'}`);
  }

  await Promise.race([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 25000 }).catch(() => {}),
    page.waitForFunction(() => !location.href.includes('/sec/ngnmultiaccount'), { timeout: 25000 }).catch(() => {}),
  ]);
  await new Promise(resolve => setTimeout(resolve, 1800));
  await assertNotPasswordRequest(page);
  if (page.url().includes('/sec/ngnmultiaccount')) {
    await savePageDiagnostics(page, 'firma_secimi_takildi');
    throw new Error('Firma secimi tiklandi ama firma ana sayfasina gecmedi');
  }
  log('  -> ' + page.url());
}

async function loginBizimHesap(page, log = () => {}) {
  const config = getBizimHesapConfig();
  log('[LOGIN] BizimHesap');
  if (await tryExistingBizimHesapSession(page, log)) return;

  await page.goto(config.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('body', { timeout: 12000 });

  if (await isBizimHesapAppPage(page)) {
    log('  -> oturum acik');
    return;
  }

  if (!config.password) {
    await savePageDiagnostics(page, 'bizimhesap_sifre_gerekli');
    throw new Error('BIZIMHESAP_PASSWORD ortam degiskeni/GitHub secret icinde yok');
  }

  let pwEl = await page.$('#txtPassword') || await page.$('input[type="password"]');
  if (!pwEl) {
    const clicked = await page.evaluate(() => {
      const norm = s => String(s || '').toLocaleLowerCase('tr-TR');
      const el = [...document.querySelectorAll('a,button')]
        .find(x => norm(x.innerText || x.value || x.title).includes('giriş yap') || norm(x.innerText || x.value || x.title).includes('giris yap'));
      if (el) { el.click(); return true; }
      return false;
    });
    if (clicked) await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  }

  await assertNotPasswordRequest(page);
  await page.waitForSelector('#txtPassword, input[type="password"]', { timeout: 12000 });
  const emailEl = await page.$('#txtEmail') || await page.$('input[type="email"]') || await page.$('input[type="text"]');
  if (!emailEl) throw new Error('BizimHesap e-posta alani bulunamadi');

  await emailEl.click({ clickCount: 3 });
  await emailEl.type(config.email, { delay: 25 });
  pwEl = await page.$('#txtPassword') || await page.$('input[type="password"]');
  await pwEl.click({ clickCount: 3 });
  await pwEl.type(config.password, { delay: 25 });

  const clicked = await page.evaluate(() => {
    const norm = s => String(s || '').toLocaleLowerCase('tr-TR');
    const b = document.querySelector('#btnLogin')
      || [...document.querySelectorAll('button')].find(x => norm(x.innerText || x.value).includes('giriş yap') || norm(x.innerText || x.value).includes('giris yap'));
    if (b) { b.click(); return true; }
    return false;
  });
  if (!clicked) throw new Error('BizimHesap giris butonu bulunamadi');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(resolve => setTimeout(resolve, 1200));
  await leavePasswordRequestIfPossible(page, log);
  if (await isLoginPage(page)) {
    await savePageDiagnostics(page, 'bizimhesap_login_yeni_sistem_kontrol');
    throw new Error('BizimHesap girisi tamamlanmadi: sifre, captcha veya yeni dogrulama sistemi kontrol istiyor');
  }
  log('  -> ' + page.url());
}

module.exports = {
  assertNotPasswordRequest,
  getBizimHesapConfig,
  launchOptions,
  leavePasswordRequestIfPossible,
  loginBizimHesap,
  normalizeText,
  requireBizimHesapPassword,
  savePageDiagnostics,
  selectFirma,
};
