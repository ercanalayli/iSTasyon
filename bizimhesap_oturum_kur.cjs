const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { getBizimHesapConfig, launchOptions, loginBizimHesap, selectFirma } = require('./bizimhesap_common.cjs');

const ROOT = __dirname;
const STATUS_FILE = path.join(ROOT, 'data', 'bizimhesap_session_status.json');
const firma = { id: 'alayli', adi: 'ALAYLI MEDIKAL', sektor: 'ALAYLI', arama: 'ALAYLI' };

function writeStatus(data) {
  fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
  fs.writeFileSync(STATUS_FILE, JSON.stringify({ ...data, updated_at: new Date().toISOString() }, null, 2), 'utf8');
}

function log(msg) {
  const line = `[${new Date().toLocaleString('tr-TR')}] ${msg}`;
  console.log(line);
  fs.appendFileSync(path.join(ROOT, 'bizimhesap_oturum_log.txt'), line + '\n', 'utf8');
}

(async () => {
  const config = getBizimHesapConfig();
  const browser = await puppeteer.launch(launchOptions({ headless: false, width: 1366, height: 850 }));
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr-TR,tr;q=0.9' });

  try {
    await loginBizimHesap(page, log);
    await selectFirma(page, firma, log);
    writeStatus({ ok: true, url: page.url(), email: config.email, message: 'BizimHesap oturumu hazir' });
    log('OK: BizimHesap oturumu hazir');
  } catch (e) {
    writeStatus({ ok: false, url: page.url(), email: config.email, message: e.message });
    log('KONTROL GEREKIYOR: ' + e.message);
    log('Acilan pencerede sifre degisim/dogrulama varsa tamamla, firma ana sayfasina gecince bu pencereyi kapatma.');
    await new Promise(() => {});
  }
})();
