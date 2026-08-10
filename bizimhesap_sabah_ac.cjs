// AperiON — sabah otomatik BizimHesap açma
// Kayıtlı .bizimhesap-profile oturumunu kullanır, YENİDEN GİRİŞ İSTEMEZ.
// Oturum süresi dolmuşsa (BizimHesap kendi kuralına göre) görünür pencerede
// tekrar giriş ekranı çıkabilir — bu durumda elle giriş gerekir, script şifre girmez.
const puppeteer = require('puppeteer');
const { writeFileSync } = require('fs');
const path = require('path');
const { launchOptions, checkLoginCooldown } = require('./bizimhesap_common.cjs');

const targetUrl = process.env.BIZIMHESAP_HOME_URL || 'https://bizimhesap.com/web/ngn/newportal';
const statusPath = path.join(__dirname, 'data', 'bizimhesap_sabah_ac_status.json');

async function main() {
  // 2026-08-10: bu script de bagimsiz bir bizimhesap.com istegi atiyordu,
  // paylasilan devre kesiciyi HIC kontrol etmiyordu - Cloudflare soguma
  // suresince tarayici penceresi acip ekstra istek uretmesin diye once bak.
  const cooldown = checkLoginCooldown();
  if (cooldown.blocked) {
    writeFileSync(statusPath, JSON.stringify({
      ok: false,
      checkedAt: new Date().toISOString(),
      note: `Atlandi: BizimHesap giris sogumada (${cooldown.reason}), ${cooldown.until} tarihine kadar istek atilmiyor.`,
    }, null, 2), 'utf8');
    console.log(`ATLANDI: soguma aktif (${cooldown.until}).`);
    return;
  }
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
