const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const root = __dirname;
const profileDir = process.env.APSIYON_PROFILE_DIR || path.join(root, '.apsiyon-profile');
const statusFile = path.join(root, 'data', 'apsiyon_session_status.json');
const startUrl = process.env.APSIYON_START_URL || 'https://apsiyon.com/account/login';

function writeStatus(data) {
  fs.mkdirSync(path.dirname(statusFile), { recursive: true });
  fs.writeFileSync(statusFile, `${JSON.stringify({ ...data, updated_at: new Date().toISOString() }, null, 2)}\n`, 'utf8');
}

function hasAccrualContext(text) {
  return /borc|tahakkuk|aidat|yakit|yak.t|odemeler|odeme/i.test(text || '');
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: profileDir,
    defaultViewport: { width: 1440, height: 920 },
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  writeStatus({
    ok: false,
    mode: 'interactive_setup',
    url: page.url(),
    message: 'Apsiyon oturum penceresi acildi. Girisi tamamlayin ve Batikent aidat/yakit tahakkuk veya borclar ekranina gelin. Parola kaydedilmez.',
  });
  console.log('Apsiyon oturum penceresi acildi. Girisi tamamlayin ve tahakkuk/borclar ekranina gelin.');
  console.log('Parola kodda, .env dosyasinda veya GitHub secrets icinde saklanmaz.');

  let lastUrl = '';
  const inspect = async () => {
    const text = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    if (hasAccrualContext(text) && page.url() !== lastUrl) {
      lastUrl = page.url();
      writeStatus({
        ok: true,
        mode: 'interactive_setup',
        url: page.url(),
        message: 'Apsiyon tahakkuk/borclar ekrani goruldu; kalici yerel oturum hazir.',
      });
      console.log('SONUC: BASARILI - Apsiyon tahakkuk/borclar ekrani dogrulandi.');
    }
  };
  page.on('framenavigated', inspect);
  page.on('load', inspect);
  setInterval(inspect, 3000);
})().catch((error) => {
  console.error('SONUC: BASARISIZ');
  console.error(error.message || error);
  process.exitCode = 1;
});
