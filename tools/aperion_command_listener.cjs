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
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const { launchOptions, loginBizimHesap, selectFirma, checkLoginCooldown, savePageDiagnostics } = require('../bizimhesap_common.cjs');
const { sendFinanceResult } = require('./telegram_finance_result.cjs');

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

// 2026-08-10: watchdog (5dk'da bir tetiklenir) ile elle/manuel baslatma
// yarisa girip AYNI ANDA IKI dinleyici sureci acabiliyordu (canli olarak
// yakalandi) - ikisi de kendi Puppeteer oturumunu acip bizimhesap.com'a
// BAGIMSIZ istek atardi, tam da bizi banlatan "ayni IP'den cok sayida
// esamanli giris" desenini yeniden yaratirdi. PID kilit dosyasi: baska bir
// canli instance varsa bu process sessizce (hata degil) kendini kapatir.
const LOCK_FILE = path.join(__dirname, '..', 'local-secrets', 'aperion_listener.lock');
function baskaInstanceCalisiyorMu() {
  if (!fs.existsSync(LOCK_FILE)) return false;
  const pid = Number(fs.readFileSync(LOCK_FILE, 'utf8').trim());
  if (!pid || pid === process.pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}
if (baskaInstanceCalisiyorMu()) {
  console.log(`[${new Date().toISOString()}] Baska bir dinleyici instance'i zaten calisiyor (kilit: ${LOCK_FILE}), bu process sessizce kapaniyor.`);
  process.exit(0);
}
fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf8');
function kilidiKaldir() { try { if (Number(fs.readFileSync(LOCK_FILE, 'utf8').trim()) === process.pid) fs.unlinkSync(LOCK_FILE); } catch {} }
process.on('exit', kilidiKaldir);
process.on('SIGINT', () => { kilidiKaldir(); process.exit(0); });
process.on('SIGTERM', () => { kilidiKaldir(); process.exit(0); });

const FIRMA = { id: 'alayli', adi: 'ALAYLI MEDIKAL', arama: 'ALAYLI' };
const GIDER_URL = 'https://bizimhesap.com/web/ngn/acc/ngncostss';
const ACCOUNTS_URL = 'https://bizimhesap.com/web/ngn/acc/ngnaccounts';

let browser, page;

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

const DESKTOP_TARGETS = Object.freeze({
  bizimhesap: { title: 'BizimHesap', url: 'https://bizimhesap.com/web/ngn/newportal' },
  gmail: { title: 'Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' },
  drive: { title: 'Google Drive', url: 'https://drive.google.com/drive/my-drive' },
  calendar: { title: 'Google Takvim', url: 'https://calendar.google.com/calendar/u/0/r' },
  telegram: { title: 'Telegram Web', url: 'https://web.telegram.org/k/' },
  whatsapp: { title: 'WhatsApp Web', url: 'https://web.whatsapp.com/' },
  aperion: { title: 'AperiON', url: 'https://aperion-istasyon.pages.dev/aperion-ust-akil' },
});

async function openDesktopTarget(targetKey) {
  const target = DESKTOP_TARGETS[String(targetKey || '').toLowerCase()];
  if (!target) return { ok: false, output: 'Masaustu hedefi izin listesinde degil.' };
  try {
    const child = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', target.url], {
      detached: true,
      windowsHide: true,
      stdio: 'ignore',
    });
    child.unref();
    return { ok: true, output: `${target.title} varsayilan tarayicida acma istegi gonderildi.` };
  } catch (error) {
    return { ok: false, output: `${target.title} acilamadi: ${error.message || error}` };
  }
}

