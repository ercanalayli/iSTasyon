const puppeteer = require('puppeteer');
const fs = require('fs');

const LIVE_URL = process.env.APERION_LIVE_URL || 'https://aperion-istasyon.pages.dev/';
const OUT_DIR = 'artifacts/live-visual-control';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function hasText(page, text) {
  return page.evaluate((target) => (document.body.innerText || '').toLocaleLowerCase('tr-TR').includes(target.toLocaleLowerCase('tr-TR')), text);
}

async function clickText(page, text) {
  const clicked = await page.evaluate((target) => {
    const all = Array.from(document.querySelectorAll('a,button,div,span'));
    const el = all.find(x => (x.innerText || '').toLocaleLowerCase('tr-TR').includes(target.toLocaleLowerCase('tr-TR')));
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  }, text);
  await page.waitForTimeout(1200);
  return clicked;
}

async function shot(page, name) {
  const file = `${OUT_DIR}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function main() {
  ensureDir(OUT_DIR);
  const results = [];
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });

  try {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle2', timeout: 70000 });
    await page.waitForTimeout(3000);
    results.push(['Canlı site açıldı', true]);
    await shot(page, '01-home');

    const onayClicked = await clickText(page, 'Onay Merkezi');
    results.push(['Onay Merkezi menüsü/alanı', onayClicked || await hasText(page, 'Onay')]);
    await shot(page, '02-onay-merkezi');

    results.push(['Telegram canlı kutusu', await hasText(page, 'Telegram') && (await hasText(page, 'canlı') || await hasText(page, 'alarm'))]);
    results.push(['Basit Telegram kutusu', await hasText(page, 'Basit Telegram') || await hasText(page, 'Telegram')]);
    results.push(['Gamze harici cari kontrolü', !(await hasText(page, 'Gamze Eczanesi ALKAM'))]);

    const hesapClicked = await clickText(page, 'Hesaplar');
    results.push(['Hesaplar ekranı', hesapClicked || await hasText(page, 'Hesap')]);
    await shot(page, '03-hesaplar');

    results.push(['Banka ekstre yükleme kutusu', (await hasText(page, 'Banka')) && ((await hasText(page, 'Ekstre')) || (await hasText(page, 'Yükle')))]);
    await shot(page, '04-banka-ekstre');

    const failed = results.filter(x => !x[1]);
    const report = {
      url: LIVE_URL,
      checked_at: new Date().toISOString(),
      results: results.map(([name, ok]) => ({ name, ok })),
      status: failed.length ? 'FAILED' : 'OK'
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
