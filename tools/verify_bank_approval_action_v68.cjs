const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const checks = [
  ['bankActionState helper exists', /function\s+bankActionState\s*\(/.test(index)],
  ['bankActionCell helper exists', /function\s+bankActionCell\s*\(/.test(index)],
  ['action cell is rendered in bank rows', /bankActionCell\(r,dupCount\)/.test(index)],
  ['ambiguous cari guard exists', /function\s+bankCariIsAmbiguous\s*\(/.test(index)],
  ['duplicate guard blocks approval', index.includes('Mükerrer kontrol') || index.includes('MÃ¼kerrer kontrol')],
  ['low confidence guard blocks approval', index.includes('Güven düşük') || index.includes('GÃ¼ven dÃ¼ÅŸÃ¼k')],
  ['queue/final state guard exists', /function\s+bankQueueIsFinal\s*\(/.test(index)],
  ['posting proof is visible', index.includes('bank-posting-proof')],
  ['morning cards use action state', /const st=bankActionState\(r,1\)/.test(index)],
  ['ready action reason is visible', index.includes('Hazır: ${p.type}') || index.includes('HazÄ±r: ${p.type}')],
  ['approval button is product-native', index.includes('AperiON’da Onayla')],
  ['queued worker state is visible', index.includes('Worker sırada')],
  ['secret-safe worker wording exists', index.includes('gizli oturumlu worker')],
  ['package script registered', pkg.scripts && pkg.scripts['verify:bank-approval-action'] === 'node tools/verify_bank_approval_action_v68.cjs']
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
  console.error(`Bank approval action verification failed: ${failed} check(s) failed.`);
  process.exit(1);
}

console.log('Bank approval action verification passed.');