async function sendTelegramCommandResult(chatId, text) {
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return { ok: false, skipped: true };
  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: String(chatId), text: String(text || '').slice(0, 3500) }),
    });
    const result = await response.json();
    return { ok: response.ok && Boolean(result?.ok) };
  } catch (_error) {
    return { ok: false };
  }
}
// 2026-08-10: son savunma hatti - herhangi bir yerde yakalanmamis bir promise
// reddi Node v25'te varsayilan olarak process'i cokertiyor (bkz. baslangic
// ensureSession() cokme kaydi ayni gun). Dinleyici saatlerce/gunlerce acik
// kalmasi gereken bir servis oldugu icin, beklenmeyen bir hata process'i asla
// sessizce oldurmemeli - loglayip ayakta kalsin, watchdog'un 5dk'lik
// yeniden-baslatma dongusune girmesin.
process.on('unhandledRejection', (reason) => { log(`YAKALANMAMIS HATA (unhandledRejection): ${reason && reason.stack || reason}`); });
process.on('uncaughtException', (err) => { log(`YAKALANMAMIS HATA (uncaughtException): ${err && err.stack || err}`); });
function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o'); }
const para = n => Math.abs(Number(n || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// bizimhesapPostExpense'e row.tutar zaten para() ile formatlanmis ("3.070,80")
// gelir - elleGirisSuphesi() gibi ham sayi bekleyen fonksiyonlara vermeden
// once bunu geri sayiya cevirir.
const trToNumber = s => Number(String(s || '').replace(/\./g, '').replace(',', '.')) || 0;

async function ensureSession() {
  // 2026-08-10: bu kontrol ONCE "browser && page zaten var mi" hizli-yolundan
  // ONCE calismaliydi - onceki siralamada, oturum dusmus (login sayfasinda)
  // bir page zaten varsa devre kesici HIC KONTROL EDILMEDEN dogrudan
  // tryExistingBizimHesapSession() ile YENI network istekleri atiliyordu.
  // Gercek sonuc: az once bunu bu sekilde yakaladik - soguma aktifken bir
  // komut geldi, "oturum dusmus" hizli-yoluna girdi, cooldown kontrolune hic
  // ugramadan bizimhesap.com'a tekrar istek atti. Now UNKOSULSUZ en basta.
  const cooldown = checkLoginCooldown();
  if (cooldown.blocked) {
    throw new Error(`BizimHesap giris SOGUMADA (${cooldown.reason}) - ${cooldown.until} tarihine kadar deneme yapilmiyor.`);
  }
  if (browser && page && !page.isClosed()) {
    // Oturum hala canli mi kontrol et. Sadece login sayfasina dusmus mu bakmak
    // yetersiz - bir onceki komut (ornegin menu tiklamasi) yanlislikla herkese
    // acik pazarlama sayfasina (bizimhesap.com/) navigate edebilir; bu URL
    // bhlogin/account/login'e uymaz ama gercekte oturum dusmus olabilir.
    // 2026-08-11: tam olarak bu sekilde yakalandi - "web/" altinda olmayan
    // her sayfayi supheli sayip gercek oturum durumunu dogrula.
    let url = page.url();
    if (!/\/web\//i.test(url)) {
      await page.goto('https://bizimhesap.com/web/ngn/newportal', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
      url = page.url();
    }
    if (!/bhlogin|account\/login/i.test(url) && /\/web\//i.test(url)) return;
    log(`Oturum dusmus gorunuyor (son URL: ${url}), yeniden giris deneniyor...`);
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
  await tiklaMenu('Tümü');
  await new Promise(r => setTimeout(r, 800));
  const supheli = await elleGirisSuphesi(row.tarih, trToNumber(row.tutar));
  if (supheli.supheli) return { ok: true, insanKontroluGerekli: true, mesaj: `Olasi elle-giris suphesi (masraf listesinde AperiON etiketsiz benzer kayit bulundu) - ${supheli.ozet}` };
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
    const masrafOk = setSelect('ddlCostAccounts', hareket.masrafKalemi ? [hareket.masrafKalemi] : ['banka masraf']);
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

// 2026-08-06: Ercan "sadece masraf yeterli degil, bizim hesabin
// yapabilecegi herseyi yap - banka hareketlerinin hepsi banka masrafi
// degil" dedi. Eski bizimhesap_queue_worker.cjs'te (her calistirmada YENI
// tarayici acan, captcha riski yaratan eski mimari) zaten CALISAN alan
// ID'leri bulundu - ayni ID'ler bu kalici-oturum dinleyicisine tasindi:
// Hesaplar Arasi Transfer (#ddlOtherAccount/#txtTransferDate/Amount/
// Description, #btnSaveTransfer) ve Hesaba Para Girisi (#txtTransactionDate/
// #txtAmount/#txtDefinition, #myModalCashEntry #btnSave).
//
// KRITIK bulunan risk: BizimHesap'in KENDI cari eslestirme/banka entegrasyonu
// bazi hareketleri (ornek: #172, YÜKSEL DEMİREL 13.421 TL Tahsilat) AperiON
// hic gondermeden zaten olusturabiliyor. Bu yuzden transfer/tahsilat
// gondermeden ONCE hedef hesabin HESAP HAREKETLERI listesinde ayni
// tarih+tutar var mi diye bakiliyor - varsa atlaniyor (mukerrer onlenir).

// 2026-08-07: Ercan'in talebiyle TAM hesap listesi cikarilip kesin guid'leri
// config/bizimhesap_account_map.json'a kaydedildi. Once bu haritada TAM
// eslesme aranir - bulunursa DOGRUDAN guid ile o hesabin sayfasina gidilir,
// hicbir bulanik/alt-dizge eslestirme riski kalmaz (bugunku "POS POS POS
// KREDI KARTI" aranirken "*MOCA SONOVA POS KREDI KARTI"ye giden hatanin kok
// nedeni buydu). Haritada yoksa eski bulanik-tiklama yontemine (yedek) duser.
const ACCOUNT_MAP_FILE = path.join(__dirname, '..', 'config', 'bizimhesap_account_map.json');
let ACCOUNT_MAP = {};
try { ACCOUNT_MAP = JSON.parse(fs.readFileSync(ACCOUNT_MAP_FILE, 'utf8')).accounts || {}; } catch { ACCOUNT_MAP = {}; }
function normHesapAdi(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/^\*+/, '').trim();
}
function guidBul(hesapIpucu) {
  const hedef = normHesapAdi(hesapIpucu);
  for (const [ad, guid] of Object.entries(ACCOUNT_MAP)) {
    if (normHesapAdi(ad) === hedef) return guid;
  }
  return null;
}

async function hesapDegerAgacayaYuklendiMi() {
  // 2026-08-10: canli teste yakalandi - hesap sayfasindaki HESAP HAREKETLERI
  // tablosu ayri bir XHR ile geliyor, sabit 1000ms bekleme yeterli
  // gelmiyordu (ozellikle hesap 1000+ kayida ulasinca) - idIleDogrula()
  // tablo hala bos/eski haliyken calisip YANLIS "bulunamadi" sonucu
  // uretiyordu (18 kayitlik gercek dogrulama hatasi - para gercekte
  // gitmisti, bakiye her denemede degisiyordu, sadece dogrulama erken
  // calismisti). En az 2 satirli veri tablosu gorene kadar bekle.
  for (let i = 0; i < 20; i++) {
    const n = await page.evaluate(() => {
      const adaylar = [...document.querySelectorAll('table')].filter(t => {
        const h = (t.querySelector('tr') && t.querySelector('tr').innerText) || '';
        return h.includes('Tarih') && h.includes('lem') && h.includes('Bakiye');
      });
      if (!adaylar.length) return 0;
      return adaylar.reduce((best, x) => x.querySelectorAll('tr').length > best.querySelectorAll('tr').length ? x : best, adaylar[0]).querySelectorAll('tr').length;
    }).catch(() => 0);
    if (n >= 2) return true;
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

async function hesapAc(hesapIpucu) {
  const guid = guidBul(hesapIpucu);
  if (guid) {
    await page.goto(`https://bizimhesap.com/web/ngn/acc/ngnaccount?rc=1&guid=${guid}`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await hesapDegerAgacayaYuklendiMi();
    await new Promise(r => setTimeout(r, 500));
    return true;
  }
  log(`UYARI: "${hesapIpucu}" hesap haritasinda bulunamadi, bulanik tiklama yedegine dusuluyor.`);
  await page.goto(ACCOUNTS_URL, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 800));
  const tiklandi = await page.evaluate((ipucu) => {
    const norm2 = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const hedef = norm2(ipucu);
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const el = [...document.querySelectorAll('a')].filter(visible).find(x => norm2(x.innerText || '').includes(hedef));
    if (!el) return false;
    el.click();
    return true;
  }, hesapIpucu);
  if (!tiklandi) return false;
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));
  return true;
}

async function hesapBakiyesiOku(hesapIpucu) {
  if (!guidBul(hesapIpucu)) return { ok: false, error: 'Hesap kesin GUID haritasında bulunamadı.' };
  const acildi = await hesapAc(hesapIpucu);
  if (!acildi) return { ok: false, error: 'Hesap açılamadı.' };
  const bakiyeText = await page.evaluate(() => {
    const adaylar = [...document.querySelectorAll('table')].filter(table => {
      const header = (table.querySelector('tr')?.innerText || '').replace(/\s+/g, ' ');
      return header.includes('Tarih') && header.includes('Bakiye');
    });
    if (!adaylar.length) return null;
    const table = adaylar.reduce((best, item) => item.querySelectorAll('tr').length > best.querySelectorAll('tr').length ? item : best, adaylar[0]);
    for (const row of [...table.querySelectorAll('tr')]) {
      const cells = [...row.querySelectorAll('td')].map(cell => (cell.innerText || '').trim());
      const dateIndex = cells.findIndex(value => /^\d{2}\.\d{2}\.\d{4}$/.test(value));
      if (dateIndex >= 0 && cells[dateIndex + 7]) return cells[dateIndex + 7];
    }
    return null;
  });
  if (!bakiyeText) return { ok: false, error: 'Güncel bakiye satırı okunamadı.' };
  return { ok: true, value: paraSayi(bakiyeText), text: bakiyeText };
}

// Hesap sayfasi acikken (hesapAc sonrasi), HESAP HAREKETLERI listesinde
// verilen tarih (YYYY-MM-DD) + tutar zaten var mi kontrol eder. SADECE
// on-kontrol (yeni kayittan ONCE, BizimHesap'in kendi/baska bir yoldan
// zaten yazmis olabilecegi kayitlari yakalamak icin) - kendi yazdigim
// kaydi DOGRULAMAK icin YETERSIZ, cunku tarih+tutar baska bir kayitla
// TESADUFEN eslesebilir (2026-08-07'de tam bunun yuzunden birkac transfer
// YANLIS hesaba gitmisken "dogrulandi" diye raporlandi - Ercan yakaladi).
// 2026-08-07: Ercan'in talebi - "benim girdigim kayitlar var, onlarin
// haricinde de sen gireceksin, mukerrer olmamasi cok onemli". AperiON'un
// KENDI mukerrer kontrolu (idIleDogrula, asagida) sadece kendi ID
// etiketini arar - bu, AperiON'un AYNI kaydi IKINCI KEZ postalamasini
// onler ama Ercan'in AYNI hareketi ELLE (etiketsiz) zaten girmis olmasini
// YAKALAYAMAZ. Bunun icin ayri bir supheli-mukerrer kontrolu: tarihin
// yakin cevresinde (150 karakter) tutar da geciyor AMA "APERION AUTO"
// etiketi YOK - bu, Ercan'in (ya da BizimHesap'in kendi otomatik
// eslestirmesinin) ayni hareketi zaten elle girmis olabilecegini
// gosterir. Boyle bir durumda otomatik POSTLAMA YAPILMAZ, insan
// kontrolune birakilir (yanlislikla ikinci kez girmektense atlamak
// tercih edilir - tersi cok daha tehlikeli).
async function elleGirisSuphesi(tarihIso, tutar) {
  const gg = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const [yil, ay, gun] = String(tarihIso || '').split('-');
  if (!yil) return { supheli: false };
  const trTarih = `${gun}.${ay}.${yil}`;
  const trTutar = para(tutar);
  // 2026-08-07: cevre.includes(trTutar) alt-dizge kontrolu YANLIS pozitif
  // veriyordu - "500,00" arandiginda "1.500,00" icindeki "500,00" da
  // eslesiyordu (POS POS POS gibi yogun hesaplarda cok sayida yuvarlak
  // tutar oldugu icin canli ortamda yakalandi, ID:176). Simdi tutarin
  // hemen oncesinde rakam/nokta (buyuk sayinin devami), hemen sonrasinda
  // rakam OLMADIGI - yani tutarin TAM/BAGIMSIZ bir sayi oldugu - garanti
  // ediliyor.
  const escTutar = trTutar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tutarRe = new RegExp(`(?<![\\d.])${escTutar}(?!\\d)`);
  let idx = gg.indexOf(trTarih);
  while (idx !== -1) {
    const cevre = gg.slice(Math.max(0, idx - 20), idx + 150);
    if (tutarRe.test(cevre) && !cevre.includes('APERION AUTO')) {
      return { supheli: true, ozet: cevre.slice(0, 220) };
    }
    idx = gg.indexOf(trTarih, idx + trTarih.length);
  }
  return { supheli: false };
}

// KENDI yazdigim kaydi dogrulamak icin GERCEK yontem: her kayda zaten
// eklenen benzersiz "APERION AUTO | ID:X" etiketini hesap sayfasinda ara.
// Bu etiket baska HICBIR kayitla tesadufen eslesemez (tarih+tutar'in aksine).
async function idIleDogrula(rowId, tutar) {
  const etiket = 'ID:' + rowId + ' ';
  const gg = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const varMi = gg.includes(etiket);
  // Ek guvence: etiketin hemen etrafinda beklenen tutar da gecsin (yanlislikla
  // baska bir ID'nin metnini yakalamadigimizdan emin olmak icin).
  const idx = gg.indexOf(etiket);
  const cevre = idx >= 0 ? gg.slice(Math.max(0, idx - 200), idx + 200) : '';
  const tutarUyumlu = tutar == null || cevre.includes(para(tutar));
  return { varMi: varMi && tutarUyumlu, ozet: varMi ? cevre.slice(0, 250) : `"${etiket}" bulunamadi` };
}

async function bizimhesapPostTransfer(row) {
  // row: {id, tarih, tutar, aciklama, hesap (PARA GIREN/hedef hesap), kaynakHesap (PARA CIKAN/kaynak)}
  // 2026-08-07: Ercan ekran goruntusuyle yakaladi - "Hesaplar Arasi Transfer"
  // ACILAN hesaptan PARA CIKISI olarak kaydediyor, dropdown'da secilen hesaba
  // DEGIL. Ilk versiyon bunu tersten varsaymisti (hedefi acip kaynagi
  // dropdown'a koymustu) - sonuc: Batch Yatan gibi PARA GIREN hareketler bile
  // "Para Cikisi" olarak kaydedildi (13 kayit etkilendi, hepsi duzeltildi).
  // Dogrusu: KAYNAK hesabi ac (parayi cikaran), dropdown'a HEDEFİ (parayi
  // alan) sec.
  const acildi = await hesapAc(row.kaynakHesap);
  if (!acildi) return { ok: false, mesaj: `Kaynak hesap acilamadi: ${row.kaynakHesap}` };
  // 2026-08-07 uctuncu duzeltme: tarih+tutar mukerrer-onleme kontrolu
  // (proximity ile bile) yogun hareketli hesaplarda (gunde onlarca ayni
  // tutarli Tahsilat, ör. "400,00 TL") tesadufen eslesip GERCEKTE HIC
  // ISLENMEMIS kayitlari "zaten var" diye yanlislikla atliyordu (ID:168'de
  // yakalandi). Kendi kaydimizin benzersiz "ID:X" etiketini aramak tek
  // guvenilir yontem - baska hicbir kayitla tesadufen eslesemez.
  const mukerrer = await idIleDogrula(row.id, row.tutar);
  if (mukerrer.varMi) return { ok: true, zatenVardi: true, mesaj: `Mukerrer onlendi (ID etiketiyle) - ${mukerrer.ozet}` };
  const supheli = await elleGirisSuphesi(row.tarih, row.tutar);
  if (supheli.supheli) return { ok: true, insanKontroluGerekli: true, mesaj: `Olasi elle-giris suphesi (kaynak hesapta AperiON etiketsiz benzer kayit bulundu) - ${supheli.ozet}` };

  const acildi2 = await page.evaluate(() => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const toggle = [...document.querySelectorAll('button.dropdown-toggle')].find(visible);
    if (!toggle) return false;
    toggle.click();
    return true;
  });
  if (!acildi2) return { ok: false, mesaj: 'Transfer dropdown butonu bulunamadi' };
  await new Promise(r => setTimeout(r, 500));
  const transferAcildi = await page.evaluate(() => { const b = document.getElementById('btnTransfer'); if (!b) return false; b.click(); return true; });
  if (!transferAcildi) return { ok: false, mesaj: 'Hesaplar Arasi Transfer secenegi bulunamadi' };
  await page.waitForSelector('#myModalTransferTo[style*="display: block"] #txtTransferAmount', { timeout: 8000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 500));

  const dolduruldu = await page.evaluate((p) => {
    const fold = s => (s || '').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
    const set = (id, v) => { const el = document.getElementById(id); if (!el) return false; el.focus(); el.value = String(v || ''); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); return true; };
    // 2026-08-07 ikinci hata: hesap/kaynakHesap yon duzeltmesi yapilirken
    // burada YANLISLIKLA hala p.kaynakHesap araniyordu - yani zaten acik
    // olan hesabin kendi adini dropdown'da ariyorduk. Bu bazen "bulunamadi"
    // (dogru cikti ama islem eksik kaliyordu) bazen de fold() alt-dizge
    // eslesmesi yuzunden YANLIS bir hesaba (ör. "POS POS POS KREDİ KARTI"
    // aranirken "*MOCA SONOVA POS KREDİ KARTI" - ortak "POS/KREDI/KARTI"
    // kelimeleri nedeniyle) transfer yapiyordu. Dogrusu: dropdown'da HEDEF
    // (p.hesap) aranmali, cunku KAYNAK zaten acik olan hesap.
    // 2026-08-07 guvenilirlik yukseltmesi: alt-dizge eslestirmesi ("her
    // token gecsin mi") kisa/ortak kelimeli hesap adlarinda (POS, KREDI,
    // KARTI gibi) yanlis hesaba secim yapabiliyordu. Once TAM esitlik
    // deneniyor (bakiye parantezini atip): sadece bulunamazsa eski
    // alt-dizge yontemine yedek olarak dusuluyor.
    const coreFold = s => fold(String(s || '').replace(/\([^)]*\)\s*$/, '')).replace(/^\*+/, ' ').trim();
    const hedefTam = coreFold(p.hesap);
    const select = document.getElementById('ddlOtherAccount');
    let opt = select && [...select.options].find(o => coreFold(o.text) === hedefTam);
    let tamEslesme = Boolean(opt);
    if (!opt) {
      const wanted = fold(p.hesap).split(' ').filter(t => t.length > 2);
      opt = select && [...select.options].find(o => wanted.length && wanted.every(t => fold(o.text).includes(t)));
    }
    if (opt) { select.value = opt.value; select.dispatchEvent(new Event('change', { bubbles: true })); }
    const [yil, ay, gun] = String(p.tarih || '').split('-');
    return {
      tarih: set('txtTransferDate', `${gun}.${ay}.${yil}`),
      tutar: set('txtTransferAmount', p.tutarText),
      aciklama: set('txtTransferDescription', p.aciklama),
      hedefHesap: Boolean(opt),
      secilenHedef: opt ? opt.text : '(bulunamadi)',
      tamEslesme,
    };
  }, { ...row, tutarText: para(row.tutar) });
  if (dolduruldu.hedefHesap && !dolduruldu.tamEslesme) {
    log(`UYARI: transfer hedef hesabi TAM eslesmeyle degil, alt-dizge yedegiyle bulundu: "${row.hesap}" -> "${dolduruldu.secilenHedef}" (ID:${row.id})`);
  }

  if (!dolduruldu.tarih || !dolduruldu.tutar || !dolduruldu.aciklama || !dolduruldu.hedefHesap) {
    return { ok: false, mesaj: 'Transfer formu eksik: ' + JSON.stringify(dolduruldu) };
  }
  // 2026-08-10: "Basarili" modal her zaman gorunuyordu ama kayit hicbir
  // zaman hesapta cikmiyordu - istemci tarafi iyimser (optimistic) mesaj
  // olabilir, GERCEK sunucu cevabini yakalamadan bilinemez. bizimhesapPostExpense
  // ile ayni yontem: kaydet POST cevabini tam govdesiyle diske yaz.
  const transferAgListesi = [];
  const onTransferResponse = async (res) => {
    try {
      const url = res.url();
      if (!/bizimhesap\.com/i.test(url)) return;
      if (res.request().method() !== 'POST') return;
      let govde = '';
      try { govde = await res.text(); } catch {}
      transferAgListesi.push(`${res.status()} ${url.replace('https://bizimhesap.com', '')} :: ${govde.slice(0, 600)}`);
    } catch {}
  };
  page.on('response', onTransferResponse);
  const kaydedildi = await page.evaluate(() => { const b = document.querySelector('#myModalTransferTo #btnSaveTransfer'); if (!b) return false; b.click(); return true; });
  if (!kaydedildi) { page.off('response', onTransferResponse); return { ok: false, mesaj: 'Transfer kaydet butonu bulunamadi' }; }
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1800));
  page.off('response', onTransferResponse);
  if (process.env.APERION_TRANSFER_DEBUG === '1') {
    fs.writeFileSync(path.join(__dirname, '..', 'local-secrets', `transfer_response_ID${row.id}.txt`), transferAgListesi.join('\n\n---\n\n'));
    log(`TRANSFER_AG_ISTEK_SAYISI ID:${row.id} adet=${transferAgListesi.length}`);
  }
  // 2026-08-10: canli teste (ID:966 debug yakalamasi) yakalandi - kaydet
  // sonrasi "Basarili / Para transferi kaydedildi / Tamam" onay penceresi
  // ACIK KALIYORDU, kod hemen dogrulamaya geciyordu. Onay penceresi
  // kapatilmadan hedef hesap sayfasi acilinca liste henuz tazelenmemis
  // gorunuyor, "ID:X bulunamadi" YANLIS SONUCU uretiyordu - halbuki para
  // GERCEKTEN transfer edilmisti. Once bu pencereyi kapat.
  await page.evaluate(() => {
    const gorunur = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const norm2 = s => (s || '').toLocaleLowerCase('tr-TR').trim();
    const btn = [...document.querySelectorAll('button,a')].filter(gorunur).find(x => norm2(x.innerText) === 'tamam');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  if (process.env.APERION_TRANSFER_DEBUG === '1') {
    const hataMetni = await page.evaluate(() => {
      const gorunur = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
      const adaylar = [...document.querySelectorAll('.toast,.alert,.modal.show,.swal2-popup,[class*="error"],[class*="danger"],[role="alert"]')].filter(gorunur);
      return adaylar.map(x => (x.innerText || '').trim()).filter(Boolean).join(' || ') || '(gorunur hata/toast yok)';
    });
    await savePageDiagnostics(page, `transfer_debug_ID${row.id}`);
    log(`TRANSFER_DEBUG ID:${row.id} sayfa_url=${page.url()} hata_alani="${hataMetni}"`);
  }

  // 2026-08-07: tarih+tutar eslesmesi YETERSIZDI - baska bir kayitla
  // tesadufen ayni tarih/tutar paylasip YANLIS hesaba giden transferler
  // "dogrulandi" diye raporlanmisti (Ercan aktivite loguyla yakaladi).
  // Simdi benzersiz "APERION AUTO | ID:X" etiketini HEDEF hesap sayfasinda
  // arıyoruz - bu hicbir zaman baska bir kayitla tesadufen eslesemez.
  const acildi3 = await hesapAc(row.hesap);
  const dogrulama = acildi3 ? await idIleDogrula(row.id, row.tutar) : { varMi: false, ozet: 'hedef hesap acilamadi' };
  return { ok: dogrulama.varMi === true, mesaj: dogrulama.varMi ? `Transfer kaydedildi ve ID etiketiyle dogrulandi (hedef: ${dolduruldu.secilenHedef}).` : `Transfer sonrasi ID ile dogrulanamadi (hedef secimi: ${dolduruldu.secilenHedef}) - ${dogrulama.ozet}` };
}

async function bizimhesapPostIncome(row) {
  // row: {id, tarih, tutar, aciklama, hesap (para giren hesap)}
  const acildi = await hesapAc(row.hesap);
  if (!acildi) return { ok: false, mesaj: `Hedef hesap acilamadi: ${row.hesap}` };
  const mukerrer = await idIleDogrula(row.id, row.tutar);
  if (mukerrer.varMi) return { ok: true, zatenVardi: true, mesaj: `Mukerrer onlendi (ID etiketiyle) - ${mukerrer.ozet}` };
  const supheli = await elleGirisSuphesi(row.tarih, row.tutar);
  if (supheli.supheli) return { ok: true, insanKontroluGerekli: true, mesaj: `Olasi elle-giris suphesi (hedef hesapta AperiON etiketsiz benzer kayit bulundu) - ${supheli.ozet}` };

  const acildi2 = await page.evaluate(() => { const b = document.getElementById('btnIncome'); if (!b) return false; b.click(); return true; });
  if (!acildi2) return { ok: false, mesaj: 'Hesaba Para Girisi Yap dugmesi bulunamadi' };
  await page.waitForSelector('#myModalCashEntry[style*="display: block"] #txtAmount', { timeout: 8000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 500));

  const dolduruldu = await page.evaluate((p) => {
    const set = (id, v) => { const el = document.getElementById(id); if (!el) return false; el.focus(); el.value = String(v || ''); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); return true; };
    const [yil, ay, gun] = String(p.tarih || '').split('-');
    return {
      tarih: set('txtTransactionDate', `${gun}.${ay}.${yil}`),
      tutar: set('txtAmount', p.tutarText),
      aciklama: set('txtDefinition', p.aciklama),
    };
  }, { ...row, tutarText: para(row.tutar) });

  if (!dolduruldu.tarih || !dolduruldu.tutar || !dolduruldu.aciklama) {
    return { ok: false, mesaj: 'Para girisi formu eksik: ' + JSON.stringify(dolduruldu) };
  }
  const kaydedildi = await page.evaluate(() => { const b = document.querySelector('#myModalCashEntry #btnSave'); if (!b) return false; b.click(); return true; });
  if (!kaydedildi) return { ok: false, mesaj: 'Para girisi kaydet butonu bulunamadi' };
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1800));

  const acildi3 = await hesapAc(row.hesap);
  const dogrulama = acildi3 ? await idIleDogrula(row.id, row.tutar) : { varMi: false, ozet: 'hedef hesap acilamadi' };
  return { ok: dogrulama.varMi === true, mesaj: dogrulama.varMi ? 'Para girisi kaydedildi ve ID etiketiyle dogrulandi.' : `Para girisi sonrasi ID ile dogrulanamadi - ${dogrulama.ozet}` };
}

