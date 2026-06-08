const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const incomePos = html.indexOf('id="incomeStatementCard"');
const reportPos = html.indexOf('class="card report-hub"');

const checks = [
  ['home income module before report hub', incomePos > 0 && reportPos > 0 && incomePos < reportPos],
  ['seven period buttons', ['Bugün','Dün','Bu Hafta','Bu Ay','Geçen Ay','Bu Yıl','Geçen Yıl'].every(x => html.includes(x))],
  ['three decision nets', html.includes('Planlanan Net') && html.includes('Tahakkuk Net') && html.includes('Gerçekleşen Net')],
  ['planned/accrual/cash wording', html.includes('Planlanan') && html.includes('Tahakkuk Esası') && html.includes('Gerçekleşen')],
  ['income lines', html.includes('Sözleşmeli gelirler') && html.includes('Sabit gelirler') && html.includes('Satış gelirleri') && html.includes('Banka tahsilatları')],
  ['expense lines', html.includes('Sözleşmeli giderler') && html.includes('Sabit giderler') && html.includes('Banka giderleri') && html.includes('Kredi kartı giderleri') && html.includes('Vergi / SGK')],
  ['cash gaps', html.includes('Tahsil Edilecek') && html.includes('Ödenecek') && html.includes('Nakit Farkı') && html.includes('Tahakkuk Farkı')],
  ['approved bank feed', html.includes("pending_bank_movements") && html.includes(".eq('status','approved')")],
  ['cash bucket model', html.includes('function incomeCashBuckets') && html.includes('incomeExpenseAccrualBuckets')],
];

let failed = 0;
console.log('AperiON Home Income Decision v60 Verify');
console.log('---------------------------------------');
for (const [name, ok] of checks) {
  console.log(`${ok ? 'OK ' : 'ERR'} - ${name}`);
  if (!ok) failed += 1;
}
console.log('---------------------------------------');
if (failed) {
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
} else {
  console.log('RESULT: OK - Ana sayfa gelir tablosu karar paneli bağlı.');
}
