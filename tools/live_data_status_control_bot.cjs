const puppeteer = require('puppeteer');
const fs = require('fs');

const LIVE_URL = process.env.APERION_LIVE_URL || 'https://aperion-istasyon.pages.dev/';
const OUT_DIR = 'artifacts/live-data-status-control';

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
async function hasText(page, text) {
  return page.evaluate((target) => (document.body.innerText || '').toLocaleLowerCase('tr-TR').includes(target.toLocaleLowerCase('tr-TR')), text);
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
    await page.waitForTimeout(4000);
    await shot(page, '01-veri-durumu');
    results.push(['Canlı site açıldı', true]);
    results.push(['ANA KONTROL kartı', await hasText(page, 'ANA KONTROL')]);
    results.push(['Klon Senkronu kartı', await hasText(page, 'Klon Senkronu')]);
    results.push(['Bugün Satış kartı', await hasText(page, 'Bugün Satış')]);
    results.push(['Dün Satış kartı', await hasText(page, 'Dün Satış')]);
    results.push(['Son Satış Tarihi kartı', await hasText(page, 'Son Satış Tarihi')]);
    results.push(['Kontrol Detayı alanı', await hasText(page, 'Kontrol Detayı')]);
    results.push(['Kırmızı JS hata ekranı yok', !(await hasText(page, 'not a function')) && !(await hasText(page, 'Veri Okunamadı'))]);

    const failed = results.filter(x => !x[1]);
    const report = { url: LIVE_URL, checked_at: new Date().toISOString(), status: failed.length ? 'FAILED' : 'OK', results: results.map(([name, ok]) => ({ name, ok })) };
    fs.writeFileSync(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2));
    fs.writeFileSync(`${OUT_DIR}/report.txt`, results.map(([name, ok]) => `${ok ? 'OK' : 'FAIL'} - ${name}`).join('\n'));
    console.log(fs.readFileSync(`${OUT_DIR}/report.txt`, 'utf8'));
    if (failed.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch(err => { console.error(err && err.stack ? err.stack : err); process.exitCode = 1; });
