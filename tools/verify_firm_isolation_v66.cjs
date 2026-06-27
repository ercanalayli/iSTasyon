const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const checks = [
  {
    name: 'pilot firma sabit',
    ok: /const PILOT_FIRMA='alayli'/.test(index),
  },
  {
    name: 'görünen firmalar sadece pilot',
    ok: /const VISIBLE_FIRMS=\[PILOT_FIRMA\]/.test(index),
  },
  {
    name: 'ana satış yükleme firma filtreli',
    ok: /db\.from\('sales_raw'\)\.select\('\*'\)\.eq\('firma_id',PILOT_FIRMA\)/.test(index),
  },
  {
    name: 'satış satırı firma sızıntısı engeli',
    ok: /function isAlayliRow\(r\)[\s\S]*r\.firma_id!==PILOT_FIRMA/.test(index),
  },
  {
    name: 'mail banka hareketleri firma filtreli',
    ok: /db\.from\('pending_bank_movements'\)\.select\('\*'\)\.eq\('company_id',PILOT_FIRMA\)/.test(index),
  },
  {
    name: 'executive BizimHesap queue firma filtreli',
    ok: /db\.from\('bizimhesap_queue'\)\.select\('\*'\)\.eq\('company_id',PILOT_FIRMA\)\.order\('created_at',\{ascending:false\}\)\.limit\(500\)/.test(index),
  },
  {
    name: 'finans home BizimHesap queue firma filtreli',
    ok: /db\.from\('bizimhesap_queue'\)\.select\('\*'\)\.eq\('company_id',PILOT_FIRMA\)\.order\('created_at',\{ascending:false\}\)\.limit\(8\)/.test(index),
  },
  {
    name: 'legacy bank_transactions firma filtreli',
    ok: /db\.from\('bank_transactions'\)\.select\('\*'\)\.eq\('firma_id',PILOT_FIRMA\)/.test(index),
  },
  {
    name: 'banka_raw firma filtreli',
    ok: /db\.from\('banka_raw'\)\.select\('\*'\)\.eq\('firma_id',PILOT_FIRMA\)/.test(index),
  },
  {
    name: 'bot logları firma filtreli',
    ok: /db\.from\('bot_logs'\)\.select\('\*'\)\.eq\('firma_id',PILOT_FIRMA\)/.test(index),
  },
  {
    name: 'başka firmalar kapalı',
    ok: /let SHOW_OTHER_FIRMS=false/.test(index),
  },
];

let failed = 0;
console.log('AperiON Firma Izolasyonu v66 Verify');
console.log('-----------------------------------');
for (const check of checks) {
  console.log(`${check.ok ? 'OK ' : 'MISS'} - ${check.name}`);
  if (!check.ok) failed += 1;
}
console.log('-----------------------------------');
if (failed) {
  console.log(`RESULT: FAILED - ${failed} firma izolasyonu kontrolu eksik.`);
  process.exitCode = 1;
} else {
  console.log('RESULT: OK - ALAYLI karar ekranlari firma filtreli.');
}
