// 2026-08-03 v2: Ercan'in tepkisi haklÄ±ydÄ± - onceki versiyon HER komut icin
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
function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[Ì€-Í¯]/g, '')
  .replace(/Ä±/g, 'i').replace(/ÅŸ/g, 's').replace(/Ã§/g, 'c').replace(/ÄŸ/g, 'g').replace(/Ã¼/g, 'u').replace(/Ã¶/g, 'o'); }
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
    const norm2 = s => (s || '').toLowerCase().replace(/Ä±/g, 'i').replace(/ÅŸ/g, 's').replace(/Ã§/g, 'c').replace(/ÄŸ/g, 'g').replace(/Ã¼/g, 'u').replace(/Ã¶/g, 'o');
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
  await tiklaMenu('TÃ¼mÃ¼');
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
  const found = bodyText.includes(search) && !bodyText.includes('bulunamadÄ±');
  return { yazildi, found, ozet: bodyText.replace(/\s+/g, ' ').slice(0, 800) };
}

async function bizimhesapPostExpense(row) {
  // row: {tarih, tutar, aciklama, hesap}
  await page.goto(GIDER_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('a,button,input,select,textarea', { timeout: 15000 });
  await tiklaMenu('TÃ¼mÃ¼');
  await new Promise(r => setTimeout(r, 800));
  const supheli = await elleGirisSuphesi(row.tarih, trToNumber(row.tutar));
  if (supheli.supheli) return { ok: true, insanKontroluGerekli: true, mesaj: `Olasi elle-giris suphesi (masraf listesinde AperiON etiketsiz benzer kayit bulundu) - ${supheli.ozet}` };
  await page.evaluate(() => {
    const norm2 = s => (s || '').toLowerCase().normalize('NFD').replace(/[Ì€-Í¯]/g, '').replace(/Ä±/g, 'i').replace(/ÅŸ/g, 's').replace(/Ã§/g, 'c').replace(/ÄŸ/g, 'g').replace(/Ã¼/g, 'u').replace(/Ã¶/g, 'o');
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
    const norm2 = s => (s || '').toLowerCase().normalize('NFD').replace(/[Ì€-Í¯]/g, '').replace(/Ä±/g, 'i').replace(/ÅŸ/g, 's').replace(/Ã§/g, 'c').replace(/ÄŸ/g, 'g').replace(/Ã¼/g, 'u').replace(/Ã¶/g, 'o');
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
    const masrafOk = setSelect('ddlCostAccounts', hareket.masrafKalemi ? [hareket.masraÛo6ÒÚ$z{-®éÜj×FwÒF†;fæ6R&—¦–Ô†W6wFFüI÷'VÆæÜKYòæÓ°¢ÒVÇ6R°¢6öç7B&Vf÷&T&Ææ6RÒv—B†W6&¶—–W6”ö·R‡6÷W&6T66÷VçB“°¢–b‚&Vf÷&T&Ææ6Ræö²’F‡&÷ræWrW'&÷"†¶œKB;fæ6W6’&¶—–RFüI÷'VÆæÖLK¢G¶&Vf÷&T&Ææ6RæW'&÷'Ö“°¢6öç7BFW67&—F–öâÒ´uBÔ4ôDU‚´”D•ÒG¶VF—EFwÒÂôä“¢G¶&÷fÄ–GÒÂGµ7G&–ær‡&×2æFW67&—F–öâÇÂu–VÖV²;fFVÖW6’r’ç6Æ–6RƒÂ#—Ö°¢6öç7B÷7FVBÒv—B&—¦–Ö†W6÷7DW‡Vç6R‡²–C¢VF—D–BÂF&–ƒ¢&×2çG&ç67F–öåöFFRÂGWF#¢&†Ö÷VçB’Â6–¶ÆÖ¢FW67&—F–öâÂ†W6¢6÷W&6T66÷VçBÂÖ7&d¶ÆVÖ“¢W‡Vç6T6FVv÷'’Ò“°¢–b‡÷7FVBæ–ç6ä¶öçG&öÇTvW&V¶Æ’’°¢÷WF6öÖRÒ²ö³¢fÇ6RÂ÷WGWC¢Ü;Æ¶W'&W"Yü;Ç†W6’æVFVæ—–ÆR¶œKB–KÆÖLK¢G·÷7FVBæÖW6§ÖÓ°¢ÒVÇ6R–b‚÷7FVBæö²’°¢÷WF6öÖRÒ²ö³¢fÇ6RÂ÷WGWC¢÷7FVBæÖW6¢ÇÂt&—¦–Ô†W6v–FW"¶–LKFüI÷'VÆæÖLKârÓ°¢ÒVÇ6R°¢6öç7BgFW$&Ææ6RÒv—B†W6&¶—–W6”ö·R‡6÷W&6T66÷VçB“°¢–b‚gFW$&Ææ6Ræö²’F‡&÷ræWrW'&÷"†¶œKB–KÆLKæ6²¶œKB6öç&<K&¶—–Rö·VæÖLK¢G¶gFW$&Ææ6RæW'&÷'Ö“°¢6öç7BW‡V7FVDgFW"ÒÖF‚ç&÷VæB‚†&Vf÷&T&Ææ6RçfÇVRÒÖ÷VçB’¢’ò°¢6öç7B&Ææ6TÖF6†W2ÒÖF‚æ'2†gFW$&Ææ6RçfÇVRÒW‡V7FVDgFW"’ÃÒã#°¢6öç7B&öödæÖRÒ&—¦–Ö†W6öW‡Vç6UòG¶&÷fÄ–GÖ°¢v—B6fUvTF–væ÷7F–72‡vRÂ&öödæÖR“°¢6öç7B&ööeF‚ÒF‚æ¦ö–â…õöF—&æÖRÂrâârÂvF–væ÷7F–72rÂG·&öödæÖWÒçæv“°¢6öç7Bæ÷F–f–6F–öâÒv—B6VæDf–ææ6U&W7VÇB‡°¢fW&–f–VC¢G'VRÀ¢G&ç67F–öä–C¢&—¦–Ö†W6¦Æ–Æ“¦W‡Vç6S¢G¶&÷fÄ–GÖÀ¢7FGW3¢&Ææ6TÖF6†W2òt$Yä$”Ä’r¢t$Yä$”Ä’Ò$¼K”RäôÔÌK<KrÀ¢FFS¢&×2çG&ç67F–öåöFFRÀ¢6÷W&6T66÷VçBÀ¢F&vWD66÷VçC¢W‡Vç6T6FVv÷'’À¢Ö÷VçBÀ¢7W'&Væ7“¢uE%’rÀ¢&Wf–÷W4&Ææ6S¢&Vf÷&T&Ææ6RçfÇVRÀ¢æWt&Ææ6S¢gFW$&Ææ6RçfÇVRÀ¢FW67&—F–öã¢G·÷7FVBæÖW6§ÒG¶&Ææ6TÖF6†W2òrr¢&V¶ÆVæVâ&¶—–RG·&†W‡V7FVDgFW"—ÒDÂ–F“²¶öçG&öÂvW&V¶Æ’æÖÀ¢&ööeF‚À¢ÒÂ²6†D–C¢&×2æ6†Eö–BÒ“°¢÷WF6öÖRÒ²ö³¢G'VRÂ÷WGWC¢¶–FVF–ÆF’fRFüI÷'VÆæLKâ&—¦–Ô†W6¶–ÖÆœIö“¢G¶VF—D–GÒâ9fæ6S¢G·&†&Vf÷&T&Ææ6RçfÇVR—ÒDÃ²6öç&¢G·&†gFW$&Ææ6RçfÇVR—ÒDÂâFVÆVw&Ò|;g'6VÂ¶ìKBÖW6¬K¢G¶æ÷F–f–6F–öâæÖW76vT–BÇÂ|;fæ6VFVâ|;fæFW&–ÆF’wÒæÓ°¢Ğ¢Ğ¢ÒVÇ6R–b†6ÖBæ6öÖÖæBÓÓÒv&—¦–Ö†W6÷&ö6W72r’°¢6öç7B²FF¢&÷rÂW'&÷"ÒÒv—BF"æg&öÒ„$äµõD$ÄR’ç6VÆV7B‚r¢r’æW‚v–BrÂ&×2æ–B’ç6–ævÆR‚“°Ğ¢–b†W'&÷"ÇÂ&÷r’²÷WF6öÖRÒ²ö³¢fÇ6RÂ÷WGWC¢¶–—B'VÇVæÖF“¢G¶W'&÷#òæÖW76vRÇÂ&×2æ–GÖÓ²ĞĞ¢VÇ6R°Ğ¢6öç7B6–¶ÆÖÒU$”ôâUDòÂ”C¢G·&÷ræ–GÒÂD•¢G·&÷rçGW'ÒÂd•$Ô¢G·&÷ræf—&Öö–GÒÂG²‡&÷ræ6–¶ÆÖÇÂrr’ç6Æ–6RƒÂS—Ö°Ğ¢ÆWB#°¢ÆWB&–ÆF—&–Ô†W6Æ&’Ò°¢6÷W&6T66÷VçC¢&÷ræ†W6ÇÂrÒrÀ¢F&vWD66÷VçC¢&÷ræ¶'6•÷F&bÇÂ&÷rçGW"ÇÂrÒrÀ¢Ó°¢6öç7B&÷t6–¶ÆÖÒæ÷&Ò‡&÷ræ6–¶ÆÖÇÂrr“°Ğ¢òò##bÓ‚Ós¢$·&VF’vW&’öFVÖW6’"ò$·&VF’¶'F–æöFVæVâ"æ&Ğ¢òò†&V¶WFÆW&–F—"Âv–FW"FVv–ÆF—"ÒW&6âv–âFÆ–ÖF—–ÆVÖæW@Ğ¢òò†W6&–æG&ç6fW"öÆ&²–öæÆVæF—&–Æ—–÷"†¶–æ³¢vW&6V²&æ¶Ğ¢òò†W6&’Â†VFVc¢VÖæWBÒ†W6Fv÷'VçW"Öv–FW"v–&Ğ¢òò¶FVv÷&—¦RVF–ÆÖW¢Â6öç&FâVÆÆRæWFÆW7F—&–Æ—"’àĞ¢òò##bÓ‚Ós¢$µ$Rä´%B$õ,8r9dDTÔR"†&æ¶æ–â¶VæF’V·7G&W6–æFV¶Ğ¢òò¶—6ÇF–ÆÖ—2–fFW6’’'R¶Æ–&’–¶ÆÖ—–÷&GRÒ”C£ƒó#b6æÆĞ¢òò÷'FÖF$·&VF’¶'F’"F—–RæÆ×6—¢&—"†W6&–æÆ—2—6ÆVæFĞ¢òò†gW§§’W6ÆW6ÖR$Ôô44ôäõdõ2µ$TD’´%D’'–Rv—GF’’â·&VFĞ¢òò¶'F’&÷&2öFVÖW6–æ–âGVÒ––v–â–fFR&–6–ÖÆW&–æ’¶6–6°Ğ¢òò6V¶–ÆFRvVæ—6ÆWF–ÆF’àĞ¢6öç7Bæ&¶–æ¶Æ’Òö·&VF’vW&’öFVÖW6—Æ·&VF’¶'F–æöFVæVçÆ·&Rò†F’“òõÂãòö¶'B†—Æ“ò&÷&2òçFW7B‡&÷t6–¶ÆÖ“°Ğ¢6öç7B·&VF”f—¦’Òö·&VF’f—¦’òçFW7B‡&÷t6–¶ÆÖ“°Ğ¢òò##bÓ‚Órµ$•D”²'VÆwS¢&ö6W75÷VæF–æuö&æµöÖ÷fVÖVçG5÷c2æ6§0Ğ¢òò¶'6’F&b&–Æ–æÖW–Vâ¶–—FÆ&’VÖæWE÷&÷WFVC×G'VRF—–PĞ¢òò—6&WFÆ—–÷&GRÖ'R&—&²'W&F„”2ôµTäÕU”õ$ERÒ’¶–—@Ğ¢òò„DÒ&–F—&ÖÂ´Ô‚F‡6–ÆF’v–&’&VÆ—'6—¢¶–æ¶Æ’v—&—6ÆW"Ğ¢òòVÖæWB–W&–æRFöw'VFâtU$4T²&æ¶†W6&–æ%&v—&—6’"öÆ&°Ğ¢òò—6ÆVæÖ—2öÆGR„W&6âv–â6÷'W7W–Æ–¶ÆæF’’âVÖæWE÷&÷WFVBVàĞ¢òò$5D¶öçG&öÂVF–ÆÖVÆ’ÒGW"vv÷&R–öæÆVæF—&ÖVFVâöæ6RàĞ¢–b‡&÷ræVÖæWE÷&÷WFVB’°Ğ¢òò##bÓ‚Ós¢–öâ†vW&6V²†W6&Ö’GW6ÖVÆ’ÂFöw'VFâVÖæWBvRÖĞ¢òòv—&ÖVÆ’’W&6â–ÆRæWFÆW6ÖVFVâD„Ô”â•U%UETÄÔU”T4T²ÒvW&6V°Ğ¢òò&æ¶&¶—–W6–æ’WF¶–ÆW–Vâ&—"¶&"â–ç6â¶öçG&öÇVæR&—&¶–Æ—–÷"àĞ¢"Ò²ö³¢G'VRÂ–ç6ä¶öçG&öÇTvW&V¶Æ“¢G'VRÂÖW6£¢tVÖæWB–öæÆVæF—&ÖW6’&V¶Æ—–÷"Ò¶–æ²ö†VFVb–öçRæWFÆW6ÖVFVâ÷FöÖF–²—6ÆVæÖVF’†&·¢â”C£#ƒbÓ3BGW¦VÇFÖW6’’rÓ°Ğ¢ÒVÇ6R–b‡&÷rçGW"ÓÓÒwG&ç6fW"r’°¢6öç7B¶–æ´†W6Ò7G&–ær‡&÷ræ¶'6•÷F&bÇÂrr’ç7Æ—B‚rÓâr•³ÒçG&–Ò‚’ÇÂuõ2õ2õ2µ$TD’´%D’s°¢&–ÆF—&–Ô†W6Æ&’Ò²6÷W&6T66÷VçC¢¶–æ´†W6ÂF&vWD66÷VçC¢&÷ræ†W6Ó°¢"Òv—B&—¦–Ö†W6÷7EG&ç6fW"‡²–C¢&÷ræ–BÂF&–ƒ¢&÷rçF&–‚ÂGWF#¢&÷rçGWF"Â6–¶ÆÖÂ†W6¢&÷ræ†W6Â¶–æ´†W6Ò“°¢ÒVÇ6R–b‡&÷rçGW"ÓÓÒv6&•÷F‡6–ÆBrÇÂ&÷rçGW"ÓÓÒwF‡6–ÆBr’°¢&–ÆF—&–Ô†W6Æ&’Ò²6÷W&6T66÷VçC¢&÷ræ¶'6•÷F&bÇÂt6&’rÂF&vWD66÷VçC¢&÷ræ†W6Ó°¢"Òv—B&—¦–Ö†W6÷7D–æ6öÖR‡²–C¢&÷ræ–BÂF&–ƒ¢&÷rçF&–‚ÂGWF#¢&÷rçGWF"Â6–¶ÆÖÂ†W6¢&÷ræ†W6Ò“°¢ÒVÇ6R–b†æ&¶–æ¶Æ’’°¢&–ÆF—&–Ô†W6Æ&’Ò²6÷W&6T66÷VçC¢&÷ræ†W6ÂF&vWD66÷VçC¢tTÔäUBrÓ°¢"Òv—B&—¦–Ö†W6÷7EG&ç6fW"‡²–C¢&÷ræ–BÂF&–ƒ¢&÷rçF&–‚ÂGWF#¢&÷rçGWF"Â6–¶ÆÖÂ†W6¢tTÔäUBrÂ¶–æ´†W6¢&÷ræ†W6Ò“°¢ÒVÇ6R–b†·&VF”f—¦’’°¢&–ÆF—&–Ô†W6Æ&’Ò²6÷W&6T66÷VçC¢&÷ræ†W6ÂF&vWD66÷VçC¢tf—¢v–FW&’rÓ°¢"Òv—B&—¦–Ö†W6÷7DW‡Vç6R‡²–C¢&÷ræ–BÂF&–ƒ¢&÷rçF&–‚ÂGWF#¢&‡&÷rçGWF"’Â6–¶ÆÖÂ†W6¢&÷ræ†W6ÂÖ7&d¶ÆVÖ“¢tf—¢rÒ“°¢ÒVÇ6R°¢&–ÆF—&–Ô†W6Æ&’Ò²6÷W&6T66÷VçC¢&÷ræ†W6ÂF&vWD66÷VçC¢&÷ræ¶'6•÷F&bÇÂt&—¦–Ô†W6v–FW&’rÓ°¢"Òv—B&—¦–Ö†W6÷7DW‡Vç6R‡²–C¢&÷ræ–BÂF&–ƒ¢&÷rçF&–‚ÂGWF#¢&‡&÷rçGWF"’Â6–¶ÆÖÂ†W6¢&÷ræ†W6Ò“°¢ĞĞ¢÷WF6öÖRÒ²ö³¢"æö²Â÷WGWC¢"æÖW6¢Ó°Ğ¢–b‡"æö²’°Ğ¢òò##bÓ‚Ós¢W&6âv–âFÆV&’ÒVÆÆRv—&—6—–ÆR6F—6Ö7W†W6Ğ¢òòf'6v¶–FVF–ÆF’rDTäÔU¢‡–æÆ—6Æ–¶Æ–¶–æ6’¶W¢v—&–ÆÖ—0Ğ¢òò6æ–ÆÖ6–â’Â—&’&—"7FGVFR&—&¶–Æ—"¶’wVæÇV²&–ÆF—&–ÖFPĞ¢òò&–ç6â¶öçG&öÇRvW&V¶—–÷""öÆ&²v÷'Vç7VâÂ6W76—¦6R¶–&öÆÖ6–âàĞ¢6öç7BGW'VÒÒ"æ–ç6ä¶öçG&öÇTvW&V¶Æ’òv–ç6åö¶öçG&öÇUövW&V¶Æ’r¢‡"ç¦FVåf&F’òw¦FVå÷f&F’r¢v¶–FVF–ÆF’r“°¢v—BF"æg&öÒ„$äµõD$ÄR’çWFFR‡²&—¦–Ö†W6öGW'V×S¢GW'VÒÂ&—¦–Ö†W6öÖW6£¢"æÖW6¢Â&—¦–Ö†W6ö—6ÆVÕ÷F&–†“¢æWrFFR‚’çFô•4õ7G&–ær‚’Ò’æW‚v–BrÂ&÷ræ–B“°¢–b†GW'VÒÓÓÒv¶–FVF–ÆF’r’°¢6öç7B¶æ—DF’Ò&—¦–Ö†W6÷&W7VÇEô”BG·&÷ræ–GÖ°¢v—B6fUvTF–væ÷7F–72‡vRÂ¶æ—DF’“°¢6öç7B¶æ—E–öÇRÒF‚æ¦ö–â…õöF—&æÖRÂrâârÂvF–væ÷7F–72rÂG¶¶æ—DF—Òçæv“°¢G'’°¢6öç7B&–ÆF—&–ÒÒv—B6VæDf–ææ6U&W7VÇB‡°¢fW&–f–VC¢G'VRÀ¢G&ç67F–öä–C¢&—¦–Ö†W6¢G·&÷ræf—&Öö–BÇÂvÆ–Æ’wÓ¢G·&÷ræ–GÖÀ¢7FGW3¢t$Yä$”Ä’rÀ¢FFS¢&÷rçF&–‚À¢6÷W&6T66÷VçC¢&–ÆF—&–Ô†W6Æ&’ç6÷W&6T66÷VçBÀ¢F&vWD66÷VçC¢&–ÆF—&–Ô†W6Æ&’çF&vWD66÷VçBÀ¢Ö÷VçC¢çVÖ&W"‡&÷rçGWF"’À¢7W'&Væ7“¢uE%’rÀ¢FW67&—F–öã¢"æÖW6¢À¢&ööeFƒ¢¶æ—E–öÇRÀ¢Ò“°¢"æÖW6¢³Ò&–ÆF—&–ÒæGWÆ–6FP¢òrFVÆVw&Ò6öç\:r&–ÆF—&–Ö’F†;fæ6R|;fæFW&–ÆÖœY÷F’âp¢¢FVÆVw&Ò6öç\:rfR|;g'6VÂ¶ìKB|;fæFW&–ÆF’†ÖW6£¢G¶&–ÆF—&–ÒæÖW76vT–GÒ’æ°¢÷WF6öÖRæ÷WGWBÒ"æÖW6£°¢Ò6F6‚†&–ÆF—&–Ô†F6’’°¢Æör†DTÄTu$Õô$”ÄD•$”Õô„D4’”C¢G·&÷ræ–GÒG¶&–ÆF—&–Ô†F6’æÖW76vWÖ“°¢"æÖW6¢³ÒFVÆVw&Ò&–ÆF—&–Ö’|;fæFW&–ÆVÖVF“¢G¶&–ÆF—&–Ô†F6’æÖW76vWÖ°¢÷WF6öÖRæ÷WGWBÒ"æÖW6£°¢Ğ¢Ğ¢Ğ¢ĞĞ¢ÒVÇ6R°¢÷WF6öÖRÒ²ö³¢fÇ6RÂ÷WGWC¢&–Æ–æÖW–Vâ¶ö×WC¢G¶6ÖBæ6öÖÖæGÖÓ°¢Ğ¢Ğ¢Ò6F6‚†R’°¢÷WF6öÖRÒ²ö³¢fÇ6RÂ÷WGWC¢7G&–ær†RæÖW76vRÇÂR’Ó°Ğ¢ĞĞ¢v—BF"æg&öÒ‚v&÷Eö6öÖÖæG2r’çWFFR‡²7FGW3¢÷WF6öÖRæö²òv6ö×ÆWFVBr¢vf–ÆVBrÂ&W7VÇC¢÷WF6öÖRæ÷WGWBç6Æ–6RƒÂƒ’Â6ö×ÆWFVEöC¢æWrFFR‚’çFô•4õ7G&–ær‚’Ò’æW‚v–BrÂ6ÖBæ–B“°¢–b‚†6ÖBæ6öÖÖæBÓÓÒvFW6·F÷ö÷Vå÷W&ÂrÇÂ6ÖBæ6öÖÖæBÓÓÒv&—¦–Ö†W6öW‡Vç6Rr’bb&×2æ6†Eö–B’°¢6öç7B–6öâÒ÷WF6öÖRæö²ò~)ÈRr¢~)ªûˆòs°¢v—B6VæEFVÆVw&Ô6öÖÖæE&W7VÇB‡&×2æ6†Eö–BÂG¶–6öçÒÖ6;Ç7L;Â¶ö×WB6öçV7UÆâG¶÷WF6öÖRæ÷WGWGÖ“°¢Ğ¢Æör†¶ö×WB&—GF“¢2G¶6ÖBæ–GÒÓâG¶÷WF6öÖRæö²òv6ö×ÆWFVBr¢vf–ÆVBwÖ“°Ğ§ĞĞ Ğ¢òò##bÓ‚Óó#¢W&6âv–â6–¶6—7FVF–v’&GVç–7FæF&F’Â†–6&—"¦ÖàĞ¢òò¶÷Ö6–â"†VFVf–æRvW&6V¶6’¶F¶–ÒÒ6Æ÷VFfÆ&Rv–â&—¦’FV·&"FV·& Ğ¢òò&æÆÖ6–æ–â6–Â6V&V&’DõÅR—6ÆW"6—&6–æF6ö²¶—6&–ÆƒRÓc6âĞ¢òòöæÆ&6÷—W¦ÆW&6R÷FöÖF–²—6ÆVÒ–ÖÖ—¢…d´”b4•$´UBvW&’ÖFöÆGW&Öv–&’’àĞ¢òò–ç6â&—"×V†6V&V6’'R†—¦F6Æ—6Ö¢â6FÆ–²&—"&&—¦–Ö†W6÷&ö6W72 Ğ¢òòFfæ’²†W"¶ö×WB&6–æF$5DtTÄR†–ç6âv–&’FVv—6¶Vâ’&V¶ÆVÖRV¶ÆVæ—–÷ Ğ¢òòÒ'RÂ6b†—¢–W&–æR5U$EU%TÄT$”Ä•$Ä”t’öæ6VÆ–¶ÆVæF—&—"àĞ¢òò##bÓ‚Ó"FVævVÆVÖS¢–Æ²FVvW"ƒC÷6BÂ‚ÓC6â’vW&Vv–æFVâf¦ÆĞ¢òò–f7F’Ò'R÷GW'VÖF¶’tU$4T²&âöÆ–Æ&–æ–â–¶—6’FR†7&6‚ÖÆö÷wFĞ¢òòFV·&"FV·&"”Tä”DTât•$•2ÂfW–vV6R&÷—R´U4”åD•4•¢—W¦ÆW&6R—6ÆVÒĞ¢òòFV²Ö—6ÆVÒ†—¦–æFâFVv–ÂÂ÷GW'VÒö†6–Ò÷'VçGW'W7VæFVâ¶–æ¶ÆæF’àĞ¢òò÷GW'VÒ¦FVâ¶Æ–6’†¶ö×WB&6–æ–Væ–FVâv—&—2–ö²’Â'R—W¦FVâFfàĞ¢òòÖ·VÂ6Wf—–VFR—V·6VÇF–ÆF’Ò†Æ6&—BÖ&–¶Æ’&÷BFW6Væ’FVv–ÂÂÖĞ¢òòvW&V·6—¢–W&R7W'Væ×W–÷"àĞ¦6öç7B4DÄ”µô$•¤”Ô„U4ô•4ÄTÕõDdä’Ò“°Ğ¦6öç7B—6ÆVÕ¦ÖäFÖvÆ&’ÒµÓ°Ğ¦gVæ7F–öâ6FÆ–µFfä6–ÆF”Ö’‚’°Ğ¢6öç7B7VâÒFFRææ÷r‚“°Ğ¢v†–ÆR†—6ÆVÕ¦ÖäFÖvÆ&’æÆVæwF‚bb7VâÒ—6ÆVÕ¦ÖäFÖvÆ&•³Òâ3c’—6ÆVÕ¦ÖäFÖvÆ&’ç6†–gB‚“°Ğ¢&WGW&â—6ÆVÕ¦ÖäFÖvÆ&’æÆVæwF‚ãÒ4DÄ”µô$•¤”Ô„U4ô•4ÄTÕõDdä“°Ğ§ĞĞ Ğ¦ÆWBF–6´6Æ—6—–÷"ÒfÇ6S°Ğ¦7–æ2gVæ7F–öâF–6²‚’°Ğ¢òò##bÓ‚Óc¢6WD–çFW'fÂöæ6V¶’F–6²v–â†æFÆT6öÖÖæBv’‡vRæv÷FòğĞ¢òòv—Df÷$æf–vF–öâ–ÆRW6âvFVâW§Vâ7W&V&–Æ—–÷"’†Æ6Æ—6—&¶Vâ–VæĞ¢òòF–6²v’FWF–¶Æ—–÷&GRÒ–¶’¶ö×WB”ä’WWFVW"vRv’W2¦ÖæÆĞ¢òò·VÆÆæ—&—&&—&–æ–âf÷&ÒFöÆGW&Ööæf–v7–öçVçR&÷§W–÷&GRƒb¶ö×WFÇV°Ğ¢òòF÷ÇR·W—'V²##bÓ‚ÓbvF†W6’&f÷&ÒÆæÆ&’V·6–²"–ÆRFÆF’’àĞ¢òò&6—B¶–Æ—C¢&—"öæ6V¶’¶ö×WBFÒ&—FÖVFVâ–Væ’F–6²6Æ—6Ö¢àĞ¢–b‡F–6´6Æ—6—–÷"’&WGW&ã°Ğ¢F–6´6Æ—6—–÷"ÒG'VS°Ğ¢G'’°Ğ¢6öç7B²FFÂW'&÷"ÒÒv—BF"æg&öÒ‚v&÷Eö6öÖÖæG2r’ç6VÆV7B‚r¢r’æW‚w7FGW2rÂwVæF–ærr’æ÷&FW"‚v7&VFVEöBrÂ²66VæF–æs¢G'VRÒ’æÆ–Ö—Bƒ’æÖ–&U6–ævÆR‚“°Ğ¢–b†W'&÷"’²Æör†„D‡6÷&wR“¢G¶W'&÷"æÖW76vWÖ“²&WGW&ã²ĞĞ¢–b‚FF’&WGW&ã°Ğ¢–b†FFæ6öÖÖæBç7F'G5v—F‚‚v&—¦–Ö†W6òr’’°Ğ¢òò##bÓ‚Ó#¢F‡&÷GFÆRö¦—GFW"ôä4R6FV6Rv&—¦–Ö†W6÷&ö6W72vPĞ¢òòW–wVÆæ—–÷&GRÒ–EöFöw'VÆ÷67&öÆÅöF–r÷F&ÆUöF–rv–&’F–vW"6æÆĞ¢òòF&––6’¶ö×WFÆ&’†÷¦VÆÆ–¶ÆR6FÆW&6R&÷2·W—'V·Fâ6öç&'@Ğ¢òò&F·W—'V¶ÆæâFöw'VÆÖ¶ö×WFÆ&’’6–f—"vV6–¶ÖW–ÆR'B&FĞ¢òò6Æ—6—–÷&GRâ'RFÒöÆ&²&÷BÖFW6Væ“¢W§Vâ6W76—¦Æ–²²æ’FÆÖàĞ¢òòW&6âv&v—&—6–Ò¦&ÆÖ6–f6–æ–öæÆVæF—&–ÆF’"†&÷B¶÷'VÖ6’Ğ¢òò6V¶Æ–æFRvW&’FöæVâ&—"VævVÆÆR6öçV6ÆæF’â'F–²ETÒ6æÆĞ¢òò&—¦–Ö†W6ò¢¶ö×WFÆ&’–æ’–ç6â×FV×÷7R¦—GFW"v–æ’–Æ6—–÷"àĞ¢–b‡6FÆ–µFfä6–ÆF”Ö’‚’’°Ğ¢Æör†DõÅR•4ÄTÒ”d4ÄDÔ¢6öâ6GFRGµ4DÄ”µô$•¤”Ô„U4ô•4ÄTÕõDdä—Ò—6ÆVÒFfæ–æVÆ6–ÆF’Â2G¶FFæ–GÒ&—"6öç&¶’W–wVâGW"v&—&¶–Æ—–÷"æ“°Ğ¢&WGW&ã°Ğ¢ĞĞ¢—6ÆVÕ¦ÖäFÖvÆ&’çW6‚„FFRææ÷r‚’“°Ğ¢òò–ç6âv–&’FVv—6¶Vâ&V¶ÆVÖRƒBÓg6â’Ò6&—BW6âF–6²&Æ–v’FV°Ğ¢òò&6–æ&&÷BFW6Væ’"öÇW7GW'W–÷&GRÂ¦—GFW"'VçR¶—&"â“÷6BFfæÆĞ¢òò&—&Æ–·FR÷'FÆÖãC6âö—6ÆVÒ‡F–6²²¦—GFW"²—6ÆVÒ7W&W6’’VFW"àĞ¢ÆWB&V¶ÆVÖRÒC²ÖF‚ç&æFöÒ‚’¢#°Ğ¢òòW§Vâ6W76—¦Æ–²6öç&6’–Æ²¶ö×WB–6–âV·7G&&—6–æÖ"&V¶ÆVÖRĞĞ¢òò6FÆW&6R†–6&—"—7FV²v—FÖVÖ—6¶Vâæ–FVâ†—¦Æ’'B&F—7FV°Ğ¢òòv—FÖW6’FV²&6–æ7W†VÆ’&—"FW6VâàĞ¢6öç7B6öä—6ÆVÒÒ—6ÆVÕ¦ÖäFÖvÆ&’æÆVæwF‚ãÒ"ò—6ÆVÕ¦ÖäFÖvÆ&•¶—6ÆVÕ¦ÖäFÖvÆ&’æÆVæwF‚Ò%Ò¢çVÆÃ°Ğ¢–b‡6öä—6ÆVÒbbFFRææ÷r‚’Ò6öä—6ÆVÒâ#¢c¢’°Ğ¢&V¶ÆVÖR³ÒS²ÖF‚ç&æFöÒ‚’¢S°Ğ¢Æör†•4”äÔ$T´ÄTÔU4“¢6öâ—6ÆVÖFVâG´ÖF‚ç&÷VæB‚„FFRææ÷r‚’Ò6öä—6ÆVÒ’òc—ÒF²vV6Ö—2ÂV·7G&vV6–¶ÖRV¶ÆVæ—–÷"æ“°Ğ¢ĞĞ¢v—BæWr&öÖ—6R‡"Óâ6WEF–ÖV÷WB‡"Â&V¶ÆVÖR’“°Ğ¢ĞĞ¢v—B†æFÆT6öÖÖæB†FF“°Ğ¢Òf–æÆÇ’°Ğ¢F–6´6Æ—6—–÷"ÒfÇ6S°Ğ¢ĞĞ§ĞĞ Ğ¢†7–æ2‚’Óâ°Ğ¢Æör‚tW&”ôâ–W&VÂF–æÆW––6’‡c"Â¶Æ–6’÷GW'VÒ’&6ÆF–Æ—–÷"âââr“°Ğ¢òò##bÓ‚Ós¢F–æÆW––6’&—"¶ö×WB—6ÆVÖRõ%D4”äD‡7FGW3Òw&ö6W76–ærrĞ¢òòGW&GW'VÇW–Væ–FVâ&6ÆF–Æ—'6†¶öBwVæ6VÆÆVÖW6’–6–â6–²6–°Ğ¢òò––Æ—–÷"’Âò¶ö×WB6öç7W¦¶F"w&ö6W76–ærvFRF¶–Æ’¶Æ—–÷&GRĞĞ¢òò&—"F†4Ä—6ÆVæÖ—–÷&GR‚3#’ô”C£s’vF–¶ÆæF’’â&6Ææv–7FĞ¢òò–&–Ò¶ÆÖ—2‡&ö6W76–ær’¶ö×WFÆ"wVæF–ærvRvW&’Æ–æ—"Â÷FöÖF–°Ğ¢òò–Væ–FVâFVæVæ—"àĞ¢6öç7B²FF¢–&–Ô¶ÆæÆ"ÒÒv—BF"æg&öÒ‚v&÷Eö6öÖÖæG2r’çWFFR‡²7FGW3¢wVæF–ærrÒ’æW‚w7FGW2rÂw&ö6W76–ærr’ç6VÆV7B‚v–Br“°Ğ¢–b‡–&–Ô¶ÆæÆ"bb–&–Ô¶ÆæÆ"æÆVæwF‚’Æör†U”$“¢G·–&–Ô¶ÆæÆ"æÆVæwF‡Ò–&–Ò¶ÆÖ—2¶ö×WB†öæ6V¶’6Æ—7F—&ÖFâ’–Væ–FVâ·W—'VvÆ–æF“¢G·–&–Ô¶ÆæÆ"æÖ‡"Óâ"æ–B’æ¦ö–â‚rÂr—Ö“°Ğ¢òò##bÓ‚Ó¢&6Ææv–2v—&—6’G'’ö6F6‚D•4”äD–F’Ò&—¦–Ô†W6v—&—0Ğ¢òò6–f6’vV6–6’–f2–æ—BfW&–æ6Rƒ'6âF–ÖV÷WB’Vç7W&U6W76–öâ‚’&VFFVF— Ğ¢òò'WGVâ&ö6W72v’6ö¶W'F—–÷&GRÂvF6†För†W"VF²vF–Væ’6‡&öÖR6—–æĞ¢òò6V¶–ÆFR6ö·W–÷&GR†7&6‚ÖÆö÷Â÷FöÖ7–öâ6FÆW&6RFÖÖVâGW&GR’àĞ¢òò†æFÆT6öÖÖæB‚’¦FVâ¶VæF’Vç7W&U6W76–öâ‚’6w&—6–æ’G'’ö6F6‚–6–æFPĞ¢òò–—–÷"†¶ö×WB&6&—6—¢—6&WFÆVæ—"Â&ö6W72–·F¶Æ—"’Ò&6Ææv–7FĞ¢òòF–æ’FöÆW&ç6’W–wVÆ¢†Ff'6ÆövÆÂ&ö6W72v’F–6²FöæwW7VæR&—&²àĞ¢G'’°Ğ¢v—BVç7W&U6W76–öâ‚“°Ğ¢Æör‚t÷GW'VÒ†¦—"â¶ö×WB&V¶ÆVæ—–÷"††W"R6æ—–VFR&—"¶öçG&öÂ’âââr“°Ğ¢Ò6F6‚†R’°Ğ¢Æör†U”$“¢&6Ææv–2÷GW'V×R&6&—6—¢‚G¶RæÖW76vRÇÂWÒ’Ò&ö6W72–·F¶Æ—–÷"Â6öç&¶’¶ö×WFÆFV·&"FVæVæV6V²æ“°Ğ¢ĞĞ¢F–6²‚“°Ğ¢6WD–çFW'fÂ‡F–6²ÂS“°Ğ§Ò’‚“°Ğ 