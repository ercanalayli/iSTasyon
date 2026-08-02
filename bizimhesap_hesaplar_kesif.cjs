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

    const info = await page.evaluate(() => {
      const txt = s => String(s || '').replace(/\s+/g, ' ').trim();
      const tables = [...document.querySelectorAll('table')].map((t, i) => ({
        index: i,
        headers: [...t.querySelectorAll('thead th, tr th')].map(x => txt(x.innerText)),
        rowCount: t.querySelectorAll('tbody tr, tr').length,
        firstRows: [...t.querySelectorAll('tbody tr, tr')].slice(0, 8).map(tr =>
          [...tr.querySelectorAll('td')].map(td => txt(td.innerText))
        ),
      }));
      // Kart/liste bazli gorunumler icin de (tablo degil div bazli olabilir)
      const cardLike = [...document.querySelectorAll('[class*="card"],[class*="account"],[class*="hesap"]')]
        .filter(el => txt(el.innerText).length > 5 && txt(el.innerText).length < 500)
        .slice(0, 20)
        .map(el => txt(el.innerText));
      return {
        url: location.href,
        title: document.title,
        tableCount: tables.length,
        tables,
        cardLikeCount: cardLike.length,
        cardLikeSample: cardLike,
        bodyTextSample: txt(document.body.innerText).slice(0, 3000),
      };
    });

    log(`[SAYFA] url=${info.url} title=${info.title}`);
    log(`[TABLO SAYISI] ${info.tableCount}`);
    info.tables.forEach(t => {
      log(`[TABLO ${t.index}] headers=${JSON.stringify(t.headers)} rowCount=${t.rowCount}`);
      t.firstRows.forEach((r, i) => log(`  [SATIR ${i}] ${JSON.stringify(r)}`));
    });
    log(`[KART BENZERI ELEMAN SAYISI] ${info.cardLikeCount}`);
    info.cardLikeSample.forEach((c, i) => log(`  [KART ${i}] ${c.slice(0, 200)}`));
    log(`[BODY METIN ORNEGI] ${info.bodyTextSample}`);

    log('TAMAMLANDI');
  } catch (e) {
    log(`[HATA] ${e.message}`);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
})();
