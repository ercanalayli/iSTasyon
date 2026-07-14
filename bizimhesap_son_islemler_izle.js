const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const { getBizimHesapConfig, launchOptions, loginBizimHesap, selectFirma } = require('./bizimhesap_common.cjs');

const args = process.argv.slice(2);
const FIRMA = valueArg('--firma', 'alayli');
const LOOP = args.includes('--loop');
const RUN_SYNC = args.includes('--run-sync');
const HEADFUL = args.includes('--headful');
const DRY_RUN = args.includes('--dry-run');
const INTERVAL_MS = Number(valueArg('--interval-ms', 10 * 60 * 1000));
const RESYNC_DAYS = Number(valueArg('--resync-days', 45));

const ROOT = __dirname;
const STATE_FILE = path.join(ROOT, 'bizimhesap_son_islemler_state.json');
const OUT_FILE = path.join(ROOT, 'bizimhesap_son_islemler.json');
const LOG_FILE = path.join(ROOT, 'bizimhesap_son_islemler_log.txt');

const CONFIG = {
  ...getBizimHesapConfig(),
  homeUrl: 'https://bizimhesap.com/web/ngn/newportal',
};

const FIRMALAR = {
  alayli: { adi: 'ALAYLI MEDIKAL', sektor: 'ALAYLI' },
};

const SUPABASE = {
  url: process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co',
  key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW',
  table: process.env.BIZIMHESAP_EVENTS_TABLE || 'bizimhesap_events',
};

function valueArg(name, fallback) {
  const i = args.indexOf(name);
  if (i === -1 || i + 1 >= args.length) return fallback;
  return args[i + 1];
}

