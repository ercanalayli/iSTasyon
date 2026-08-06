// 2026-08-03 v2: Ercan'in tepkisi haklıydı - onceki versiyon HER komut icin
// yeni bir tarayici acip YENIDEN GIRIS yapiyordu. Kanit: 10:39 ve 10:42'deki
// girisler basarili oldu ama 14:39'daki (araya saatler girince) captcha/
// dogrulama istedi - yani sorun "IP/cihaz" degil, "sik sik yeniden giris
// denemesi" veya oturumun tazelenmemesiydi. Cozum: tarayiciyi ve oturumu BIR
// KERE ac, dinleyici acik kaldigi surece HIC KAPATMA, her komutu AYNI, zaten
// giris yapilmis sayfa uzerinden isle. Sadece oturum gercekten duserse
// (login sayfasina geri atarsa) yeniden giris dene.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const { launchOptions, loginBizimHesap, selectFirma } = require('../bizimhesap_common.cjs');

const ENV_FILE = path.join(__dirname, '..', 'local-secrets', 'bizimhesap.local.env');
if (!fs.existsSync(ENV_FILE)) { console.error('HATA: local-secrets/bizimhesap.local.env yok.'); process.exit(1); }
require('dotenv').config({ path: ENV_FILE });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY || SERVICE_KEY.includes('BURAYA_')) { console.error('HATA: SUPABASE_SERVICE_ROLE_KEY placeholder.'); process.exit(1); }
const db = createClient(SUPABASE_URL, SERVICE_KEY);
const BANK_TABLE = 'bank_transactions';

const PROFILE_DIR = path.join(__dirname, '..', 'local-secrets', '.bizimhesap-persistent-profile');
fs.mkdirSync(PROFILE_DIR, { recursive: true });
process.env.BIZIMHESAP_PROFILE_DIR = PROFILE_DIR;
process.env.BIZIMHESAP_HEADLESS = process.env.BIZIMHESAP_HEADLESS || 'true';

const FIRMA = { id: 'alayli', adi: 'ALAYLI MEDIKAL', arama: 'ALAYLI' };
const GIDER_URL = 'https://bizimhesap.com/web/ngn/acc/ngncostss';

let browser, page;

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o'); }
const para = n => Math.abs(Number(n || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function ensureSession() {
  if (browser && page && !page.isClosed()) {
    // Oturum hala canli mi kontrol et - login sayfasina dusmus mu bak.
    const url = page.url();
    if (!/bhlogin|account\/login/i.test(url)) return;
    log('Oturum dusmus gorunuyor, yeniden giris deneniyor...');
  }
  if (browser) await browser.close().catch(() => {});
  browser = await puppeteer.launch(launchOptions({ headless: process.env.BIZIMHESAP_HEADLESS !== 'false', width: 1366, height: 768 }));
  page = await browser.newPage();
  await loginBizimHesap(page, log);
  await selectFirma(page, FIRMA, log);
  log('Oturum acildi, bu sekilde acik kalacak (komut basina yeniden giris YOK).');
}

async function tiklaMenu(kelime) {
  const tiklandi = await page.evaluate(k => {
    const norm2 = s => (s || '').toLowerCase().replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const hedef = norm2(k);
    const el = [...document.querySelectorAll('a,button,span,div')].find(x => norm2(x.innerText).includes(hedef) && (x.innerText || '').length < 80);
    if (!el) return false;
    (el.closest('a') || el.closest('button') || el).click();
    return true;
  }, kelime);
  if (tiklandi) { await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {}); await new Promise(r => setTimeout(r, 800)); }
  return tiklandi;
}

async function bizimhesapVerify(search) {
  await page.goto(GIDER_URL, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));
  await tiklaMenu('Tümü');
  await new Promise(r => setTimeout(r, 800));
  const yazildi = await page.evaluate((needle) => {
    const label = [...document.querySelectorAll('*')].find(x => (x.textContent || '').trim() === 'Ara:' && x.children.length === 0);
    let input = null;
    if (label) { let cur = label.parentElement; for (let i = 0; i < 4 && cur && !input; i++) { input = cur.querySelector('input[type="text"],input:not([type])'); cur = cur.parentElement; } }
    if (!input) input = document.querySelector('input[type="text"],input:not([type])');
    if (!input) return false;
    input.focus(); input.value = needle;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    return true;
  }, search);
  await new Promise(r => setTimeout(r, 2000));
  const bodyText = await page.evaluate(() => document.body.innerText || '');
  const found = bodyText.includes(search) && !bodyText.includes('bulunamadı');
  return { yazildi, found, ozet: bodyText.replace(/\s+/g, ' ').slice(0, 800) };
}

