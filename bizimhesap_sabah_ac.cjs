// AperiON — sabah otomatik BizimHesap açma
// Kayıtlı .bizimhesap-profile oturumunu kullanır, YENİDEN GİRİŞ İSTEMEZ.
// Oturum süresi dolmuşsa (BizimHesap kendi kuralına göre) görünür pencerede
// tekrar giriş ekranı çıkabilir — bu durumda elle giriş gerekir, script şifre girmez.
const puppeteer = require('puppeteer');
const { writeFileSync } = require('fs');
const path = require('path');
const { launchOptions } = require('./bizimhesap_common.cjs');

const targetUrl = process.env.BIZIMHESAP_HOME_URL || 'https://bizimhesap.com/web/ngn/newportal';
const statusPath = path.join(__dirname, 'data', 'bizimhesap_sabah_ac_status.json');

async function main() {
  const browser = await puppeteer.launch(launchOptions({ headless: false, width: 1400, height: 900 }));
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr-TR,tr;q=0.9' });
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));

  const url = page.url();
  const loggedIn = url.includes('/web/ngn/') && !url.toLowerCase().includes('login');

  writeFileSync(statusPath, JSON.stringify({
    ok: loggedIn,
    checkedAt: new Date().toISOString(),
    url,
    profileDir: process.env.BIZIMHESAP_PROFILE_DIR || path.join(__dirname, '.bizimhesap-profile'),
    note: loggedIn
      ? 'BizimHesap otomatik acildi, oturum gecerli.'
      : 'BizimHesap acildi ama oturum gecersiz gorunuyor — elle giris gerekebilir (sifre otomatik girilmez).',
  }, null, 2), 'utf8');

  console.log(loggedIn ? 'OK: BizimHesap oturumu gecerli, pencere acik birakildi.' : 'UYARI: Oturum gecersiz, elle giris gerekebilir.');
  // Pencere kasıtlı olarak kapatılmıyor — kullanıcı sabah ekranını açtığında hazır bulsun.
}

main().catch(err => {
  console.error('HATA:', err.message);
  process.exitCode = 1;
});
