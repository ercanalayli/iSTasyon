const puppeteer = require('puppeteer');
const fs = require('fs');

const OUT_DIR = 'artifacts/live-data-status-control';
const CHECK_MARKER = 'live-data-status-control-2026-07-03-01';
const DEFAULT_LIVE_URLS = [
  'https://aperion-istasyon.pages.dev/',
  'https://ercanalayli.github.io/iSTasyon/'
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function liveUrlCandidates() {
  const raw = process.env.APERION_LIVE_URLS || process.env.APERION_LIVE_URL || '';
  const urls = raw
    ? raw.split(',').map(x => x.trim()).filter(Boolean)
    : DEFAULT_LIVE_URLS;
  return [...new Set(urls)];
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function hasText(page, text) {
  return page.evaluate((target) => (
    document.body.innerText || ''
  ).toLocaleLowerCase('tr-TR').includes(target.toLocaleLowerCase('tr-TR')), text);
}

async function hasAnyText(page, texts) {
  for (const text of texts) {
    if (await hasText(page, text)) return true;
  }
  return false;
}

async function hasAnyHtml(page, terms) {
  return page.evaluate((items) => {
    const html = document.documentElement.outerHTML || '';
    return items.some(term => html.includes(term));
  }, terms);
}

async function shot(page, name) {
  const file = `${OUT_DIR}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function gotoFirstLiveUrl(page) {
  let lastError = null;
  for (const url of liveUrlCandidates()) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 70000 });
      return url;
    } catch (error) {
      lastError = error;
      console.log(`WARN - Canli URL acilamadi: ${url} - ${error.message || error}`);
    }
  }
  throw lastError || new Error('No live URL candidates configured.');
}

async function main() {
  ensureDir(OUT_DIR);
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  const results = [];

  try {
    const liveUrl = await gotoFirstLiveUrl(page);
    await sleep(4000);
    await shot(page, '01-veri-durumu');

    results.push([`Canli URL secildi: ${liveUrl}`, true]);
    results.push(['Canli site acildi', true]);
    results.push(['Ana kontrol paneli', await hasAnyText(page, ['Komuta Merkezi', 'Ust Akil Paneli', 'Ust Akil', 'ERP Radar', 'Yonetici Masasi'])]);
    results.push(['Senkron durumu', await hasAnyText(page, ['SENKRON OK', 'Son guncelleme', 'Dogrulandi', 'Canli'])]);
    results.push(['Banka karar karti', await hasAnyText(page, ['BizimHesap onayi', 'BizimHesap', 'Banka Komuta Merkezi'])]);
    results.push(['Canli banka akisi', await hasAnyText(page, ['Banka Canli', 'Banka Komuta Merkezi', 'Banka'])]);
    results.push(['Gelir tablosu alani', await hasAnyText(page, ['Gelir Tablosu', 'Tahakkuk', 'Gerceklesen'])]);
    results.push(['Veri kaniti alani', await hasAnyHtml(page, ['bank-posting-flow', 'bank-approval-path']) || await hasAnyText(page, ['Kayit sonucu', 'Kontrol:', 'Dogrulandi'])]);
    results.push(['JS hata ekrani yok', !(await hasText(page, 'not a function')) && !(await hasText(page, 'Veri Okunamadi'))]);

    const failed = results.filter(x => !x[1]);
    const report = {
      marker: CHECK_MARKER,
      url: liveUrl,
      attempted_urls: liveUrlCandidates(),
      checked_at: new Date().toISOString(),
      status: failed.length ? 'FAILED' : 'OK',
      results: results.map(([name, ok]) => ({ name, ok }))
    };
    fs.writeFileSync(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2));
    fs.writeFileSync(`${OUT_DIR}/report.txt`, results.map(([name, ok]) => `${ok ? 'OK' : 'FAIL'} - ${name}`).join('\n'));
    console.log(fs.readFileSync(`${OUT_DIR}/report.txt`, 'utf8'));
    if (failed.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
