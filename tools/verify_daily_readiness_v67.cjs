if (process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const packagePath = path.join(root, 'package.json');

const index = fs.readFileSync(indexPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const checks = [
  ['dailyReadinessHtml helper exists', /function\s+dailyReadinessHtml\s*\(/.test(index)],
  ['moduleReadinessRows helper exists', /function\s+moduleReadinessRows\s*\(/.test(index)],
  ['daily readiness score exists', /function\s+dailyReadinessScore\s*\(/.test(index)],
  ['daily readiness rendered inside data audit', /dailyReadinessHtml\(a\)/.test(index)],
  ['readiness title visible', index.includes('GÃ¼nlÃ¼k KullanÄ±m Durumu')],
  ['blocker list mentions BizimHesap proof', index.includes('CanlÄ± BizimHesap kayÄ±t sonucunu')],
  ['Telegram is explicitly marked as blocked', /name:'Telegram Evrak',level:'blocked'/.test(index)],
  ['sales readiness depends on audit result', index.includes('salesReady=proofOk')],
  ['package script registered', pkg.scripts && pkg.scripts['verify:daily-readiness'] === 'node tools/verify_daily_readiness_v67.cjs']
];

let failed = 0;
for (const [name, ok] of checks) {
  if (ok) {
    console.log(`OK  ${name}`);
  } else {
    failed += 1;
    console.error(`ERR ${name}`);
  }
}

if (failed) {
  console.error(`Daily readiness verification failed: ${failed} check(s) failed.`);
  process.exit(1);
}

console.log('Daily readiness verification passed.');

