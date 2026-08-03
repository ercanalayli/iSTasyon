// 2026-08-03: Ercan'in istegi - "AperiON BizimHesap'a her zaman, her sekilde
// erisebiliyor olmali". Kok neden bulundu: GitHub Actions her calismada
// RASTGELE, YENI bir bulut IP'siyle geliyor - BizimHesap bunu her seferinde
// "yeni cihaz" sayip captcha/dogrulama istiyor. Bu bilgisayar (Ercan'in kendi,
// kalici IP'li makinesi) ayni "cihaz" olarak kalici bir tarayici profiliyle
// calisirsa, captcha SADECE ILK girişte cikar, sonrasinda oturum/cerezler
// kalici profilde saklanip normal donen kullanici gibi gorunur.
//
// Kullanim:
//   node tools/run_bizimhesap_local.cjs --dry-run          (varsayilan, yazmiyor)
//   node tools/run_bizimhesap_local.cjs --commit --save    (gercek yazim)
//   node tools/run_bizimhesap_local.cjs --verify "ARANACAK METIN"  (masraflar listesinde ara)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ENV_FILE = path.join(__dirname, '..', 'local-secrets', 'bizimhesap.local.env');
if (!fs.existsSync(ENV_FILE)) {
  console.error('HATA: local-secrets/bizimhesap.local.env bulunamadi. Once bu dosyayi Notepad ile acip gercek sifreyi yaz.');
  process.exit(1);
}
require('dotenv').config({ path: ENV_FILE });

if (!process.env.BIZIMHESAP_PASSWORD || process.env.BIZIMHESAP_PASSWORD.includes('BURAYA_')) {
  console.error('HATA: BIZIMHESAP_PASSWORD hala placeholder. local-secrets/bizimhesap.local.env dosyasinda gercek sifreyi yaz ve kaydet.');
  process.exit(1);
}

const PROFILE_DIR = path.join(__dirname, '..', 'local-secrets', '.bizimhesap-persistent-profile');
fs.mkdirSync(PROFILE_DIR, { recursive: true });

const args = process.argv.slice(2);
const verifyIdx = args.indexOf('--verify');

const env = {
  ...process.env,
  BANK_TABLE: 'bank_transactions',
  BIZIMHESAP_PROFILE_DIR: PROFILE_DIR,
  BIZIMHESAP_HEADLESS: process.env.BIZIMHESAP_HEADLESS || 'true',
};

let script, scriptArgs;
if (verifyIdx >= 0) {
  script = 'tools/verify_bank_post_v112.cjs';
  scriptArgs = ['--search', args[verifyIdx + 1] || 'APERION AUTO'];
} else {
  script = 'bizimhesap_banka_bot.cjs';
  scriptArgs = args.length ? args : ['--dry-out', 'local-secrets/banka_local_dryrun.json'];
  if (args.includes('--commit')) env.BIZIMHESAP_POSTING_LIVE = '1';
}

console.log(`[calistiriliyor] node ${script} ${scriptArgs.join(' ')} (profil: ${PROFILE_DIR})`);
const result = spawnSync(process.execPath, [script, ...scriptArgs], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env,
});
process.exitCode = result.status || 0;