async function bizimhesapPostExpense(row) {
  // row: {tarih, tutar, aciklama, hesap}
  await page.goto(GIDER_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('a,button,input,select,textarea', { timeout: 15000 });
  await page.evaluate(() => {
    const norm2 = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const el = [...document.querySelectorAll('a,button')].find(x => ['yeni masraf gir', 'yeni masraf', 'masraf gir', 'masraf ekle'].some(k => norm2(x.innerText || x.value || '').includes(k)));
    if (el) el.click();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));
  await page.waitForSelector('input,textarea,select,button', { timeout: 15000 });

  const dolduruldu = await page.evaluate((hareket) => {
    const norm2 = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const setSelectByText = texts => { const wants = texts.map(norm2); for (const s of [...document.querySelectorAll('select')].filter(visible)) { const opt = [...s.options].find(o => wants.some(w => norm2(o.text).includes(w))); if (opt) { s.value = opt.value; s.dispatchEvent(new Event('change', { bubbles: true })); return true; } } return false; };
    const fieldText = x => { const box = x.getBoundingClientRect(); const labels = [...document.querySelectorAll('label,.control-label,td,th,div,span')].filter(visible).filter(y => { const b = y.getBoundingClientRect(); return (b.right <= box.left + 10 && Math.abs((b.top + b.bottom) / 2 - (box.top + box.bottom) / 2) < 40) || (b.bottom <= box.top + 10 && Math.abs((b.left + b.right) / 2 - (box.left + box.right) / 2) < 180); }).map(y => y.innerText || '').join(' '); return norm2([x.name, x.id, x.placeholder, x.getAttribute('aria-label'), x.closest('label')?.innerText, labels].join(' ')); };
    const setValue = (el, value) => { el.focus(); el.value = value == null ? '' : String(value); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); return true; };
    const setByHint = (hints, value) => { const hs = hints.map(norm2); const el = [...document.querySelectorAll('input,textarea')].filter(visible).find(x => hs.some(h => fieldText(x).includes(h))); return el ? setValue(el, value) : false; };
    setSelectByText(['mali gider']);
    setSelectByText(['banka masraf']);
    setSelectByText(['odendi', 'ödendi']);
    setSelectByText([hareket.hesap || '*is bankasi', '*iş bankası', 'is bankasi', 'iş bankası']);
    const t1 = setByHint(['tarih'], hareket.tarih);
    const t2 = setByHint(['odeme tarihi', 'ödeme tarihi'], hareket.tarih);
    const tutarOk = setByHint(['tutar', 'amount', 'meblag'], hareket.tutar);
    const aciklamaOk = setByHint(['aciklama', 'not', 'description'], hareket.aciklama);
    return { tarih: t1 || t2, tutar: tutarOk, aciklama: aciklamaOk };
  }, row);

  if (!dolduruldu.tarih || !dolduruldu.tutar || !dolduruldu.aciklama) {
    return { ok: false, mesaj: 'Form alanlari eksik: ' + JSON.stringify(dolduruldu) };
  }

  const tiklandi = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button,a,input[type="submit"]')].find(x => (x.innerText || x.value || '').toLowerCase().includes('kaydet'));
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!tiklandi) return { ok: false, mesaj: 'Kaydet butonu bulunamadi' };
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  // DOGRULAMA: tikladim demek yetmez, GERCEKTEN listede goruyor muyum kontrol et.
  const dogrulama = await bizimhesapVerify(row.aciklama);
  return { ok: dogrulama.found, mesaj: dogrulama.found ? 'Kaydedildi ve listede dogrulandi.' : 'Kaydet tiklandi ama listede DOGRULANAMADI: ' + dogrulama.ozet };
}

