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

  // 2026-08-06: bulanik label-yakinlik eslestirmesi (fieldText/setByHint)
  // alanlari BIRBIRINE KARISTIRIYORDU - tutar degeri "Odeme Tarihi"
  // (txtDueDate) alanina, aciklama ise "Islem Tarihi" (txtDocumentDate)
  // alanina yaziliyordu; gercek txtAmount/txtNote BOS kaliyordu. Sunucunun
  // gercek POST cevabini diske dump edip alan haritasini id'leriyle net
  // tespit ettik (ASP.NET WebForms, id'ler sabit): txtDocumentDate=Islem
  // Tarihi, txtDueDate=Odeme Tarihi(Vade), txtAmount=Tutar, txtNote=Aciklama,
  // ddlCostAccounts=Masraf Kalemi, ddlPaymentOption=Odeme Durumu,
  // ddlCashierNew=Hesap. Artik ID ile DOGRUDAN hedefleniyor, fuzzy yok.
  const dolduruldu = await page.evaluate((hareket) => {
    const norm2 = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const nativeSelectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    const byId = id => document.getElementById(id);
    const setInput = (id, value) => { const el = byId(id); if (!el) return false; el.focus(); nativeInputSetter.call(el, value == null ? '' : String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); return el.value === String(value); };
    const setTextarea = (id, value) => { const el = byId(id); if (!el) return false; el.focus(); nativeTextareaSetter.call(el, value == null ? '' : String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); return el.value === String(value); };
    const setSelect = (id, texts) => { const s = byId(id); if (!s) return false; const wants = texts.map(norm2); const opt = [...s.options].find(o => wants.some(w => norm2(o.text).includes(w))); if (!opt) return false; nativeSelectSetter.call(s, opt.value); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); return true; };

    const tarihOk = setInput('txtDocumentDate', hareket.tarih);
    const vadeOk = setInput('txtDueDate', hareket.tarih);
    const tutarOk = setInput('txtAmount', hareket.tutar);
    const aciklamaOk = setTextarea('txtNote', hareket.aciklama);
    const masrafOk = setSelect('ddlCostAccounts', ['banka masraf']);
    const odemeOk = setSelect('ddlPaymentOption', ['odendi', 'ödendi']);
    const hesapHints = hareket.hesap ? [hareket.hesap] : ['*is bankasi', '*iş bankası', 'is bankasi', 'iş bankası'];
    const hesapOk = setSelect('ddlCashierNew', hesapHints);
    const selectDump = ['ddlCostAccounts', 'ddlPaymentOption', 'ddlCashierNew'].map(id => { const s = byId(id); return { id, secili: s?.selectedOptions[0]?.text || '(yok)' }; });
    return { tarih: tarihOk && vadeOk, tutar: tutarOk, aciklama: aciklamaOk, masrafOk, odemeOk, hesapOk, selectDump };
  }, row);

  if (!dolduruldu.tarih || !dolduruldu.tutar || !dolduruldu.aciklama || !dolduruldu.masrafOk || !dolduruldu.hesapOk) {
    return { ok: false, mesaj: 'Form alanlari eksik: ' + JSON.stringify(dolduruldu) };
  }

  // Gercek tani: Kaydet click'i sirasinda network cevaplarini, konsol
  // hatalarini ve olasi alert/confirm dialoglarini Puppeteer seviyesinde
  // yakala - page.evaluate() icinden bunlar gorulemiyor (2026-08-06,
  // native-setter fix de sorunu cozmedi, kok neden hala bilinmiyor).
  const agListesi = [];
  const konsolListesi = [];
  const dialogListesi = [];
  const onResponse = async (res) => {
    try {
      const url = res.url();
      if (!/bizimhesap\.com/i.test(url)) return;
      const method = res.request().method();
      if (method === 'GET' && res.status() < 400) return;
      let govde = '';
      try { govde = await res.text(); } catch {}
      const kisaUrl = url.replace('https://bizimhesap.com', '');
      let gercekBizimHesapPost = false;
      try { const u = new URL(url); gercekBizimHesapPost = u.hostname === 'bizimhesap.com' && /\/ngncostentry/i.test(u.pathname); } catch {}
      if (gercekBizimHesapPost && method === 'POST') {
        // Bu, Kaydet'in gercek POST cevabi - DB'nin 8000 karakter siniri ve
        // kelime-eslesmeli kirpma yaniltici oldugu icin (websocket JS
        // boilerplate'i "error" kelimesiyle yanlis eslesip gercek hatayi
        // gizledi) TAM govdeyi diske yaz, ozet olarak sadece uzunluk dondur.
        try { fs.writeFileSync(path.join(__dirname, '..', 'local-secrets', 'kaydet_response.html'), govde); } catch {}
        govde = `TAM_GOVDE_DISKE_YAZILDI uzunluk=${govde.length} local-secrets/kaydet_response.html`;
      } else {
        govde = govde.slice(0, 200);
      }
      agListesi.push(`${method} ${res.status()} ${kisaUrl} :: ${govde}`);
    } catch {}
  };
  const onConsole = (msg) => { if (['error', 'warning'].includes(msg.type())) konsolListesi.push(`[${msg.type()}] ${msg.text()}`); };
  const onDialog = async (dialog) => { dialogListesi.push(`${dialog.type()}: ${dialog.message()}`); await dialog.dismiss().catch(() => {}); };
  page.on('response', onResponse);
  page.on('console', onConsole);
  page.on('dialog', onDialog);

  const tiklandi = await page.evaluate(() => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const btn = [...document.querySelectorAll('button,a,input[type="submit"],input[type="button"]')]
      .filter(visible)
      .filter(x => !x.disabled)
      .find(x => (x.innerText || x.value || '').trim().toLowerCase().includes('kaydet'));
    if (!btn) return false;
    btn.scrollIntoView({ block: 'center' });
    btn.click();
    return true;
  });
  if (!tiklandi) { page.off('response', onResponse); page.off('console', onConsole); page.off('dialog', onDialog); return { ok: false, mesaj: 'Kaydet butonu bulunamadi' }; }
  await new Promise(r => setTimeout(r, 2500));
  const hemenSonra = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 400)).catch(() => '');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));
  const urlSonra = page.url();
  page.off('response', onResponse);
  page.off('console', onConsole);
  page.off('dialog', onDialog);

  const tani = `AG:[${agListesi.join(' | ') || 'yok'}] KONSOL:[${konsolListesi.join(' | ') || 'yok'}] DIALOG:[${dialogListesi.join(' | ') || 'yok'}]`;

  // DOGRULAMA: tikladim demek yetmez, GERCEKTEN listede goruyor muyum kontrol et.
  const dogrulama = await bizimhesapVerify('APERION AUTO | ID:' + (row.id || ''));
  return { ok: dogrulama.found, mesaj: dogrulama.found ? 'Kaydedildi ve listede dogrulandi.' : `Kaydet sonrasi (${urlSonra}): ${hemenSonra.slice(0,200)} | TANI: ${tani}` };
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
        const r = await bizimhesapPostExpense({ id: row.id, tarih: row.tarih, tutar: para(row.tutar), aciklama, hesap: row.hesap });
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
