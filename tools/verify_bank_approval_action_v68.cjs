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
  ['duplicate guard blocks approval', /if\(dupCount>1\)return\s*\{ready:false/.test(index)],
  ['low confidence guard blocks approval', /if\(p\.confidence<70\)return\s*\{ready:false/.test(index)],
  ['queue/final state guard exists', /function\s+bankQueueIsFinal\s*\(/.test(index)],
  ['posting proof is visible', index.includes('bank-posting-proof')],
  ['morning cards use action state', /const st=bankActionState\(r,1\)/.test(index)],
  ['ready action reason is visible', /return\s*\{ready:true,label,reason:`[^`]*\$\{p\.type\}/.test(index)],
  ['invalid bank counterparty guard exists', /function\s+bankCariIsInvalid\s*\(/.test(index)],
  ['bank technical fields are not accepted as cari', index.includes('YATIRILAN TUTAR') && index.includes('KART NO') && index.includes('ATM NO')],
  ['assistant notification titles are not accepted as cari', index.includes('AKILLI ASISTAN') && index.includes('ANLIK ODEME BILGILENDIRMESI')],
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
