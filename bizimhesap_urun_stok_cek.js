const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const SHOW = args.includes('--show');
const LIMIT = Number(args[args.indexOf('--limit') + 1] || process.env.URUN_LIMIT || 0);
const FIRMA_ARG = args.includes('--firma') ? args[args.indexOf('--firma') + 1] : 'alayli';
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'urun_stok_onizleme.json';
const DEBUG = args.includes('--debug');

const CONFIG = {
  email: process.env.BIZIMHESAP_EMAIL || 'alaylimedikal@gmail.com',
  password: process.env.BIZIMHESAP_PASSWORD || 'aL290900.',
  loginUrl: 'https://bizimhesap.com/bhlogin',
  firmUrl: 'https://bizimhesap.com/web/ngn/sec/ngnmultiaccount',
  stokUrl: process.env.BIZIMHESAP_STOK_URL || 'https://bizimhesap.com/web/ngn/rep/ngninventorystatusreport?rc=1',
};

const SUPABASE = {
  url: process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co',
  key: process.env.SUPABASE_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW',
  table: process.env.PRODUCT_TABLE || 'product_raw',
};

const FIRMALAR = {
  alayli: { id: 'alayli', adi: 'ALAYLI MEDIKAL', arama: 'ALAYLI' },
};

const db = createClient(SUPABASE.url, SUPABASE.key);

function log(msg) {
  const line = `[${new Date().toLocaleString('tr-TR')}] ${msg}`;
  console.log(line);
  fs.appendFileSync('urun_stok_cek_log.txt', line + '\n');
}

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseMoney(v) {
  const raw = String(v || '').replace(/\s/g, '');
  const cleaned = raw.replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const n = lastComma > lastDot
    ? Number(cleaned.replace(/\./g, '').replace(',', '.'))
    : Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function parseNumber(v) {
  const cleaned = String(v || '').replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const n = lastComma > lastDot
    ? Number(cleaned.replace(/\./g, '').replace(',', '.'))
    : Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function rowHash(r) {
  return crypto.createHash('sha1')
    .update([r.firma_id, r.depo, r.urun_kod, r.barkod, norm(r.urun), r.kategori].join('|'))
    .digest('hex');
}

async function startBrowser() {
  const browser = await puppeteer.launch({
    headless: !SHOW,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    defaultViewport: { width: 1366, height: 768 },
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr-TR,tr;q=0.9' });
  return { browser, page };
}

async function gotoSaglam(page, url, label, timeout = 60000) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  } catch (e) {
    log(`[UYARI] ${label} gec yuklendi: ${e.message}`);
  }
  await page.waitForSelector('body', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2500));
}

async function login(page) {
  log('[LOGIN] BizimHesap');
  await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('body', { timeout: 12000 });
  let pwEl = await page.$('input[type="password"]');
  if (!pwEl) {
    await page.evaluate(() => {
      const norm = s => String(s || '').toLocaleLowerCase('tr-TR');
      const el = [...document.querySelectorAll('a,button')]
        .find(x => norm(x.innerText || x.value || x.title).includes('giriş yap') || norm(x.innerText || x.value || x.title).includes('giris yap'));
      if (el) el.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  }
  await page.waitForSelector('input[type="password"]', { timeout: 12000 });
  const emailEl = await page.$('input[type="email"]') || await page.$('input[type="text"]');
  await emailEl.click({ clickCount: 3 });
  await emailEl.type(CONFIG.email, { delay: 20 });
  pwEl = await page.$('input[type="password"]');
  await pwEl.click({ clickCount: 3 });
  await pwEl.type(CONFIG.password, { delay: 20 });
  const clicked = await page.evaluate(() => {
    const norm = s => String(s || '').toLocaleLowerCase('tr-TR');
    const b = document.querySelector('#btnLogin')
      || [...document.querySelectorAll('button')].find(x => norm(x.innerText || x.value).includes('giriş yap'));
    if (b) { b.click(); return true; }
    return false;
  });
  if (!clicked) throw new Error('BizimHesap giris butonu bulunamadi');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
}

async function firmaSec(page, firma) {
  log(`[FIRMA] ${firma.adi}`);
  await page.goto(CONFIG.firmUrl, { waitUntil: 'networkidle2', timeout: 25000 });
  await page.waitForSelector('a,button,div,span', { timeout: 12000 });
  const ok = await page.evaluate(aranan => {
    const n = s => String(s || '').toUpperCase();
    const el = [...document.querySelectorAll('button,a')]
      .find(x => n(x.innerText).includes(n(aranan)) && n(x.innerText).length < 140);
    if (el) { (el.closest('a') || el.closest('button') || el).click(); return true; }
    return false;
  }, firma.arama);
  if (!ok) throw new Error('Firma bulunamadi');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));
}

async function tumSatirlariYukle(page) {
  let lastCount = 0;
  let stable = 0;
  for (let i = 0; i < 45 && stable < 5; i++) {
    const count = await page.evaluate(() => {
      const candidates = [document.scrollingElement, ...document.querySelectorAll('div,section,main,tbody,table')]
        .filter(Boolean)
        .filter(x => x.scrollHeight > x.clientHeight + 20);
      for (const el of candidates) {
        try { el.scrollTop = el.scrollHeight; } catch {}
      }
      window.scrollTo(0, document.body.scrollHeight);
      return document.querySelectorAll('table tbody tr, table tr').length;
    });
    if (count === lastCount) stable += 1;
    else stable = 0;
    lastCount = count;
    await new Promise(r => setTimeout(r, 400));
  }
}

function normalizeHeaders(headers) {
  return headers.map(h => norm(h).replace(/\s+/g, '_'));
}

function cell(obj, names, fallback = '') {
  for (const n of names) {
    if (obj[n] !== undefined && obj[n] !== null && obj[n] !== '') return obj[n];
  }
  return fallback;
}

async function stokOku(page, firma) {
  await gotoSaglam(page, CONFIG.stokUrl, 'stok raporu');
  await page.waitForSelector('table', { timeout: 45000 });
  await new Promise(r => setTimeout(r, 1500));
  await tumSatirlariYukle(page);
  const raw = await page.evaluate(() => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const table = [...document.querySelectorAll('table')].filter(visible).sort((a, b) => b.innerText.length - a.innerText.length)[0];
    if (!table) return { headers: [], rows: [] };
    const headers = [...table.querySelectorAll('thead th, tr th')].map(x => x.innerText.trim()).filter(Boolean);
    const rows = [...table.querySelectorAll('tbody tr, tr')].map(tr => {
      const cells = [...tr.querySelectorAll('td')].map(td => td.innerText.trim());
      if (!cells.length || cells.every(c => !c)) return null;
      return cells;
    }).filter(Boolean);
    return { headers, rows };
  });

  const headers = normalizeHeaders(raw.headers);
  return raw.rows.map((cells, i) => {
    const o = {};
    headers.forEach((h, idx) => { o[h] = cells[idx] || ''; });
    const row = {
      firma_id: firma.id,
      firma_adi: firma.adi,
      depo: cell(o, ['depo'], cells[0] || ''),
      urun_kod: cell(o, ['kod', 'urun_kodu'], cells[1] || ''),
      barkod: cell(o, ['barkod'], cells[2] || ''),
      urun: cell(o, ['urun'], cells[3] || cells[2] || ''),
      marka: cell(o, ['marka'], ''),
      kategori: cell(o, ['kategori'], ''),
      alis_fiyat: parseMoney(cell(o, ['alis', 'alis_fiyati'], 0)),
      satis_fiyat: parseMoney(cell(o, ['satis', 'satis_fiyati'], 0)),
      kdv: parseNumber(cell(o, ['kdv%', 'kdv'], 0)),
      raf: cell(o, ['raf'], ''),
      miktar: parseNumber(cell(o, ['miktar'], 0)),
      birim: cell(o, ['birim'], ''),
      etiket: cell(o, ['etiket'], ''),
      kaynak: 'bizimhesap_stok',
      raw: { headers: raw.headers, cells, mapped: o, kaynak_satir: i + 1 },
    };
    row.satir_hash = rowHash(row);
    return row;
  }).filter(r => r.urun && r.urun !== r.depo);
}