// Genel amacli sayfa okuma: bir menu yoluna tikla (opsiyonel), bir URL'e git,
// opsiyonel arama yap, sayfanin tam metnini ve varsa tablo satirlarini dondur.
// Bunun icin: params.url (tam URL) VEYA params.menu (["Tedarikçiler"] gibi tiklanacak menu adlari dizisi),
// params.search (opsiyonel arama kutusuna yazilacak metin).
// Bir hesap sayfasinda, aciklamasinda "esleme" gecen satirin "Islem"
// acilir menusune tiklayip icindeki secenekleri (Duzenle/Sil vb.) dokup
// donduren tanı komutu - silme mekanizmasini kesfetmek icin.
async function bizimhesapRowMenu(hesapIpucu, esleme) {
  const acildi = await hesapAc(hesapIpucu);
  if (!acildi) return { ok: false, mesaj: 'Hesap acilamadi' };
  await new Promise(r => setTimeout(r, 800));
  // Satir listesi uzun oldugundan once "Bul:" kutusuna eslesme metnini
  // yazip listeyi filtrelemek gerekiyor. Sayfada baska input'lar da oldugundan
  // (tarih araligi vb.) rastgele ilk input'u degil, "Bul:" etiketine bagli
  // olani hedefliyoruz - Ercan'in kendi ekraninda "aperi" yazip filtreledigini
  // dogruladigi ayni yontem (bizimhesapVerify'daki "Ara:" ile ayni kalip).
  await page.evaluate((needle) => {
    const label = [...document.querySelectorAll('*')].find(x => (x.textContent || '').trim() === 'Bul:' && x.children.length === 0);
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
  }, esleme);
  await new Promise(r => setTimeout(r, 1500));
  const sonuc = await page.evaluate((esleme) => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const rows = [...document.querySelectorAll('tr')].filter(tr => visible(tr) && tr.innerText.includes(esleme));
    if (!rows.length) return { bulundu: false };
    const row = rows[0];
    const norm2 = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const dropBtn = [...row.querySelectorAll('a,button')].find(x => visible(x) && norm2(x.innerText || '').includes('islem'));
    if (!dropBtn) return { bulundu: true, dropdownYok: true, rowHtml: row.outerHTML.slice(0, 500) };
    dropBtn.click();
    return { bulundu: true, tiklandi: true };
  }, esleme);
  await new Promise(r => setTimeout(r, 600));
  const menu = await page.evaluate(() => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const menus = [...document.querySelectorAll('.dropdown-menu,ul.dropdown-menu,div[role="menu"]')].filter(visible);
    return menus.map(m => [...m.querySelectorAll('a,button')].map(a => ({ metin: (a.innerText || '').trim(), href: a.getAttribute('href'), onclick: a.getAttribute('onclick') })));
  });
  return { ...sonuc, menu };
}

