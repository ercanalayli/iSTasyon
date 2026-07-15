const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const root = __dirname;
const profileDir = process.env.HATTAT_MUSAVIR_PROFILE_DIR || path.join(root, '.hattat-musavir-profile');
const statusFile = path.join(root, 'data', 'hattat_musavir_session_status.json');
const startUrl = process.env.HATTAT_MUSAVIR_START_URL || 'https://hattatmusavir.com/MaliMusavir/Ayarlar/FavoriteMenus';

function writeStatus(data) {
  fs.mkdirSync(path.dirname(statusFile), { recursive: true });
  fs.writeFileSync(statusFile, `${JSON.stringify({ ...data, updated_at: new Date().toISOString() }, null, 2)}\n`, 'utf8');
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: profileDir,
    defaultViewport: { width: 1440, height: 920 },
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage();
  await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  writeStatus({ ok: false, mode: 'interactive_setup', url: page.url(), message: 'Hattat oturum penceresi açıldı. Girişi tarayıcıda tamamlayın; parola kaydedilmez.' });
  console.log('Hattat oturum penceresi açıldı. Girişi tamamlayın ve Aylık Ödeme Listesi ekranına gelin.');
  console.log('Parola kodda, .env dosyasında veya GitHub secrets içinde saklanmaz.');
  page.on('framenavigated', async () => {
    const text = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    if (/Aylık Ödeme Listesi/i.test(text)) {
      writeStatus({ ok: true, mode: 'interactive_setup', url: page.url(), message: 'Aylık Ödeme Listesi ekranı görüldü; kalıcı yerel oturum hazır.' });
      console.log('SONUC: BASARILI - Aylık Ödeme Listesi ekranı doğrulandı.');
    }
  });
})();
