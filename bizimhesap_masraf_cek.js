const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const SHOW = args.includes('--show');
const LIMIT = Number(args[args.indexOf('--limit') + 1] || process.env.MASRAF_LIMIT || 500);
const FIRMA_ARG = args.includes('--firma') ? args[args.indexOf('--firma') + 1] : 'alayli';
const FROM = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
const TO = args.includes('--to') ? args[args.indexOf('--to') + 1] : null;
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'masraf_onizleme.json';
const DEBUG = args.includes('--debug');

const CONFIG = {
  email: process.env.BIZIMHESAP_EMAIL || 'alaylimedikal@gmail.com',
  password: process.env.BIZIMHESAP_PASSWORD || 'aL290900.',
  loginUrl: 'https://bizimhesap.com/bhlogin',
  firmUrl: 'https://bizimhesap.com/web/ngn/sec/ngnmultiaccount',
  masrafUrl: process.env.BIZIMHESAP_MASRAF_URL || 'https://bizimhesap.com/web/ngn/acc/ngncostss',
};

const SUPABASE = {
  url: process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co',
  key: process.env.SUPABASE_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW',
  table: process.env.MASRAF_TABLE || 'masraf_raw',
};

const FIRMALAR = {
  alayli: { id: 'alayli', adi: 'ALAYLI MEDIKAL', arama: 'ALAYLI' },
  elit: { id: 'elit', adi: 'ELIT ET URUNLERI', arama: 'ELIT' },
  odyoform: { id: 'odyoform', adi: 'ODYOFORM ISITME CIHAZLARI', arama: 'ODYOFORM' },
};

const db = createClient(SUPABASE.url, SUPABASE.key);

function log(msg) {
  const line = `[${new Date().toLocaleString('tr-TR')}] ${msg}`;
  console.log(line);
  fs.appendFileSync('masraf_cek_log.txt', line + '\n');
}

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o')
    .replace(/Ä±/g, 'i').replace(/ÅŸ/g, 's').replace(/Ã§/g, 'c').replace(/ÄŸ/g, 'g').replace(/Ã¼/g, 'u').replace(/Ã¶/g, 'o');
}

function isoToTr(v) {
  if (!v) return '';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : v;
}

