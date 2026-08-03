// 2026-08-03: "sen bana is paslama, sen bizimhesap'a her zaman kolaylikla
// baglanip islem/kontrol yapabilecek sekilde sistemi kur" (Ercan). Read-only
// dogrulama scripti - menu tiklamasiyla (URL tahmini degil, bizimhesap_banka_bot.cjs
// ile AYNI "Nakit Yonetimi > Masraflar" yolunu izler) Masraflar listesine gidip
// sayfa metninde belirli bir aciklamayi arar. Hicbir sey yazmaz/tiklamaz/kaydetmez.
const { getBizimHesapConfig, launchOptions, loginBizimHesap, selectFirma } = require('../bizimhesap_common.cjs');
const puppeteer = require('puppeteer');

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
const SEARCH = process.argv.includes('--search') ? process.argv[process.argv.indexOf('--search') + 1] : 'APERION AUTO | ID:38';
const FIRMA = { id: 'alayli', adi: 'ALAYLI MEDIKAL', arama: 'ALAYLI' };

async function tiklaMenu(page, kelime) {
  const tiklandi = await page.evaluate(k => {
    const norm = s => (s || '').toLowerCase()
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const hedef = norm(k);
    const el = [...document.querySelectorAll('a,button,span,div')]
      .find(x => norm(x.innerText).includes(hedef) && (x.innerText || '').length < 80);
    if (!el) return false;
    (el.closest('a') || el.closest('button') || el).click();
    return true;
  }, kelime);
  if (tiklandi) {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 900));
  }
  return tiklandi;
}

(async () => {
  const browser = await puppeteer.launch(launchOptions({ headless: true, width: 1366, height: 768 }));
  const page = await browser.newPage();
  try {
    await loginBizimHesap(page, log);
    await selectFirma(page, FIRMA, log);
    for (const kelime of ['Nakit Yönetimi', 'Nakit Yonetimi', 'Masraflar', 'Masraf']) {
      const ok = await tiklaMenu(page, kelime);
      log(`[TIKLA] "${kelime}" -> ${ok}`);
    }
    await new Promise(r => setTimeout(r, 1500));
    // "Tumu" sekmesine tikla (varsayilan "Son 3 Ay" gibi dar bir filtre olabilir,
    // eski/farkli tarihli kayitlari kacirmamak icin) - 2026-08-03 duzeltmesi.
    const tumuOk = await tiklaMenu(page, 'Tümü');
    log(`[TIKLA] "Tümü" -> ${tumuOk}`);
    await new Promise(r => setTimeout(r, 1000));
    // "Ara:" arama kutusuna yaz - sayfadaki metni degil, BizimHesap'in kendi
    // sunucu-tarafi aramasini kullanir, tarih filtresinden bagimsiz calisir.
    const aramaYazildi = await page.evaluate((needle) => {
      const label = [...document.querySelectorAll('*')].find(x => (x.textContent || '').trim() === 'Ara:' && x.children.length === 0);
      let input = null;
      if (label) {
        let cur = label.parentElement;
        for (let i = 0; i < 4 && cur && !input; i++) { input = cur.querySelector('input[type="text"],input:not([type])'); cur = cur.parentElement; }
      }
      if (!input) input = document.querySelector('input[type="text"],input:not([type])');
      if (!input) return false;
      input.focus();
      input.value = needle;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      return true;
    }, SEARCH);
    log(`[ARAMA KUTUSU] yazildi=${aramaYazildi}`);
    await new Promise(r => setTimeout(r, 2000));
    const info = await page.evaluate((needle) => {
      const bodyText = document.body.innerText || '';
      const found = bodyText.includes(needle);
      let context = '';
      if (found) {
        const idx = bodyText.indexOf(needle);
        context = bodyText.slice(Math.max(0, idx - 200), idx + 200);
      }
      return { found, context, urlNow: location.href, bodySample: bodyText.slice(0, 2000) };
    }, SEARCH);
    log(`[ARANAN] "${SEARCH}"`);
    log(`[SAYFA URL] ${info.urlNow}`);
    log(`[BULUNDU] ${info.found}`);
    if (info.found) {
      log(`[BAGLAM] ${info.context.replace(/\s+/g, ' ')}`);
    } else {
      log(`[SAYFA OZETI] ${info.bodySample.replace(/\s+/g, ' ').slice(0, 1200)}`);
    }
    log('TAMAMLANDI');
  } catch (e) {
    log(`[HATA] ${e.message}`);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
})();