// Genel amacli sayfa okuma: bir menu yoluna tikla (opsiyonel), bir URL'e git,
// opsiyonel arama yap, sayfanin tam metnini ve varsa tablo satirlarini dondur.
// Bunun icin: params.url (tam URL) VEYA params.menu (["Tedarikçiler"] gibi tiklanacak menu adlari dizisi),
// params.search (opsiyonel arama kutusuna yazilacak metin).
async function bizimhesapFetch(params) {
  if (params.url) {
    await page.goto(params.url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  } else if (Array.isArray(params.menu)) {
    for (const kelime of params.menu) {
      await tiklaMenu(kelime);
      await new Promise(r => setTimeout(r, 600));
    }
  }
  await new Promise(r => setTimeout(r, 1000));

  if (params.search) {
    await page.evaluate((needle) => {
      const input = document.querySelector('input[type="text"],input:not([type])');
      if (!input) return false;
      input.focus(); input.value = needle;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      return true;
    }, params.search);
    await new Promise(r => setTimeout(r, 1500));
  }

  const sonuc = await page.evaluate(() => {
    const tables = [...document.querySelectorAll('table')].map(t =>
      [...t.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('td,th')].map(td => (td.innerText || '').trim()))
    );
    return { url: location.href, metin: (document.body.innerText || '').replace(/\s+/g, ' ').trim(), tablolar: tables };
  });
  return sonuc;
}

async function handleCommand(cmd) {
  log(`Komut alindi: #${cmd.id} komut=${cmd.command} params=${JSON.stringify(cmd.params)}`);
  await db.from('bot_commands').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', cmd.id);
  const params = cmd.params || {};
  let outcome;
  try {
    await ensureSession();
    if (cmd.command === 'bizimhesap_verify') {
      const r = await bizimhesapVerify(params.search || 'APERION AUTO');
      outcome = { ok: true, output: `bulundu=${r.found} | ${r.ozet}` };
    } else if (cmd.command === 'bizimhesap_fetch') {
      const r = await bizimhesapFetch(params);
      outcome = { ok: true, output: JSON.stringify(r).slice(0, 7900) };
    } else if (cmd.command === 'bizimhesap_process') {
      const { data: row, error } = await db.from(BANK_TABLE).select('*').eq('id', params.id).single();
      if (error || !row) { outcome = { ok: false, output: `Kayit bulunamadi: ${error?.message || params.id}` }; }
      else {
        const aciklama = `APERION AUTO | ID:${row.id} | TIP:${row.tur} | FIRMA:${row.firma_id} | ${(row.aciklama || '').slice(0, 150)}`;
        const r = await bizimhesapPostExpense({ tarih: row.tarih, tutar: para(row.tutar), aciklama, hesap: row.hesap });
        outcome = { ok: r.ok, output: r.mesaj };
        if (r.ok) await db.from(BANK_TABLE).update({ bizimhesap_durumu: 'kaydedildi', bizimhesap_mesaj: r.mesaj, bizimhesap_islem_tarihi: new Date().toISOString() }).eq('id', row.id);
      }
    } else {
      outcome = { ok: false, output: `Bilinmeyen komut: ${cmd.command}` };
    }
  } catch (e) {
    outcome = { ok: false, output: String(e.message || e) };
  }
  await db.from('bot_commands').update({ status: outcome.ok ? 'completed' : 'failed', result: outcome.output.slice(0, 8000), completed_at: new Date().toISOString() }).eq('id', cmd.id);
  log(`Komut bitti: #${cmd.id} -> ${outcome.ok ? 'completed' : 'failed'}`);
}

async function tick() {
  const { data, error } = await db.from('bot_commands').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (error) { log(`HATA (sorgu): ${error.message}`); return; }
  if (data) await handleCommand(data);
}

(async () => {
  log('AperiON yerel dinleyici (v2, kalici oturum) baslatiliyor...');
  await ensureSession();
  log('Oturum hazir. Komut bekleniyor (her 15 saniyede bir kontrol)...');
  tick();
  setInterval(tick, 15000);
})();