function trToIso(v) {
  const s = String(v || '').trim();
  let m = s.match(/(\d{2})[./-](\d{2})[./-](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/(\d{4})[./-](\d{2})[./-](\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return '';
}

function parseMoney(v) {
  const raw = String(v || '').replace(/\s/g, '');
  if (!/[₺€$]|TL|EUR|USD|,\d{2}\b|\.\d{2}\b/i.test(raw)) return 0;
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let n;
  if (lastComma > lastDot) n = Number(cleaned.replace(/\./g, '').replace(',', '.'));
  else n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function kategoriBul(text) {
  const s = norm(text);
  if (/market|kahve|cay|cayci|yumurta|sigara/.test(s)) return 'Market/Mutfak';
  if (/yemek|tost/.test(s)) return 'Personel Yemek';
  if (/maas|maa|prim|hakedi/.test(s)) return 'Personel Maas/Prim';
  if (/iade/.test(s)) return 'Iade Gideri';
  if (/kargo|nakliye|tasima/.test(s)) return 'Kargo/Nakliye';
  if (/sgk|bagkur|vergi|stopaj|kdv/.test(s)) return 'Vergi/SGK';
  if (/telekom|ttnet|turkcell|vodafone|internet|telefon/.test(s)) return 'Iletisim';
  if (/elektrik|su|dogalgaz|fatura|isinma/.test(s)) return 'Fatura/Gider';
  if (/yakit|akaryakit|benzin|mazot/.test(s)) return 'Yakit';
  if (/kira/.test(s)) return 'Kira';
  if (/banka|eft|havale|fast|bsmv|komisyon|masraf|ucret/.test(s)) return 'Banka Masrafi';
  if (/personel|calisan/.test(s)) return 'Personel';
  return 'Diger';
}

function hashRow(r) {
  return crypto.createHash('sha1')
    .update([r.firma_id, r.tarih, r.tutar, norm(r.aciklama)].join('|'))
    .digest('hex');
}

function dedupeKey(r) {
  return [r.firma_id, r.tarih, Math.round(Number(r.tutar || 0) * 100), norm(r.aciklama)].join('|');
}

function tableDedupeKey(r) {
  return [r.firma_id, r.tarih, norm(r.aciklama)].join('|');
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
  await emailEl.type(CONFIG.email, { delay: 25 });
  pwEl = await page.$('input[type="password"]');
  await pwEl.click({ clickCount: 3 });
  await pwEl.type(CONFIG.password, { delay: 25 });
  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button,input[type="submit"]')]
      .find(x => /giri|login|submit/i.test(x.innerText || x.value || '') || x.type === 'submit');
    if (b) { b.click(); return true; }
    return false;
  });
  if (!clicked) await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  log('  -> ' + page.url());
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
  await new Promise(r => setTimeout(r, 1500));
  log('  -> ' + page.url());
  if (page.url().includes('/sec/ngnmultiaccount')) {
    const info = await page.evaluate(() => {
      const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
      const box = x => {
        const r = x.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      };
      const txt = s => String(s || '').replace(/\s+/g, ' ').trim();
      return [...document.querySelectorAll('a,button,div,span,img')]
        .filter(visible)
        .map((x, i) => ({ i, tag: x.tagName, text: txt(x.innerText || x.alt || x.title || ''), cls: x.className || '', href: x.href || '', box: box(x) }))
        .filter(x => x.text || x.href || /alayli|account|firma|company/i.test(String(x.cls)))
        .slice(0, 180);
    });
    fs.writeFileSync('debug_firma_sec_page.json', JSON.stringify(info, null, 2), 'utf8');
    await page.screenshot({ path: 'debug_firma_sec_page.png', fullPage: true }).catch(() => {});
  }
}

async function masrafSayfasinaGit(page) {
  await page.goto(CONFIG.masrafUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1200));
  if (page.url().includes('/web/ngn/') && !page.url().includes('/blog/')) return;

  await page.goto('https://bizimhesap.com/web/ngn/newportal', { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await page.waitForSelector('a,button,div,span', { timeout: 15000 });
  const clicked = await page.evaluate(() => {
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o')
      .replace(/Ä±/g, 'i').replace(/ÅŸ/g, 's').replace(/Ã§/g, 'c').replace(/ÄŸ/g, 'g').replace(/Ã¼/g, 'u').replace(/Ã¶/g, 'o');
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const clickText = words => {
      const el = [...document.querySelectorAll('a,button,li,div,span')]
        .filter(visible)
        .find(x => words.some(w => norm(x.innerText || x.value).includes(w)) && norm(x.innerText || x.value).length < 80);
      if (el) { (el.closest('a') || el.closest('button') || el).click(); return true; }
      return false;
    };
    const n1 = clickText(['nakit yonetimi', 'nakit yönetimi']);
    setTimeout(() => clickText(['masraflar', 'masraf']), 250);
    return n1;
  });
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1800));
  if (!clicked || !/masraf|cost/i.test(norm(page.url() + ' ' + await page.title()))) {
    await page.evaluate(() => {
      const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
      const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
      const el = [...document.querySelectorAll('a,button,li,div,span')]
        .filter(visible)
        .find(x => /masraf/.test(norm(x.innerText || x.value)) && norm(x.innerText || x.value).length < 80);
      if (el) (el.closest('a') || el.closest('button') || el).click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
  }
}

async function filtrele(page, from, to) {
  await masrafSayfasinaGit(page);
  await page.waitForSelector('input,select,button,table,a', { timeout: 15000 });
  await page.evaluate((fromTr, toTr) => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const inputs = [...document.querySelectorAll('input[type="text"],input[type="date"],input:not([type])')].filter(visible);
    const set = (el, val) => {
      el.focus();
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    if (fromTr && inputs[0]) set(inputs[0], fromTr);
    if (toTr && inputs[1]) set(inputs[1], toTr);
    const n = s => String(s || '').toLowerCase();
    const b = [...document.querySelectorAll('button,a')].filter(visible)
      .find(x => /hazirla|hazırla|ara|filtre|listele|raporla|goster|göster/.test(n(x.innerText || x.value)));
    if (b) b.click();
  }, isoToTr(from), isoToTr(to));
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
}

async function tabloOku(page, firma) {
  const raw = await page.evaluate(() => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const tables = [...document.querySelectorAll('table')].filter(visible);
    const table = tables.sort((a, b) => b.innerText.length - a.innerText.length)[0];
    if (!table) return [];
    const headers = [...table.querySelectorAll('thead th, tr th')].map(x => x.innerText.trim());
    return [...table.querySelectorAll('tbody tr, tr')].map(tr => {
      const cells = [...tr.querySelectorAll('td')].map(td => td.innerText.trim()).filter(Boolean);
      if (!cells.length) return null;
      return { headers, cells, text: cells.join(' | ') };
    }).filter(Boolean);
  });

  return raw.map((r, i) => {
    const dateCell = r.cells.find(c => trToIso(c));
    const moneyCells = r.cells.map(c => ({ c, v: parseMoney(c) })).filter(x => x.v > 0);
    const money = moneyCells.length ? moneyCells[moneyCells.length - 1] : { v: 0 };
    const ikinciTarih = trToIso(r.cells[1]);
    const masraf = ikinciTarih ? (r.cells[2] || '') : (r.cells[3] || '');
    const tedarikci = !ikinciTarih && r.cells[4] && !parseMoney(r.cells[4]) ? r.cells[4] : '';
    const not = r.cells[7] || '';
    const descCells = [not, masraf, tedarikci].filter(Boolean);
    const aciklama = (descCells.sort((a, b) => b.length - a.length)[0] || r.text || '').substring(0, 500);
    const row = {
      firma_id: firma.id,
      firma_adi: firma.adi,
      tarih: trToIso(dateCell),
      aciklama,
      kategori: kategoriBul([masraf, not, tedarikci, r.text].join(' ')),
      tedarikci,
      tutar: money.v,
      kaynak: 'bizimhesap_masraf',
      kaynak_satir: i + 1,
      raw: r,
    };
    row.hash = hashRow(row);
    return row;
  }).filter(r => r.tarih && r.tutar);
}

async function debugSayfa(page, rows) {
  await page.screenshot({ path: 'debug_masraf_cek_last.png', fullPage: true }).catch(() => {});
  const info = await page.evaluate(() => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const txt = s => String(s || '').replace(/\s+/g, ' ').trim();
    return {
      url: location.href,
      title: document.title,
      buttons: [...document.querySelectorAll('button,a')].filter(visible).map(x => txt(x.innerText || x.value)).filter(Boolean).slice(0, 80),
      inputs: [...document.querySelectorAll('input,select,textarea')].filter(visible).map(x => ({
        tag: x.tagName,
        type: x.type || '',
        name: x.name || '',
        id: x.id || '',
        placeholder: x.placeholder || '',
        value: x.value || '',
        text: txt(x.closest('label')?.innerText || ''),
      })).slice(0, 80),
      tables: [...document.querySelectorAll('table')].filter(visible).map(t => txt(t.innerText).substring(0, 1200)).slice(0, 5),
      body: txt(document.body.innerText).substring(0, 5000),
    };
  }).catch(e => ({ error: e.message }));
  fs.writeFileSync('debug_masraf_cek_page.json', JSON.stringify({ foundRows: rows.length, ...info }, null, 2), 'utf8');
}

async function kaydet(rows) {
  if (!rows.length) return 0;
  const dates = rows.map(r => r.tarih).filter(Boolean).sort();
  const from = dates[0], to = dates[dates.length - 1];
  const batchSeen = new Set();
  const fresh = rows.filter(r => {
    const k = tableDedupeKey(r);
    if (batchSeen.has(k)) return false;
    batchSeen.add(k);
    return true;
  });
  if (!fresh.length) return 0;
  const records = fresh.map(r => ({
    firma_id: r.firma_id,
    firma_adi: r.firma_adi,
    tarih: r.tarih,
    aciklama: r.aciklama,
    kategori: r.kategori,
    tutar: r.tutar,
    kdv: 0,
    tedarikci: r.tedarikci || '',
    kaynak: r.kaynak,
    yil: Number(r.tarih.substring(0, 4)),
    ay: Number(r.tarih.substring(5, 7)),
    created_at: new Date().toISOString(),
  }));
  const del = await db.from(SUPABASE.table)
    .delete()
    .eq('firma_id', rows[0].firma_id)
    .gte('tarih', from)
    .lte('tarih', to);
  if (del.error) throw new Error(`Supabase ${SUPABASE.table} temizleme: ${del.error.message}`);
  const { data, error } = await db.from(SUPABASE.table).insert(records).select();
  if (error) throw new Error(`Supabase ${SUPABASE.table}: ${error.message}`);
  return data?.length || records.length;
}

(async () => {
  const firma = FIRMALAR[FIRMA_ARG] || FIRMALAR.alayli;
  const { browser, page } = await startBrowser();
  try {
    await login(page);
    await firmaSec(page, firma);
    await filtrele(page, FROM, TO);
    let rows = await tabloOku(page, firma);
    if (FROM) rows = rows.filter(r => r.tarih >= FROM);
    if (TO) rows = rows.filter(r => r.tarih <= TO);
    if (LIMIT) rows = rows.slice(0, LIMIT);
    const payload = {
      mod: COMMIT ? 'commit' : 'dry-run',
      firma_id: firma.id,
      firma_adi: firma.adi,
      from: FROM,
      to: TO,
      adet: rows.length,
      toplam: rows.reduce((s, r) => s + r.tutar, 0),
      kayitlar: rows,
    };
    fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8');
    if (DEBUG || rows.length === 0) await debugSayfa(page, rows);
    log(`[ONIZLEME] ${rows.length} kayit -> ${OUT}`);
    if (COMMIT) {
      const n = await kaydet(rows);
      log(`[KAYIT] ${n} kayit ${SUPABASE.table}`);
    } else {
      log('[DRY-RUN] Supabase kaydi yapilmadi');
    }
  } catch (e) {
    await page.screenshot({ path: 'debug_masraf_cek.png', fullPage: true }).catch(() => {});
    log('[HATA] ' + e.message);
    process.exitCode = 1;
  } finally {
    if (!SHOW) await browser.close();
  }
})();