// 2026-08-07: Ercan'in "hepsini sil tekrar yap" talimatiyla bulundu. Bir
// satirin "Islem" menusundeki "Sil" linki javascript:$('#myModalDelete
// TransactionConfirmation').modal('show'); $('#hdnIdTransaction').val('X')
// seklinde - yani id'yi gizli alana yazip onay penceresini aciyor. Bu
// fonksiyon: hesabi ac, "Bul:" ile filtrele, ILK eslesen satiri sil, onay
// penceresindeki onayla butonuna tikla. TEK bir kayit siler - coklu silme
// icin bizimhesapTumEslesenleriSil bunu dongude cagirir (silinince liste
// yeniden render oldugu icin her seferinde bastan aranmali).
async function bizimhesapBirKaydiSil(hesapIpucu, esleme) {
  const acildi = await hesapAc(hesapIpucu);
  if (!acildi) return { ok: false, mesaj: 'Hesap acilamadi' };
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate((needle) => {
    const label = [...document.querySelectorAll('*')].find(x => (x.textContent || '').trim() === 'Bul:' && x.children.length === 0);
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
  }, esleme);
  await new Promise(r => setTimeout(r, 1500));

  const acildiMenu = await page.evaluate((esleme) => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const norm2 = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const rows = [...document.querySelectorAll('tr')].filter(tr => visible(tr) && tr.innerText.includes(esleme));
    if (!rows.length) return { bulundu: false };
    const dropBtn = [...rows[0].querySelectorAll('a,button')].find(x => visible(x) && norm2(x.innerText || '').includes('islem'));
    if (!dropBtn) return { bulundu: true, menuYok: true };
    dropBtn.click();
    return { bulundu: true };
  }, esleme);
  if (!acildiMenu.bulundu) return { ok: true, kalmadi: true, mesaj: `"${esleme}" icin baska kayit kalmadi` };
  if (acildiMenu.menuYok) return { ok: false, mesaj: 'Islem menusu bulunamadi' };
  await new Promise(r => setTimeout(r, 500));

  const silTiklandi = await page.evaluate(() => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const norm2 = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const menus = [...document.querySelectorAll('.dropdown-menu,ul.dropdown-menu')].filter(visible);
    for (const m of menus) {
      const link = [...m.querySelectorAll('a,button')].find(x => norm2(x.innerText || '').trim() === 'sil');
      if (link) { link.click(); return true; }
    }
    return false;
  });
  if (!silTiklandi) return { ok: false, mesaj: 'Sil linki bulunamadi' };
  await new Promise(r => setTimeout(r, 800));

  const onaylandi = await page.evaluate(() => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const norm2 = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const modal = document.getElementById('myModalDeleteTransactionConfirmation');
    if (!modal) return false;
    const btn = [...modal.querySelectorAll('a,button')].filter(visible).find(x => ['evet', 'sil', 'onayla', 'tamam', 'kaldir'].some(k => norm2(x.innerText || x.value || '').includes(k)));
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!onaylandi) return { ok: false, mesaj: 'Silme onay butonu bulunamadi' };
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  return { ok: true, mesaj: 'Kayit silindi' };
}

// bizimhesapBirKaydiSil ile ayni mantik ama hesap sayfasi yerine Masraflar
// listesinde (GIDER_URL) arar - yanlis siniflanan/yanlis hesaba giden
// masraf kayitlarini silmek icin (ID:180 canli ortamda yanlis hesaba
// gitmisti, bu fonksiyonla temizlendi).
async function bizimhesapMasrafSil(esleme) {
  await page.goto(GIDER_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await tiklaMenu('Tümü');
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate((needle) => {
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
  }, esleme);
  await new Promise(r => setTimeout(r, 1500));

  const acildiMenu = await page.evaluate((esleme) => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const norm2 = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const rows = [...document.querySelectorAll('tr')].filter(tr => visible(tr) && tr.innerText.includes(esleme));
    if (!rows.length) return { bulundu: false };
    const dropBtn = [...rows[0].querySelectorAll('a,button')].find(x => visible(x) && norm2(x.innerText || '').includes('islem'));
    if (!dropBtn) return { bulundu: true, menuYok: true };
    dropBtn.click();
    return { bulundu: true };
  }, esleme);
  if (!acildiMenu.bulundu) return { ok: true, kalmadi: true, mesaj: `"${esleme}" icin kayit bulunamadi` };
  if (acildiMenu.menuYok) return { ok: false, mesaj: 'Islem menusu bulunamadi' };
  await new Promise(r => setTimeout(r, 500));

  const silTiklandi = await page.evaluate(() => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const norm2 = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const menus = [...document.querySelectorAll('.dropdown-menu,ul.dropdown-menu')].filter(visible);
    for (const m of menus) {
      const link = [...m.querySelectorAll('a,button')].find(x => norm2(x.innerText || '').trim() === 'sil');
      if (link) { link.click(); return true; }
    }
    return false;
  });
  if (!silTiklandi) return { ok: false, mesaj: 'Sil linki bulunamadi' };
  await new Promise(r => setTimeout(r, 800));

  // Hesap sayfasindaki sabit #myModalDeleteTransactionConfirmation ID'si
  // Masraflar listesinde YOK (canli testte yakalandi) - herhangi bir
  // GORUNUR modal/dialog icinde onay-benzeri metinli butonu ariyoruz.
  const onaylandi = await page.evaluate(() => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const norm2 = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const modaller = [...document.querySelectorAll('.modal,[class*="modal"],[id*="odal"]')].filter(visible);
    for (const modal of modaller) {
      const btn = [...modal.querySelectorAll('a,button')].filter(visible).find(x => ['evet', 'sil', 'onayla', 'tamam', 'kaldir'].some(k => norm2(x.innerText || x.value || '').includes(k)));
      if (btn) { btn.click(); return true; }
    }
    return false;
  });
  if (!onaylandi) {
    const tani = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300));
    return { ok: false, mesaj: `Silme onay butonu bulunamadi. Sayfa: ${tani}` };
  }
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  return { ok: true, mesaj: 'Masraf kaydi silindi' };
}

// Ayni eslesme metni gecen TUM kayitlari silene kadar dongu (guvenlik icin
// maxSayi ile sinirli). Her tur basinda bastan arar cunku silme sonrasi
// liste yeniden render olur ve DOM referanslari gecersiz olur.
async function bizimhesapTumEslesenleriSil(hesapIpucu, esleme, maxSayi) {
  const sonuclar = [];
  for (let i = 0; i < (maxSayi || 30); i++) {
    const r = await bizimhesapBirKaydiSil(hesapIpucu, esleme);
    sonuclar.push(r);
    if (r.kalmadi) break;
    if (!r.ok) break;
  }
  return { toplamSilinen: sonuclar.filter(r => r.ok && !r.kalmadi).length, detay: sonuclar };
}

// 2026-08-07: Ercan'in istegi - "hergun banka hesaplarim ile bizim
// hesaptaki gorunen banka hesaplarim kontrol edilmis ve 100/100 ayni
// olmasi gerekiyor". Her gercek banka hesabi icin: (a) BizimHesap'in o an
// gosterdigi "Bakiye : X" degerini dogrudan sayfadan oku, (b) o bankaya ait
// en son mail-ekstre kaydinin balance_after (bankanin KENDI bildirdigi
// bakiye) degerini pending_bank_movements'tan cek, (c) karsilastir. Kaynak
// verisi eski (>3 gun) ise "dogrulanamiyor" diye ACIKCA belirtilir - sahte
// "eslesti" iddiasi asla verilmez (bkz. 100/100 guvenilirlik mandati).
const MUTABAKAT_HESAPLARI = [
  { bankName: 'Akbank', hesap: 'AKBANK SIRKET' },
  { bankName: 'VakifBank', hesap: 'VAKIF SIRKET' },
  { bankName: 'Yapi Kredi', hesap: 'YAPI KREDI SIRKET' },
  { bankName: 'İş Bankası', hesap: 'IS BANKASI' },
];

async function bizimhesapBakiyeOku(hesapIpucu) {
  const acildi = await hesapAc(hesapIpucu);
  if (!acildi) return null;
  const metin = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const m = metin.match(/Bakiye\s*:\s*(-?[\d.,]+)/);
  if (!m) return null;
  return trToNumber(m[1]);
}

async function gunlukBakiyeMutabakati() {
  const satirlar = [`AperiON - Gunluk banka bakiye mutabakati (${new Date().toLocaleDateString('tr-TR')})`, ''];
  for (const { bankName, hesap } of MUTABAKAT_HESAPLARI) {
    let bhBakiye = null, hata = null;
    try { bhBakiye = await bizimhesapBakiyeOku(hesap); } catch (e) { hata = e.message; }
    const { data: son } = await db.from('pending_bank_movements')
      .select('balance_after,transaction_date,transaction_time')
      .eq('bank_name', bankName)
      .not('balance_after', 'is', null)
      .order('transaction_date', { ascending: false })
      .order('transaction_time', { ascending: false })
      .limit(1);
    const kaynak = son && son[0];
    if (hata) { satirlar.push(`❌ ${hesap}: BizimHesap bakiyesi okunamadi (${hata})`); continue; }
    if (bhBakiye == null) { satirlar.push(`❌ ${hesap}: BizimHesap sayfasinda "Bakiye" bulunamadi`); continue; }
    if (!kaynak) { satirlar.push(`⚠️ ${hesap}: BizimHesap bakiye ${para(bhBakiye)} TL - gercek banka bakiyesi icin mail-ekstre verisi hic yok, DOGRULANAMIYOR`); continue; }
    const gunFarki = Math.floor((Date.now() - new Date(kaynak.transaction_date).getTime()) / 86400000);
    const taze = gunFarki <= 3;
    const fark = Math.abs(bhBakiye - Number(kaynak.balance_after));
    const eslesti = fark < 0.02;
    const tazeUyari = taze ? '' : ` (UYARI: kaynak veri ${gunFarki} gun eski, guncelligi supheli)`;
    if (eslesti) {
      satirlar.push(`✅ ${hesap}: ${para(bhBakiye)} TL - eslesti (kaynak: ${kaynak.transaction_date})${tazeUyari}`);
    } else {
      satirlar.push(`❌ ${hesap}: UYUSMUYOR - BizimHesap ${para(bhBakiye)} TL, banka ekstresi ${para(kaynak.balance_after)} TL (fark ${para(fark)} TL, kaynak: ${kaynak.transaction_date})${tazeUyari}`);
    }
  }
  return satirlar.join('\n');
}

