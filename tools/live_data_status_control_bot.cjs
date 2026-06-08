const puppeteer = require('puppeteer');
const fs = require('fs');

const LIVE_URL = process.env.APERION_LIVE_URL || 'https://aperion-istasyon.pages.dev/';
const OUT_DIR = 'artifacts/live-data-status-control';
const CHECK_MARKER = 'live-data-status-control-2026-06-08-01';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

async function shot(page, name) {
  const file = `${OUT_DIR}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function main() {
  ensureDir(OUT_DIR);
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  const results = [];

  try {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle2', timeout: 70000 });
    await sleep(4000);
    await shot(page, '01-veri-durumu');

    results.push(['Canli site acildi', true]);
    results.push(['Ana kontrol paneli', await hasAnyText(page, ['Ana Sayfa Kontrol Paneli', 'ERP Radar', 'Yonetici Masasi', 'Yönetici Masası'])]);
    results.push(['Senkron durumu', await hasAnyText(page, ['SENKRON OK', 'Son guncelleme', 'Son güncelleme', 'Dogrulandi', 'Doğrulandı'])]);
    results.push(['Bugun satis karti', await hasAnyText(page, ['Bugun Satis', 'Bugün Satış', 'Bugün Satis'])]);
    results.push(['Dun satis karti', await hasAnyText(page, ['Dun Satis', 'Dün Satış', 'Dün Satis'])]);
    results.push(['Gelir tablosu alani', await hasAnyText(page, ['Gelir Tablosu', 'Tahakkuk Esasi', 'Tahakkuk Esası', 'Gerceklesen', 'Gerçekleşen'])]);
    results.push(['Veri kaniti alani', await hasAnyText(page, ['Kaynak:', 'Kayit / kontrol', 'Kayıt / kontrol', 'Kontrol:', 'Dogrulandi', 'Doğrulandı'])]);
    results.push(['JS hata ekrani yok', !(await hasText(page, 'not a function')) && !(await hasText(page, 'Veri Okunamadi')) && !(await hasText(page, 'Veri Okunamadı'))]);

    const failed = results.filter(x => !x[1]);
    const report = {
      marker: CHECK_MARKER,
      url: LIVE_URL,
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