function log(msg) {
  const line = `[${new Date().toLocaleString('tr-TR')}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o')
    .replace(/Ä±/g, 'i').replace(/ÅŸ/g, 's').replace(/Ã§/g, 'c').replace(/ÄŸ/g, 'g').replace(/Ã¼/g, 'u').replace(/Ã¶/g, 'o');
}

function fixText(s) {
  return String(s || '')
    .replace(/giriÅŸ/g, 'giriş').replace(/GiriÅŸ/g, 'Giriş')
    .replace(/SatÄ±ÅŸ/g, 'Satış').replace(/satÄ±ÅŸ/g, 'satış')
    .replace(/tahsilatÄ±/g, 'tahsilatı')
    .replace(/Ãœ/g, 'Ü').replace(/Ã¼/g, 'ü')
    .replace(/Ã‡/g, 'Ç').replace(/Ã§/g, 'ç')
    .replace(/Ã–/g, 'Ö').replace(/Ã¶/g, 'ö')
    .replace(/Å/g, 'Ş').replace(/ÅŸ/g, 'ş')
    .replace(/Ä°/g, 'İ').replace(/Ä±/g, 'ı')
    .replace(/ÄŸ/g, 'ğ').replace(/Ä/g, 'Ğ')
    .replace(/A\.Å\./g, 'A.Ş.');
}

function hashEvent(event) {
  return crypto.createHash('sha1')
    .update([event.firma_id, event.tarih, event.saat, event.aciklama].join('|'))
    .digest('hex');
}

function classify(text) {
  const s = norm(text);
  if (s.includes('tahsilat')) return 'tahsilat';
  if (s.includes('satis') || s.includes('fatura') || s.includes('irsaliye')) return 'satis_fatura';
  if (s.includes('masraf') || s.includes('gider')) return 'gider';
  if (s.includes('odeme')) return 'odeme';
  if (s.includes('stok') || s.includes('urun')) return 'stok_urun';
  if (s.includes('degist') || s.includes('duzenle') || s.includes('guncelle')) return 'degisiklik';
  return 'diger';
}

function needsResync(event) {
  return ['tahsilat', 'satis_fatura', 'gider', 'odeme', 'degisiklik'].includes(event.tur);
}

function isoDateFromTR(s) {
  const m = String(s || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function startDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function startBrowser() {
  const browser = await puppeteer.launch(launchOptions({ headless: !HEADFUL, width: 1366, height: 768 }));
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr-TR,tr;q=0.9' });
  return { browser, page };
}

async function login(page) {
  return loginBizimHesap(page, log);
  await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('body', { timeout: 12000 });
  let pwEl = await page.$('input[type="password"]');
  if (!pwEl) {
    const clicked = await page.evaluate(() => {
      const norm = s => (s || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
      const el = [...document.querySelectorAll('a,button')]
        .find(x => norm(x.innerText || x.value || x.title).includes('giris yap') || String(x.innerText || x.value || x.title || '').toLocaleLowerCase('tr-TR').includes('giriş yap'));
      if (!el) return false;
      el.click();
      return true;
    });
    if (clicked) {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  await page.waitForSelector('input[type="password"]', { timeout: 12000 });
  const emailEl = await page.$('input[type="email"]') || await page.$('input[type="text"]');
  await emailEl.click({ clickCount: 3 });
  await emailEl.type(CONFIG.email, { delay: 15 });
  pwEl = await page.$('input[type="password"]');
  await pwEl.click({ clickCount: 3 });
  await pwEl.type(CONFIG.password, { delay: 15 });
  const clicked = await page.evaluate(() => {
    const norm = s => String(s || '').toLocaleLowerCase('tr-TR');
    const b = document.querySelector('#btnLogin')
      || [...document.querySelectorAll('button')].find(x => norm(x.innerText || x.value).includes('giriş yap') || norm(x.innerText || x.value).includes('giriÅŸ yap'));
    if (b) { b.click(); return true; }
    return false;
  });
  if (!clicked) throw new Error('BizimHesap giris butonu bulunamadi');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));
  log('Login URL: ' + page.url());
}

async function firmaSec(page) {
  const firma = FIRMALAR[FIRMA] || FIRMALAR.alayli;
  return selectFirma(page, { id: FIRMA, ...firma }, log);
  await page.goto(CONFIG.firmUrl, { waitUntil: 'networkidle2', timeout: 25000 });
  const ok = await page.evaluate(aranan => {
    const hedef = aranan.toUpperCase();
    let el = [...document.querySelectorAll('button,a')]
      .find(x => (x.innerText || '').toUpperCase().includes(hedef) && (x.innerText || '').length < 140);
    if (!el) {
      el = [...document.querySelectorAll('div,span')]
        .find(x => (x.innerText || '').toUpperCase().includes(hedef) && (x.innerText || '').length < 140);
    }
    if (!el) return false;
    (el.closest('a') || el.closest('button') || el).click();
    return true;
  }, firma.sektor);
  if (!ok) throw new Error('Firma secilemedi');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));
  log('Firma URL: ' + page.url());
}

function parseEventsFromText(text) {
  const clean = fixText(text).replace(/\r/g, '\n').replace(/[ \t]+/g, ' ');
  const start = clean.search(/Son İşlemler|Son Islemler/i);
  const part = start >= 0 ? clean.slice(start) : clean;
  const re = /(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})([\s\S]*?)(?=\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}|$)/g;
  const events = [];
  let m;
  while ((m = re.exec(part))) {
    const aciklama = m[3]
      .replace(/2014,\s*2025[\s\S]*$/i, '')
      .replace(/©\s*BizimHesap[\s\S]*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!aciklama || aciklama.length < 8) continue;
    const event = {
      firma_id: FIRMA,
      tarih: isoDateFromTR(m[1]),
      saat: m[2],
      aciklama,
      tur: classify(aciklama),
      kaynak: 'bizimhesap_son_islemler',
      raw_text: `${m[1]} ${m[2]} ${aciklama}`,
      created_at: new Date().toISOString(),
    };
    event.hash = hashEvent(event);
    event.resync_gerekli = needsResync(event);
    events.push(event);
  }
  return events;
}

async function scrapeEvents() {
  const { browser, page } = await startBrowser();
  try {
    await login(page);
    await firmaSec(page);
    await page.goto(CONFIG.homeUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));
    log('Ana sayfa URL: ' + page.url());
    const text = await page.evaluate(() => document.body.innerText || '');
    const events = parseEventsFromText(text);
    await page.screenshot({ path: 'bizimhesap_son_islemler.png', fullPage: true }).catch(() => {});
    return events;
  } finally {
    await browser.close();
  }
}

async function saveSupabase(events) {
  if (DRY_RUN) return { saved: 0, skipped: true, dryRun: true };
  if (!events.length) return { saved: 0, skipped: true };
  // The portal can render the same latest movement more than once. PostgreSQL
  // rejects an upsert batch that targets the same conflict key twice.
  const uniqueEvents = [...new Map(events.map(event => [event.hash, event])).values()];
  const db = createClient(SUPABASE.url, SUPABASE.key, { auth: { persistSession: false } });
  const { error } = await db.from(SUPABASE.table).upsert(uniqueEvents, { onConflict: 'hash' });
  if (error) return { saved: 0, skipped: true, error: error.message };
  return { saved: uniqueEvents.length, skipped: false };
}

function runResync(events) {
  const important = events.filter(e => e.resync_gerekli);
  if (!important.length || !RUN_SYNC || DRY_RUN) return false;
  const from = startDate(RESYNC_DAYS);
  const to = todayISO();
  log(`Son islem degisikligi bulundu. Satis senkron: ${from} - ${to}`);
  const botFile = fs.existsSync(path.join(ROOT, '.__runtime_bizimhesap_bot.cjs'))
    ? '.__runtime_bizimhesap_bot.cjs'
    : 'bizimhesap_bot.js';
  const r = spawnSync(process.execPath, [botFile, '--firma', FIRMA, '--gecmis', from, to], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, NODE_PATH: path.join(ROOT, 'node_modules') },
  });
  if (r.status !== 0) log(`Satis senkron hata kodu: ${r.status}`);
  return r.status === 0;
}

async function once() {
  log('BizimHesap Son Islemler kontrol basladi');
  const events = await scrapeEvents();
  const old = readJson(STATE_FILE, { hashes: [] });
  const oldHashes = new Set(old.hashes || []);
  const yeni = events.filter(e => !oldHashes.has(e.hash));
  const payload = {
    kontrol_tarihi: new Date().toISOString(),
    firma_id: FIRMA,
    toplam: events.length,
    yeni: yeni.length,
    resync_onerisi: yeni.some(e => e.resync_gerekli)
      ? { baslangic: startDate(RESYNC_DAYS), bitis: todayISO(), neden: 'Son Islemler degisti' }
      : null,
    kayitlar: events,
    yeni_kayitlar: yeni,
  };
  writeJson(OUT_FILE, payload);
  if (!DRY_RUN) writeJson(STATE_FILE, { kontrol_tarihi: payload.kontrol_tarihi, hashes: events.map(e => e.hash) });
  const save = await saveSupabase(yeni);
  log(`Son Islemler: ${events.length} toplam, ${yeni.length} yeni`);
  if (save.dryRun) log('Supabase yazilmadi: dry-run modu');
  if (save.error) {
    log(`Supabase yazilmadi: ${save.error}`);
    throw new Error(`Supabase yazilmadi: ${save.error}`);
  }
  runResync(yeni);
}

async function main() {
  do {
    await once();
    if (LOOP) await new Promise(r => setTimeout(r, INTERVAL_MS));
  } while (LOOP);
}

main().catch(e => {
  log('HATA: ' + e.message);
  process.exitCode = 1;
});