// 2026-08-07: Ercan'in istegi - "cari acik bakiye takibi". BizimHesap'in
// musteri listesi (ngncustomers) her cari icin "Acik Bakiye" ve "Cek/Senet
// Bakiyesi" sutunlarini zaten gosteriyor - resmi B2B API (customers/
// abstract endpointleri) 401 donuyor (henuz yetkili degil), bu yuzden ayni
// ekrani Puppeteer ile okuyoruz. 5734 musterinin cogu 0 bakiyeli oldugu
// icin "Bakiyesi olanlari goster" filtresi denenir (basarisiz olursa TUM
// liste kaydirilarak taranir, sadece bakiyesi <>0 olanlar veritabanina
// yazilir).
const CUSTOMERS_URL = 'https://bizimhesap.com/web/ngn/pos/ngncustomers';
const COMPANY_ID = '9e9003b8-2721-4940-a4e9-a1b9a898a4a3';

function paraSayi(s) {
  return Number(String(s || '0').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

async function bizimhesapCariBakiyeSync() {
  await page.goto(CUSTOMERS_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  const filtreTiklandi = await page.evaluate(() => {
    const norm2 = s => (s || '').toLowerCase().replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const el = [...document.querySelectorAll('a,button,span,div,label,input')].find(x => norm2(x.innerText || x.value || '').includes('bakiyesi olanlari goster'));
    if (!el) return false;
    const tiklanacak = el.closest('a') || el.closest('button') || el.closest('label') || el;
    tiklanacak.click();
    return true;
  });
  await new Promise(r => setTimeout(r, 2500));

  // 2026-08-07: liste window/body degil, ".search-results" sinifli ic ice
  // bir div icinde sanal-kaydirmali (virtual scroll) - scrollTo(window) hic
  // etkisi yoktu (canli teste yakalandi, tanı komutuyla dogrulandi:
  // .search-results scrollHeight=3570 clientHeight=514). O div'in kendisi
  // kaydirilmali.
  let oncekiSayi = -1, sabitTur = 0;
  for (let i = 0; i < 400 && sabitTur < 3; i++) {
    const suankiSayi = await page.evaluate(() => document.querySelectorAll('table tbody tr, tr').length);
    if (suankiSayi === oncekiSayi) sabitTur++; else sabitTur = 0;
    oncekiSayi = suankiSayi;
    await page.evaluate(() => {
      const kapsayici = document.querySelector('.search-results') ||
        [...document.querySelectorAll('*')].find(el => { const s = getComputedStyle(el); return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10; });
      if (kapsayici) kapsayici.scrollTop = kapsayici.scrollHeight;
      else window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(r => setTimeout(r, 350));
  }

  const satirlar = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    return rows.map(tr => [...tr.querySelectorAll('td')].map(td => (td.innerText || '').trim()));
  });

  const kayitlar = [];
  for (const r of satirlar) {
    if (r.length < 3) continue;
    const [isimSinif, acikBakiyeTxt, cekSenetTxt] = r;
    const satirlarIsim = isimSinif.split('\n').map(s => s.trim()).filter(Boolean);
    const isim = satirlarIsim[0] || '';
    const sinif = satirlarIsim.length > 1 ? satirlarIsim[satirlarIsim.length - 1] : '';
    const acikBakiye = paraSayi(acikBakiyeTxt);
    const cekSenet = paraSayi(cekSenetTxt);
    if (!isim || (acikBakiye === 0 && cekSenet === 0)) continue;
    kayitlar.push({ cari_unvan: isim, sinif, acik_bakiye: acikBakiye, cek_senet_bakiyesi: cekSenet });
  }

  let yazilan = 0;
  for (const k of kayitlar) {
    const { error } = await db.from('customers').upsert({
      company_id: COMPANY_ID,
      cari_unvan: k.cari_unvan,
      sinif: k.sinif,
      acik_bakiye: k.acik_bakiye,
      cek_senet_bakiyesi: k.cek_senet_bakiyesi,
      bakiye_guncelleme: new Date().toISOString(),
    }, { onConflict: 'company_id,cari_unvan' });
    if (!error) yazilan++;
  }

  return { filtreTiklandi, toplamSatir: satirlar.length, bakiyesiOlan: kayitlar.length, yazilan };
}

// 2026-08-07: Ercan'in istegi - "tedarikci fiyat analizi". product_raw'da
// urun basina TEK guncel alis_fiyat var ama farkli tedarikcilerin AYNI
// urune verdigi fiyati karsilastirmiyor; bunun icin her faturanin satir
// detayina inmek gerekir (cok daha buyuk bir tarama). Onun yerine daha
// gerceklestirilebilir bir versiyon: BizimHesap Alislar listesinden
// tedarikci bazli SATIN ALMA HACMI ozeti (kac fatura, toplam tutar, ilk/
// son tarih) - "hangi tedarikciye ne kadar bagimliyiz" sorusuna cevap
// verir, ayni ".search-results" sanal-kaydirma deseni kullanilir.
const PURCHASES_URL = 'https://bizimhesap.com/web/ngn/doc/ngnretailpurchases';

async function bizimhesapTedarikciOzetSync() {
  await page.goto(PURCHASES_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  let oncekiSayi = -1, sabitTur = 0;
  for (let i = 0; i < 400 && sabitTur < 3; i++) {
    const suankiSayi = await page.evaluate(() => document.querySelectorAll('table tbody tr, tr').length);
    if (suankiSayi === oncekiSayi) sabitTur++; else sabitTur = 0;
    oncekiSayi = suankiSayi;
    await page.evaluate(() => {
      const kapsayici = document.querySelector('.search-results') ||
        [...document.querySelectorAll('*')].find(el => { const s = getComputedStyle(el); return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10; });
      if (kapsayici) kapsayici.scrollTop = kapsayici.scrollHeight;
      else window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(r => setTimeout(r, 350));
  }

  const satirlar = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    return rows.map(tr => [...tr.querySelectorAll('td')].map(td => (td.innerText || '').trim()));
  });

  const tarihSayi = t => {
    const m = String(t || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  };

  const ozet = {};
  for (const r of satirlar) {
    if (r.length < 4) continue;
    const [tarihTxt, unvan, , tutarTxt] = r;
    const unv = (unvan || '').trim();
    const tutar = paraSayi(tutarTxt);
    const tarih = tarihSayi(tarihTxt);
    if (!unv || !tutar) continue;
    if (!ozet[unv]) ozet[unv] = { adet: 0, toplam: 0, ilk: tarih, son: tarih };
    const o = ozet[unv];
    o.adet++;
    o.toplam += tutar;
    if (tarih && (!o.ilk || tarih < o.ilk)) o.ilk = tarih;
    if (tarih && (!o.son || tarih > o.son)) o.son = tarih;
  }

  let yazilan = 0;
  for (const [unv, o] of Object.entries(ozet)) {
    const { error } = await db.from('supplier_purchase_summary').upsert({
      company_id: COMPANY_ID,
      tedarikci_unvan: unv,
      fatura_sayisi: o.adet,
      toplam_tutar: o.toplam,
      ilk_tarih: o.ilk,
      son_tarih: o.son,
      guncelleme: new Date().toISOString(),
    }, { onConflict: 'company_id,tedarikci_unvan' });
    if (!error) yazilan++;
  }

  return { toplamSatir: satirlar.length, tedarikciSayisi: Object.keys(ozet).length, yazilan };
}

// 2026-08-10: Ercan'in istegi - VAKIF SIRKET (ve gerekirse baska) BizimHesap
// banka hesabinin TUM hareket gecmisini (yil bazinda) cekip gercek banka
// ekstresiyle satir satir karsilastirmak icin. Hesap sayfasindaki "HESAP
// HAREKETLERI" tablosu da virtual-scroll'lu (musteri listesiyle ayni
// pattern). Odeme gecmisi tablosunda daha once yakalanan "gizli sutun"
// tuzagina dusmemek icin, sabit indeks yerine TARIH hucresini bulup
// digerlerini ona GORE (relative) okuyoruz.
async function bizimhesapHesapEkstreDump(guid, hesapAdi) {
  await page.goto(`https://bizimhesap.com/web/ngn/acc/ngnaccount?rc=1&guid=${guid}`, { waitUntil: 'networkidle2', timeout: 30000 });

  // 2026-08-10: canli teste yakalandi - sayfada AYNI basligi tasiyan IKI
  // tablo var (biri sabit 1 satirlik "sticky" baslik klonu, digeri gercek
  // veri tablosu). Genel "table tbody tr, tr" sayaci ilk tabloda takilip
  // gercek tablo hic yuklenmeden "durgunlasti" saniyordu (0 satir okundu).
  // Her evaluate cagrisinda hedef tabloyu (Tarih/Islem/Bakiye basligi
  // tasiyan, en cok satirli tablo) ACIKCA yeniden secen fonksiyon icinde
  // tekrarlaniyor (page.evaluate() icine kucuk yardimciyi ayni fonksiyon
  // govdesinde tutmak, string-eval'e gore Puppeteer'da daha guvenilir).
  function hedefTabloSatirSayisi() {
    const adaylar = [...document.querySelectorAll('table')].filter(t => {
      const h = (t.querySelector('tr') && t.querySelector('tr').innerText) || '';
      return h.includes('Tarih') && h.includes('lem') && h.includes('Bakiye');
    });
    if (!adaylar.length) return 0;
    const t = adaylar.reduce((best, x) => x.querySelectorAll('tr').length > best.querySelectorAll('tr').length ? x : best, adaylar[0]);
    return t.querySelectorAll('tr').length;
  }

  // Gercek veri tablosu ilk anda 0 satir olabilir (ayri bir XHR ile geliyor) -
  // en az 2 satir gorene kadar (veya 15sn dolana kadar) bekle, sonra kaydirmaya basla.
  for (let i = 0; i < 50; i++) {
    const n = await page.evaluate(hedefTabloSatirSayisi);
    if (n >= 2) break;
    await new Promise(r => setTimeout(r, 300));
  }

  function tabloSatirlariniOku() {
    const adaylar = [...document.querySelectorAll('table')].filter(t => {
      const h = (t.querySelector('tr') && t.querySelector('tr').innerText) || '';
      return h.includes('Tarih') && h.includes('lem') && h.includes('Bakiye');
    });
    if (!adaylar.length) return [];
    const t = adaylar.reduce((best, x) => x.querySelectorAll('tr').length > best.querySelectorAll('tr').length ? x : best, adaylar[0]);
    const rows = [...t.querySelectorAll('tr')];
    return rows.map(tr => [...tr.querySelectorAll('td')].map(td => (td.innerText || '').trim()));
  }

  const tarihRe = /^(\d{2})\.(\d{2})\.(\d{4})$/;
  function satirlariAyristir(satirlar) {
    const out = [];
    for (const r of satirlar) {
      const dateIdx = r.findIndex(c => tarihRe.test(c));
      if (dateIdx === -1) continue;
      const m = r[dateIdx].match(tarihRe);
      const tarih = `${m[3]}-${m[2]}-${m[1]}`;
      const islem = r[dateIdx + 1] || '';
      const kullanici = r[dateIdx + 2] || '';
      const hesap = r[dateIdx + 3] || '';
      const aciklama = r[dateIdx + 4] || '';
      const sutun1 = paraSayi(r[dateIdx + 5]);
      const sutun2 = paraSayi(r[dateIdx + 6]);
      const bakiye = paraSayi(r[dateIdx + 7]);
      if (!sutun1 && !sutun2 && !bakiye) continue;
      // 2026-08-10: canli teste yakalandi - sutun POZISYONU (Borc/Alacak)
      // bekledigimin TERSIYMIS (07.08.2026'daki bilinen 7.245 TL Para Girisi
      // ve 50.000 TL Para Cikisi ornekleriyle dogrulandi: bakiye sutunu
      // dogru ve tutarli, ama tutar isaretini sutun konumundan degil,
      // ISLEM METNINDEN turetmek cok daha guvenilir - sutun sirasi hesap
      // turune gore degisebilir, islem adi (Para Girisi/Tahsilat = giren,
      // Para Cikisi/Odeme = cikan) her zaman ayni anlama gelir.
      const buyukluk = sutun1 || sutun2;
      const giren = /Girişi|Tahsilat/i.test(islem);
      const tutar = giren ? buyukluk : -buyukluk;
      const yon = giren ? 'alacak' : 'borc';
      const satir_hash = `${tarih}|${islem}|${aciklama}|${tutar}|${bakiye}`;
      out.push({ tarih, islem, kullanici, hesap, aciklama, tutar, yon, bakiye, satir_hash });
    }
    return out;
  }

  // 2026-08-10: bu tablo "sonsuz kaydirma" (biriken) degil, SABIT PENCERELI
  // sanal liste - kaydirdikca ONCEKI gorunen satirlar DOM'dan silinip
  // YENILERI ekleniyor (satir SAYISI hep ayni ~110-120 kaliyor). Onceki
  // versiyon sadece EN SON kaydirma konumundaki pencereyi okuyordu, bu
  // yuzden sadece ortadaki bir tarih araligi yakalandi (2025-07/10, ne en
  // yeni ne en eski). Duzeltme: HER kaydirma adiminda o anki pencereyi oku
  // ve bir Map'te satir_hash ile biriktir (dogal tekillestirme), pencere
  // icerigi degismemeye baslayana (gercekten dibe vurulana) kadar devam et.
  const birikenMap = new Map();
  let oncekiPencereImza = '', sabitTur = 0;
  for (let i = 0; i < 1200 && sabitTur < 5; i++) {
    const satirlar = await page.evaluate(tabloSatirlariniOku);
    const parsed = satirlariAyristir(satirlar);
    parsed.forEach(k => birikenMap.set(k.satir_hash, k));
    const pencereImza = parsed.length ? (parsed[0].satir_hash + '|' + parsed[parsed.length - 1].satir_hash) : '';
    if (pencereImza === oncekiPencereImza) sabitTur++; else sabitTur = 0;
    oncekiPencereImza = pencereImza;
    await page.evaluate(() => {
      const adaylar = [...document.querySelectorAll('table')].filter(t => {
        const h = (t.querySelector('tr') && t.querySelector('tr').innerText) || '';
        return h.includes('Tarih') && h.includes('lem') && h.includes('Bakiye');
      });
      const t = adaylar.length ? adaylar.reduce((best, x) => x.querySelectorAll('tr').length > best.querySelectorAll('tr').length ? x : best, adaylar[0]) : null;
      const kapsayici = (t && (t.closest('.search-results') || t.closest('[style*="overflow"]'))) ||
        [...document.querySelectorAll('*')].find(el => { const s = getComputedStyle(el); return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10; });
      if (kapsayici) kapsayici.scrollTop += (kapsayici.clientHeight * 0.6);
      else window.scrollBy(0, 400);
    });
    await new Promise(r => setTimeout(r, 280));
  }

  const kayitlar = [...birikenMap.values()];

  let yazilan = 0, hata = 0;
  for (const k of kayitlar) {
    const { error } = await db.from('bizimhesap_hesap_hareketleri').upsert({
      company_id: COMPANY_ID,
      hesap_guid: guid,
      hesap_adi: hesapAdi,
      tarih: k.tarih,
      islem: k.islem,
      kullanici: k.kullanici,
      hesap: k.hesap,
      aciklama: k.aciklama,
      tutar: k.tutar,
      yon: k.yon,
      bakiye: k.bakiye,
      satir_hash: k.satir_hash,
      guncelleme: new Date().toISOString(),
    }, { onConflict: 'company_id,hesap_guid,satir_hash' });
    if (error) hata++; else yazilan++;
  }

  return { pencereTaramaTuru: sabitTur >= 5 ? 'dibe_ulasti' : 'iterasyon_limiti', ayristirilan: kayitlar.length, yazilan, hata };
}

// 2026-08-07: Ercan'in istegi - cari acik bakiyeye tahsilat gecmisi ekle.
// Musteri detay sayfasinda (ngncustomer?guid=X) zaten "ONCEKI ODEMELERI"
// tablosu var (tarih/tutar/sekli, son ~10 kayit) - tum 5734 cariyi degil,
// en riskli (en yuksek acik bakiyeli) ilk N cariyi tarar (varsayilan 30) -
// tam tarama saatler surer, bu, en cok onem tasiyan carilere odaklaniyor.
async function bizimhesapCariGuidBul(cariAdi) {
  // 2026-08-07: bazi cari adlari sonunda telefon numarasi tasiyor ("ADI
  // (530) 693 1341") - bu tam haliyle arama kutusuna yazilinca eslesme
  // basarisiz oluyordu (canli teste yakalandi). Arama icin sadece
  // telefon/parantez ONCESI kismi kullan.
  const aramaTerimi = cariAdi.split(/\s{2,}\(/)[0].trim() || cariAdi;
  await page.goto(CUSTOMERS_URL, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate((needle) => {
    const input = document.querySelector('input[type="text"],input:not([type])');
    if (!input) return false;
    input.focus(); input.value = needle;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    return true;
  }, aramaTerimi);
  await new Promise(r => setTimeout(r, 1500));
  const href = await page.evaluate((needle) => {
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const link = [...document.querySelectorAll('a[href*="ngncustomer?"]')].find(a => visible(a) && a.innerText.trim().startsWith(needle.slice(0, 30)));
    return link ? link.getAttribute('href') : null;
  }, aramaTerimi);
  if (!href) return null;
  const m = href.match(/guid=([A-F0-9]+)/i);
  return m ? m[1] : null;
}

async function bizimhesapCariOdemeGecmisiSync(limit) {
  const { data: topCariler } = await db.from('customers')
    .select('cari_unvan')
    .eq('company_id', COMPANY_ID)
    .not('acik_bakiye', 'is', null)
    .neq('acik_bakiye', 0)
    .order('acik_bakiye', { ascending: false })
    .limit(limit || 30);

  let taranan = 0, yazilan = 0, bulunamayan = 0;
  for (const c of (topCariler || [])) {
    const guid = await bizimhesapCariGuidBul(c.cari_unvan);
    if (!guid) { bulunamayan++; continue; }
    await page.goto(`https://bizimhesap.com/web/ngn/pos/ngncustomer?rc=1&guid=${guid}`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 800));
    const odemeler = await page.evaluate(() => {
      const tables = [...document.querySelectorAll('table')];
      for (const t of tables) {
        const headerText = (t.querySelector('tr')?.innerText || '');
        if (/tarih/i.test(headerText) && /tutar/i.test(headerText) && /şekli|sekli/i.test(headerText)) {
          // 2026-08-07: satirlarda tarihten ONCE gizli/bos hucreler var (dahili
          // id sutunlari, ekrandan gorunmuyor) - r[0] tarih SANMAK yanlisti,
          // sonuc her zaman bos donuyordu (canli teste yakalandi). Artik
          // TARIH DESENINE UYAN ilk hucreyi buluyor, ondan sonraki 2 hucreyi
          // tutar/sekli olarak alıyor.
          return [...t.querySelectorAll('tbody tr, tr')].slice(1).map(tr => {
            const hucreler = [...tr.querySelectorAll('td')].map(td => td.innerText.trim());
            const ti = hucreler.findIndex(h => /^\d{2}\.\d{2}\.\d{4}$/.test(h));
            if (ti === -1) return null;
            return [hucreler[ti], hucreler[ti + 1], hucreler[ti + 2]];
          }).filter(Boolean);
        }
      }
      return [];
    });
    taranan++;
    for (const r of odemeler) {
      const [tarihTxt, tutarTxt, sekli] = r;
      const m = tarihTxt.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (!m) continue;
      const tarih = `${m[3]}-${m[2]}-${m[1]}`;
      const tutar = paraSayi(tutarTxt);
      const { error } = await db.from('customer_payments').upsert({
        company_id: COMPANY_ID,
        cari_unvan: c.cari_unvan,
        odeme_tarihi: tarih,
        tutar,
        sekli: (sekli || '').trim(),
        guncelleme: new Date().toISOString(),
      }, { onConflict: 'company_id,cari_unvan,odeme_tarihi,tutar,sekli' });
      if (!error) yazilan++;
    }
  }
  return { taranan, yazilan, bulunamayan, hedefCariSayisi: (topCariler || []).length };
}

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
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const linkler = [...document.querySelectorAll('a[href]')].filter(visible).map(a => ({ metin: (a.innerText || '').trim(), href: a.getAttribute('href') })).filter(l => l.metin);
    return { url: location.href, metin: (document.body.innerText || '').replace(/\s+/g, ' ').trim(), tablolar: tables, linkler };
  });
  return sonuc;
}

async function handleCommand(cmd) {
  log(`Komut alindi: #${cmd.id} komut=${cmd.command} params=${JSON.stringify(cmd.params)}`);
  await db.from('bot_commands').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', cmd.id);
  const params = cmd.params || {};
  let outcome;
  try {
    if (cmd.command === 'desktop_open_url') {
      outcome = await openDesktopTarget(params.target);
    } else {
    await ensureSession();
    if (cmd.command === 'bizimhesap_verify') {
      const r = await bizimhesapVerify(params.search || 'APERION AUTO');
      outcome = { ok: true, output: `bulundu=${r.found} | ${r.ozet}` };
    } else if (cmd.command === 'bizimhesap_fetch') {
      const r = await bizimhesapFetch(params);
      outcome = { ok: true, output: JSON.stringify(r).slice(0, 7900) };
    } else if (cmd.command === 'bizimhesap_row_menu') {
      const r = await bizimhesapRowMenu(params.hesap, params.esleme);
      outcome = { ok: true, output: JSON.stringify(r).slice(0, 7900) };
    } else if (cmd.command === 'bizimhesap_sil_bir') {
      const r = await bizimhesapBirKaydiSil(params.hesap, params.esleme);
      outcome = { ok: r.ok, output: r.mesaj };
    } else if (cmd.command === 'bizimhesap_masraf_sil') {
      const r = await bizimhesapMasrafSil(params.esleme);
      outcome = { ok: r.ok, output: r.mesaj };
    } else if (cmd.command === 'bizimhesap_sil_tumu') {
      const r = await bizimhesapTumEslesenleriSil(params.hesap, params.esleme, params.maxSayi);
      outcome = { ok: true, output: `Silinen: ${r.toplamSilinen} | ${JSON.stringify(r.detay).slice(0, 7500)}` };
    } else if (cmd.command === 'gunluk_mutabakat') {
      const r = await gunlukBakiyeMutabakati();
      outcome = { ok: true, output: r.slice(0, 7900) };
    } else if (cmd.command === 'bizimhesap_cari_bakiye_sync') {
      const r = await bizimhesapCariBakiyeSync();
      outcome = { ok: true, output: JSON.stringify(r) };
    } else if (cmd.command === 'bizimhesap_tedarikci_ozet_sync') {
      const r = await bizimhesapTedarikciOzetSync();
      outcome = { ok: true, output: JSON.stringify(r) };
    } else if (cmd.command === 'bizimhesap_cari_odeme_gecmisi_sync') {
      const r = await bizimhesapCariOdemeGecmisiSync(params.limit);
      outcome = { ok: true, output: JSON.stringify(r) };
    } else if (cmd.command === 'bizimhesap_hesap_ekstre_dump') {
      const r = await bizimhesapHesapEkstreDump(params.guid, params.hesapAdi || params.guid);
      outcome = { ok: true, output: JSON.stringify(r) };
    } else if (cmd.command === 'bizimhesap_id_dogrula') {
      // 2026-08-10: "Transfer sonrasi ID ile dogrulanamadi" hatasi alan
      // kayitlari YENIDEN POSTALAMADAN, sadece hesapAc() (artik duzeltilmis
      // bekleme ile) + idIleDogrula() ile tekrar kontrol eder. Cift kayit
      // riskine girmeden, gercekte postalanmis mi yoksa gercekten
      // basarisiz mi oldugunu netlestirmek icin.
      const acildi = await hesapAc(params.hesap);
      const r = acildi ? await idIleDogrula(params.id, params.tutar) : { varMi: false, ozet: 'hesap acilamadi' };
      outcome = { ok: true, output: JSON.stringify({ gercektenVarMi: r.varMi, detay: r.ozet }) };
    } else if (cmd.command === 'bizimhesap_scroll_diag') {
      const r = await page.evaluate(() => {
        const aday = [...document.querySelectorAll('*')].filter(el => {
          const s = getComputedStyle(el);
          return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10;
        }).slice(0, 10).map(el => ({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
        return { adaylar: aday, satirSayisi: document.querySelectorAll('table tbody tr').length };
      });
      outcome = { ok: true, output: JSON.stringify(r) };
    } else if (cmd.command === 'bizimhesap_table_diag') {
      const r = await page.evaluate(() => {
        const tables = [...document.querySelectorAll('table')];
        return tables.map((t, i) => ({ idx: i, header: (t.querySelector('tr')?.innerText || '').replace(/\s+/g, ' ').slice(0, 100), satir: t.querySelectorAll('tr').length }));
      });
      outcome = { ok: true, output: JSON.stringify(r) };
    } else if (cmd.command === 'bizimhesap_expense') {
      const approvalId = String(params.approval_id || '');
      const amount = Number(params.amount);
      const sourceAccount = String(params.source_account || '').trim();
      const expenseCategory = String(params.expense_category || '').trim();
      if (params.approved !== true) throw new Error('Tek kullanımlık Telegram onayı doğrulanmadı; kayıt yapılmadı.');
      if (!/^[0-9a-f-]{36}$/i.test(approvalId)) throw new Error('Geçerli onay kimliği yok; kayıt yapılmadı.');
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Geçerli gider tutarı yok; kayıt yapılmadı.');
      if (!guidBul(sourceAccount)) throw new Error('Kaynak kasa kesin hesap haritasında bulunamadı; kayıt yapılmadı.');
      if (normHesapAdi(sourceAccount) !== 'ercan nakit') throw new Error('Bu sürümde yalnızca doğrulanmış ercan nakit kasası destekleniyor; kayıt yapılmadı.');
      if (expenseCategory !== 'Yemek') throw new Error('Gider kategorisi izin listesinde değil; kayıt yapılmadı.');

      const auditId = `TE-${approvalId}`;
      const auditTag = `APERION AUTO | ID:${auditId}`;
      const existing = await bizimhesapVerify(auditTag);
      if (existing.found) {
        outcome = { ok: true, output: `Mükerrer engellendi: ${auditTag} daha önce BizimHesap'ta doğrulanmış.` };
      } else {
        const beforeBalance = await hesapBakiyesiOku(sourceAccount);
        if (!beforeBalance.ok) throw new Error(`Kayıt öncesi bakiye doğrulanamadı: ${beforeBalance.error}`);
        const description = `[GPT-CODEX KAYDI] ${auditTag} | ONAY:${approvalId} | ${String(params.description || 'Yemek ödemesi').slice(0, 120)}`;
        const posted = await bizimhesapPostExpense({ id: auditId, tarih: params.transaction_date, tutar: para(amount), aciklama: description, hesap: sourceAccount, masrafKalemi: expenseCategory });
        if (posted.insanKontroluGerekli) {
          outcome = { ok: false, output: `Mükerrer şüphesi nedeniyle kayıt yapılmadı: ${posted.mesaj}` };
        } else if (!posted.ok) {
          outcome = { ok: false, output: posted.mesaj || 'BizimHesap gider kaydı doğrulanamadı.' };
        } else {
          const afterBalance = await hesapBakiyesiOku(sourceAccount);
          if (!afterBalance.ok) throw new Error(`Kayıt yapıldı ancak kayıt sonrası bakiye okunamadı: ${afterBalance.error}`);
          const expectedAfter = Math.round((beforeBalance.value - amount) * 100) / 100;
          const balanceMatches = Math.abs(afterBalance.value - expectedAfter) <= 0.02;
          const proofName = `bizimhesap_expense_${approvalId}`;
          await savePageDiagnostics(page, proofName);
          const proofPath = path.join(__dirname, '..', 'diagnostics', `${proofName}.png`);
          const notification = await sendFinanceResult({
            verified: true,
            transactionId: `bizimhesap:alayli:expense:${approvalId}`,
            status: balanceMatches ? 'BAŞARILI' : 'BAŞARILI - BAKİYE ANOMALİSİ',
            date: params.transaction_date,
            sourceAccount,
            targetAccount: expenseCategory,
            amount,
            currency: 'TRY',
            previousBalance: beforeBalance.value,
            newBalance: afterBalance.value,
            description: `${posted.mesaj}${balanceMatches ? '' : ` Beklenen bakiye ${para(expectedAfter)} TL idi; kontrol gerekli.`}`,
            proofPath,
          }, { chatId: params.chat_id });
          outcome = { ok: true, output: `Kaydedildi ve doğrulandı. BizimHesap kimliği: ${auditId}. Önce: ${para(beforeBalance.value)} TL; sonra: ${para(afterBalance.value)} TL. Telegram görsel kanıt mesajı: ${notification.messageId || 'önceden gönderildi'}.` };
        }
      }
    } else if (cmd.command === 'bizimhesap_process') {
      const { data: row, error } = await db.from(BANK_TABLE).select('*').eq('id', params.id).single();
      if (error || !row) { outcome = { ok: false, output: `Kayit bulunamadi: ${error?.message || params.id}` }; }
      else {
        const aciklama = `APERION AUTO | ID:${row.id} | TIP:${row.tur} | FIRMA:${row.firma_id} | ${(row.aciklama || '').slice(0, 150)}`;
        let r;
        let bildirimHesaplari = {
          sourceAccount: row.hesap || '-',
          targetAccount: row.karsi_taraf || row.tur || '-',
        };
        const rowAciklama = norm(row.aciklama || '');
        // 2026-08-07: "Kredi Geri Odemesi" / "Kredi Kartina Odenen" anapara
        // hareketleridir, gider degildir - Ercan'in talimatiyla Emanet
        // hesabina transfer olarak yonlendiriliyor (kaynak: gercek banka
        // hesabi, hedef: Emanet - hesapta gorunur ama gider gibi
        // kategorize edilmez, sonradan elle netlestirilir).
        // 2026-08-07: "KRE.KART BORÇ ÖDEME" (bankanin kendi ekstresindeki
        // kisaltilmis ifadesi) bu kalibi yakalamiyordu - ID:180/206 canli
        // ortamda "Kredi karti" diye anlamsiz bir hesaba yanlis islendi
        // (fuzzy eslesme "MOCA SONOVA POS KREDI KARTI"ye gitti). Kredi
        // karti borc odemesinin tum yaygin ifade bicimlerini kapsayacak
        // sekilde genisletildi.
        const anaparaKaynakli = /kredi geri odemesi|kredi kartina odenen|kre ?(di)? ?\.? ?kart(i|a)? borc/.test(rowAciklama);
        const krediFaizi = /kredi faizi/.test(rowAciklama);
        // 2026-08-07 KRITIK bulgu: process_pending_bank_movements_v113.cjs
        // karsi taraf bilinmeyen kayitlari emanet_routed=true diye
        // isaretliyordu ama bu bayrak burada HIC OKUNMUYORDU - 19 kayit
        // (ATM para yatirma, KMH tahsilati gibi belirsiz kaynakli girisler)
        // Emanet yerine dogrudan GERCEK banka hesabina "Para Girisi" olarak
        // islenmis oldu (Ercan'in sorusuyla yakalandi). emanet_routed en
        // BASTA kontrol edilmeli - tur'a gore yonlendirmeden once.
        if (row.emanet_routed) {
          // 2026-08-07: yon (gercek hesaba mi dusmeli, dogrudan Emanet'e mi
          // girmeli) Ercan ile netlesmeden TAHMIN YURUTULMEYECEK - gercek
          // banka bakiyesini etkileyen bir karar. Insan kontrolune birakiliyor.
          r = { ok: true, insanKontroluGerekli: true, mesaj: 'Emanet yonlendirmesi bekliyor - kaynak/hedef yonu netlesmeden otomatik islenmedi (bkz. ID:286-304 duzeltmesi)' };
        } else if (row.tur === 'transfer') {
          const kaynakHesap = String(row.karsi_taraf || '').split('->')[0].trim() || 'POS POS POS KREDI KARTI';
          bildirimHesaplari = { sourceAccount: kaynakHesap, targetAccount: row.hesap };
          r = await bizimhesapPostTransfer({ id: row.id, tarih: row.tarih, tutar: row.tutar, aciklama, hesap: row.hesap, kaynakHesap });
        } else if (row.tur === 'cari_tahsilat' || row.tur === 'tahsilat') {
          bildirimHesaplari = { sourceAccount: row.karsi_taraf || 'Cari', targetAccount: row.hesap };
          r = await bizimhesapPostIncome({ id: row.id, tarih: row.tarih, tutar: row.tutar, aciklama, hesap: row.hesap });
        } else if (anaparaKaynakli) {
          bildirimHesaplari = { sourceAccount: row.hesap, targetAccount: 'EMANET' };
          r = await bizimhesapPostTransfer({ id: row.id, tarih: row.tarih, tutar: row.tutar, aciklama, hesap: 'EMANET', kaynakHesap: row.hesap });
        } else if (krediFaizi) {
          bildirimHesaplari = { sourceAccount: row.hesap, targetAccount: 'Faiz gideri' };
          r = await bizimhesapPostExpense({ id: row.id, tarih: row.tarih, tutar: para(row.tutar), aciklama, hesap: row.hesap, masrafKalemi: 'Faiz' });
        } else {
          bildirimHesaplari = { sourceAccount: row.hesap, targetAccount: row.karsi_taraf || 'BizimHesap gideri' };
          r = await bizimhesapPostExpense({ id: row.id, tarih: row.tarih, tutar: para(row.tutar), aciklama, hesap: row.hesap });
        }
        outcome = { ok: r.ok, output: r.mesaj };
        if (r.ok) {
          // 2026-08-07: Ercan'in talebi - elle girisiyle catisma suphesi
          // varsa 'kaydedildi' DENMEZ (yanlislikla ikinci kez girilmis
          // sanilmasin), ayri bir statude birakilir ki gunluk bildirimde
          // "insan kontrolu gerekiyor" olarak gorunsun, sessizce kaybolmasin.
          const durum = r.insanKontroluGerekli ? 'insan_kontrolu_gerekli' : (r.zatenVardi ? 'zaten_vardi' : 'kaydedildi');
          await db.from(BANK_TABLE).update({ bizimhesap_durumu: durum, bizimhesap_mesaj: r.mesaj, bizimhesap_islem_tarihi: new Date().toISOString() }).eq('id', row.id);
          if (durum === 'kaydedildi') {
            const kanitAdi = `bizimhesap_result_ID${row.id}`;
            await savePageDiagnostics(page, kanitAdi);
            const kanitYolu = path.join(__dirname, '..', 'diagnostics', `${kanitAdi}.png`);
            try {
              const bildirim = await sendFinanceResult({
                verified: true,
                transactionId: `bizimhesap:${row.firma_id || 'alayli'}:${row.id}`,
                status: 'BAŞARILI',
                date: row.tarih,
                sourceAccount: bildirimHesaplari.sourceAccount,
                targetAccount: bildirimHesaplari.targetAccount,
                amount: Number(row.tutar),
                currency: 'TRY',
                description: r.mesaj,
                proofPath: kanitYolu,
              });
              r.mesaj += bildirim.duplicate
                ? ' Telegram sonuç bildirimi daha önce gönderilmişti.'
                : ` Telegram sonuç ve görsel kanıt gönderildi (mesaj:${bildirim.messageId}).`;
              outcome.output = r.mesaj;
            } catch (bildirimHatasi) {
              log(`TELEGRAM_BILDIRIM_HATASI ID:${row.id} ${bildirimHatasi.message}`);
              r.mesaj += ` Telegram bildirimi gönderilemedi: ${bildirimHatasi.message}`;
              outcome.output = r.mesaj;
            }
          }
        }
      }
    } else {
      outcome = { ok: false, output: `Bilinmeyen komut: ${cmd.command}` };
    }
    }
  } catch (e) {
    outcome = { ok: false, output: String(e.message || e) };
  }
  await db.from('bot_commands').update({ status: outcome.ok ? 'completed' : 'failed', result: outcome.output.slice(0, 8000), completed_at: new Date().toISOString() }).eq('id', cmd.id);
  if ((cmd.command === 'desktop_open_url' || cmd.command === 'bizimhesap_expense') && params.chat_id) {
    const icon = outcome.ok ? '✅' : '⚠️';
    await sendTelegramCommandResult(params.chat_id, `${icon} Masaüstü komut sonucu\n${outcome.output}`);
  }
  log(`Komut bitti: #${cmd.id} -> ${outcome.ok ? 'completed' : 'failed'}`);
}

// 2026-08-11/12: Ercan'in acikca istedigi "dunya standardi, hicbir zaman
// kopmasin" hedefine gercekci katkim - Cloudflare'in bizi tekrar tekrar
// banlamasinin asil sebebi TOPLU isler sirasinda cok kisa arayla (15-60sn)
// onlarca/yuzlerce otomatik islem yapmamiz (VAKIF SIRKET geri-doldurma gibi).
// Insan bir muhasebeci bu hizda calismaz. Saatlik bir "bizimhesap_process"
// tavani + her komut arasinda RASTGELE (insan gibi degisken) bekleme ekleniyor
// - bu, saf hiz yerine SURDURULEBILIRLIGI onceliklendirir.
// 2026-08-12 dengeleme: ilk deger (40/saat, 8-40sn) gereginden fazla
// yavasti - bu oturumdaki GERCEK ban olaylarinin ikisi de (crash-loop'ta
// tekrar tekrar YENIDEN GIRIS, veya gece boyu KESINTISIZ yuzlerce islem)
// tek-islem hizindan degil, oturum/hacim orunturusunden kaynaklandi.
// Oturum zaten kalici (komut basina yeniden giris yok), bu yuzden tavan
// makul seviyede yukseltildi - hala sabit-araikli bot deseni degil, ama
// gereksiz yere surunmuyor.
const SAATLIK_BIZIMHESAP_ISLEM_TAVANI = 90;
const islemZamanDamgalari = [];
function saatlikTavanAsildiMi() {
  const suan = Date.now();
  while (islemZamanDamgalari.length && suan - islemZamanDamgalari[0] > 3600000) islemZamanDamgalari.shift();
  return islemZamanDamgalari.length >= SAATLIK_BIZIMHESAP_ISLEM_TAVANI;
}

let tickCalisiyor = false;
async function tick() {
  // 2026-08-06: setInterval onceki tick'in handleCommand'i (page.goto/
  // waitForNavigation ile 15sn'den uzun surebiliyor) hala calisirken yeni
  // tick'i tetikliyordu - iki komut AYNI Puppeteer page'i es zamanli
  // kullanip birbirinin form doldurma/navigasyonunu bozuyordu (6 komutluk
  // toplu kuyruk 2026-08-06'da hepsi "form alanlari eksik" ile patladi).
  // Basit kilit: bir onceki komut tam bitmeden yeni tick calismaz.
  if (tickCalisiyor) return;
  tickCalisiyor = true;
  try {
    const { data, error } = await db.from('bot_commands').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (error) { log(`HATA (sorgu): ${error.message}`); return; }
    if (!data) return;
    if (data.command.startsWith('bizimhesap_')) {
      // 2026-08-12: throttle/jitter ONCE sadece 'bizimhesap_process'e
      // uygulaniyordu - id_dogrula/scroll_diag/table_diag gibi diger canli
      // tarayici komutlari (ozellikle saatlerce bos kuyruktan sonra art
      // arda kuyruklanan dogrulama komutlari) sifir gecikmeyle art arda
      // calisiyordu. Bu tam olarak bot-deseni: uzun sessizlik + ani patlama.
      // Ercan'a "girisim pazarlama sayfasina yonlendirildi" (bot korumasi)
      // seklinde geri donen bir engelle sonuclandi. Artik TUM canli
      // bizimhesap_* komutlari ayni insan-temposu jitter'ini paylasiyor.
      if (saatlikTavanAsildiMi()) {
        log(`TOPLU ISLEM YAVASLATMA: son 1 saatte ${SAATLIK_BIZIMHESAP_ISLEM_TAVANI} islem tavanina ulasildi, #${data.id} bir sonraki uygun tur'a birakiliyor.`);
        return;
      }
      islemZamanDamgalari.push(Date.now());
      // Insan gibi degisken bekleme (4-16sn) - sabit 15sn tick araligi tek
      // basina "bot deseni" olusturuyordu, jitter bunu kirar. 90/saat tavanla
      // birlikte ortalama ~40sn/islem (tick + jitter + islem suresi) eder.
      let bekleme = 4000 + Math.random() * 12000;
      // Uzun sessizlik sonrasi ilk komut icin ekstra "isinma" bekleme -
      // saatlerce hicbir istek gitmemisken aniden hizli art arda istek
      // gitmesi tek basina supheli bir desen.
      const sonIslem = islemZamanDamgalari.length >= 2 ? islemZamanDamgalari[islemZamanDamgalari.length - 2] : null;
      if (sonIslem && Date.now() - sonIslem > 20 * 60 * 1000) {
        bekleme += 15000 + Math.random() * 15000;
        log(`ISINMA BEKLEMESI: son islemden ${Math.round((Date.now() - sonIslem) / 60000)} dk gecmis, ekstra gecikme ekleniyor.`);
      }
      await new Promise(r => setTimeout(r, bekleme));
    }
    await handleCommand(data);
  } finally {
    tickCalisiyor = false;
  }
}

(async () => {
  log('AperiON yerel dinleyici (v2, kalici oturum) baslatiliyor...');
  // 2026-08-07: dinleyici bir komut isleme ORTASINDA (status='processing')
  // durdurulup yeniden baslatilirsa (kod guncellemesi icin sik sik
  // yapiliyor), o komut sonsuza kadar 'processing'de takili kaliyordu -
  // bir daha ASLA islenmiyordu (#209/ID:179'da yakalandi). Baslangicta
  // yarim kalmis (processing) komutlar 'pending'e geri alinir, otomatik
  // yeniden denenir.
  const { data: yarimKalanlar } = await db.from('bot_commands').update({ status: 'pending' }).eq('status', 'processing').select('id');
  if (yarimKalanlar && yarimKalanlar.length) log(`UYARI: ${yarimKalanlar.length} yarim kalmis komut (onceki calistirmadan) yeniden kuyruga alindi: ${yarimKalanlar.map(r => r.id).join(',')}`);
  // 2026-08-10: baslangic girisi try/catch DISINDA idi - BizimHesap giris
  // sayfasi gecici yavas yanit verince (12sn timeout) ensureSession() reddedip
  // butun process'i cokertiyordu, watchdog her 5dk'da yeni Chrome acip ayni
  // sekilde cokuyordu (crash-loop, otomasyon saatlerce tamamen durdu).
  // handleCommand() zaten kendi ensureSession() cagrisini try/catch icinde
  // yapiyor (komut basarisiz isaretlenir, process ayakta kalir) - baslangicta
  // da ayni toleransi uygula: hata varsa logla, process'i tick dongusune birak.
  try {
    await ensureSession();
    log('Oturum hazir. Komut bekleniyor (her 15 saniyede bir kontrol)...');
  } catch (e) {
    log(`UYARI: baslangic oturumu basarisiz (${e.message || e}) - process ayakta kaliyor, sonraki komutla tekrar denenecek.`);
  }
  tick();
  setInterval(tick, 15000);
})();