async function debugSayfa(page, rows) {
  const info = await page.evaluate(() => {
    const txt = s => String(s || '').replace(/\s+/g, ' ').trim();
    return {
      url: location.href,
      title: document.title,
      tableText: txt(document.querySelector('table')?.innerText || '').substring(0, 4000),
      body: txt(document.body.innerText).substring(0, 4000),
    };
  }).catch(e => ({ error: e.message }));
  fs.writeFileSync('debug_urun_stok_page.json', JSON.stringify({ foundRows: rows.length, ...info }, null, 2), 'utf8');
}

async function kaydet(rows) {
  if (!rows.length) return 0;
  const uniqueRows = [...new Map(rows.map(r => [`${r.firma_id}:${r.satir_hash}`, r])).values()];
  const records = uniqueRows.map(r => ({
    firma_id: r.firma_id,
    firma_adi: r.firma_adi,
    depo: r.depo,
    urun_kod: r.urun_kod,
    barkod: r.barkod,
    urun: r.urun,
    marka: r.marka,
    kategori: r.kategori,
    alis_fiyat: r.alis_fiyat,
    satis_fiyat: r.satis_fiyat,
    kdv: r.kdv,
    raf: r.raf,
    miktar: r.miktar,
    birim: r.birim,
    etiket: r.etiket,
    kaynak: r.kaynak,
    satir_hash: r.satir_hash,
    raw: r.raw,
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await db.from(SUPABASE.table)
    .upsert(records, { onConflict: 'firma_id,satir_hash' })
    .select('id');
  if (error) throw new Error(`Supabase ${SUPABASE.table}: ${error.message}`);
  return data?.length || records.length;
}

(async () => {
  const firma = FIRMALAR[FIRMA_ARG] || FIRMALAR.alayli;
  const { browser, page } = await startBrowser();
  try {
    await login(page);
    await firmaSec(page, firma);
    let rows = await stokOku(page, firma);
    if (LIMIT) rows = rows.slice(0, LIMIT);
    const payload = {
      mod: COMMIT ? 'commit' : 'dry-run',
      firma_id: firma.id,
      firma_adi: firma.adi,
      adet: rows.length,
      stok_adet: rows.reduce((s, r) => s + (Number(r.miktar) || 0), 0),
      stok_degeri: rows.reduce((s, r) => s + (Number(r.miktar) || 0) * (Number(r.alis_fiyat) || 0), 0),
      kayitlar: rows,
    };
    fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8');
    if (DEBUG || rows.length === 0) await debugSayfa(page, rows);
    log(`[ONIZLEME] ${rows.length} urun/stok -> ${OUT}`);
    if (COMMIT) {
      const n = await kaydet(rows);
      log(`[KAYIT] ${n} kayit ${SUPABASE.table}`);
    } else {
      log('[DRY-RUN] Supabase kaydi yapilmadi');
    }
  } catch (e) {
    await debugSayfa(page, []).catch(() => {});
    log('[HATA] ' + e.message);
    process.exitCode = 1;
  } finally {
    if (!SHOW) await browser.close();
  }
})();
