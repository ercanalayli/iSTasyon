// 2026-08-02: Ercan'in istegi - "kredi karti, KMH, banka hesabi ve kredileri
// BizimHesap'tan alabilirsin". Bu KESIF (discovery) scripti - Nakit Yonetimi >
// Hesaplar (ngnaccounts) sayfasinin gercek yapisini (hangi hesap tipleri var,
// hangi kolonlar var) once GORMEK icin, hicbir seyi Supabase'e yazmadan sadece
// loga basiyor. Gercek yapiyi gordukten sonra duzgun bir yapili scraper yazilacak.
const { getBizimHesapConfig, launchOptions, loginBizimHesap, selectFirma } = require('./bizimhesap_common.cjs');
const puppeteer = require('puppeteer');

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

const FIRMA = { id: 'alayli', adi: 'ALAYLI MEDIKAL', arama: 'ALAYLI' };

(async () => {
  const browser = await puppeteer.launch(launchOptions({ headless: true, width: 1366, height: 768 }));
  const page = await browser.newPage();
  try {
    await loginBizimHesap(page, log);
    await selectFirma(page, FIRMA, log);

    const { firmUrl } = getBizimHesapConfig();
    const accountsUrl = 'https://bizimhesap.com/web/ngn/acc/ngnaccounts';
    log(`[GIT] ${accountsUrl}`);
    await page.goto(accountsUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => log(`[GOTO HATA] ${e.message}`));
    await new Promise(r => setTimeout(r, 2500));

    // Ilk gecis metin cikartti (KREDI KARTLARI / BANKA HESAPLARI basliklari
    // gorundu) ama tablo/kart secicileri gercek DOM yapisini bulamadi - bu
    // gecis "YAPI KREDİ" gibi bilinen bir metni iceren en KUCUK/en DAR
    // elementi bulup, onun ata zincirini (parent chain) disariya dogru HTML
    // olarak dokup gercek markup'i gormeye calisiyor.
    const info = await page.evaluate(() => {
      const txt = s => String(s || '').replace(/\s+/g, ' ').trim();
      function smallestContaining(needle) {
        const all = [...document.querySelectorAll('body *')];
        let best = null;
        for (const el of all) {
          const t = el.innerText || '';
          if (t.includes(needle)) {
            if (!best || t.length < (best.innerText || '').length) best = el;
          }
        }
        return best;
      }
      const anchor = smallestContaining('KK ARTI AKBANK') || smallestContaining('KREDİ KARTLARI');
      const chain = [];
      let cur = anchor;
      for (let i = 0; i < 6 && cur; i++) {
        chain.push({
          tag: cur.tagName, cls: (cur.className || '').toString().slice(0, 80),
          outerHTMLSnippet: (cur.outerHTML || '').slice(0, 1500),
        });
        cur = cur.parentElement;
      }
      return { chain, anchorFound: !!anchor };
    });

    log(`[ANCHOR BULUNDU] ${info.anchorFound}`);
    info.chain.forEach((c, i) => {
      log(`[ZINCIR ${i}] tag=${c.tag} class="${c.cls}"`);
      log(`  HTML: ${c.outerHTMLSnippet}`);
    });

    log('TAMAMLANDI');
  } catch (e) {
    log(`[HATA] ${e.message}`);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
})();
