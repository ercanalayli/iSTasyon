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
const ACCOUNTS_URL = 'https://bizimhesap.com/web/ngn/acc/ngnaccounts';

let browser, page;

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o'); }
const para = n => Math.abs(Number(n || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// bizimhesapPostExpense'e row.tutar zaten para() ile formatlanmis ("3.070,80")
// gelir - elleGirisSuphesi() gibi ham sayi bekleyen fonksiyonlara vermeden
// once bunu geri sayiya cevirir.
const trToNumber = s => Number(String(s || '').replace(/\./g, '').replace(',', '.')) || 0;

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

async function hesapAc(hesapIpucu) {
  const guid = guidBul(hesapIpucu);
  if (guid) {
    await page.goto(`https://bizimhesap.com/web/ngn/acc/ngnaccount?rc=1&guid=${guid}`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
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
  const kaydedildi = await page.evaluate(() => { const b = document.querySelector('#myModalTransferTo #btnSaveTransfer'); if (!b) return false; b.click(); return true; });
  if (!kaydedildi) return { ok: false, mesaj: 'Transfer kaydet butonu bulunamadi' };
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1800));

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
    } else if (cmd.command === 'bizimhesap_scroll_diag') {
      const r = await page.evaluate(() => {
        const aday = [...document.querySelectorAll('*')].filter(el => {
          const s = getComputedStyle(el);
          return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10;
        }).slice(0, 10).map(el => ({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
        return { adaylar: aday, satirSayisi: document.querySelectorAll('table tbody tr').length };
      });
      outcome = { ok: true, output: JSON.stringify(r) };
    } else if (cmd.command === 'bizimhesap_process') {
      const { data: row, error } = await db.from(BANK_TABLE).select('*').eq('id', params.id).single();
      if (error || !row) { outcome = { ok: false, output: `Kayit bulunamadi: ${error?.message || params.id}` }; }
      else {
        const aciklama = `APERION AUTO | ID:${row.id} | TIP:${row.tur} | FIRMA:${row.firma_id} | ${(row.aciklama || '').slice(0, 150)}`;
        let r;
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
          r = await bizimhesapPostTransfer({ id: row.id, tarih: row.tarih, tutar: row.tutar, aciklama, hesap: row.hesap, kaynakHesap });
        } else if (row.tur === 'cari_tahsilat' || row.tur === 'tahsilat') {
          r = await bizimhesapPostIncome({ id: row.id, tarih: row.tarih, tutar: row.tutar, aciklama, hesap: row.hesap });
        } else if (anaparaKaynakli) {
          r = await bizimhesapPostTransfer({ id: row.id, tarih: row.tarih, tutar: row.tutar, aciklama, hesap: 'EMANET', kaynakHesap: row.hesap });
        } else if (krediFaizi) {
          r = await bizimhesapPostExpense({ id: row.id, tarih: row.tarih, tutar: para(row.tutar), aciklama, hesap: row.hesap, masrafKalemi: 'Faiz' });
        } else {
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
        }
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
    if (data) await handleCommand(data);
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
  await ensureSession();
  log('Oturum hazir. Komut bekleniyor (her 15 saniyede bir kontrol)...');
  tick();
  setInterval(tick, 15000);
})();
