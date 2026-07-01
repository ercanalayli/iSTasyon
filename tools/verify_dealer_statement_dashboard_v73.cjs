const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const checks = [
  ['dealer statement query', html.includes(".eq('source_table','dealer_statement')")],
  ['future receivable card label', html.includes('Gelecek Tahsilat Bütçesi')],
  ['finance calendar items source', html.includes("db.from('finance_calendar_items')")],
  ['future receivable totals', html.includes('dealerTotal') && html.includes('dealerMonths')],
  ['safe empty text', html.includes('DealerStatement raporu Finans Takvimi tablosuna alınmadı')],
  ['finance amount includes expected amount', html.includes('row.expected_amount') && html.includes('row.remaining_amount')],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FAIL'} ${name}`);
}

if (failed.length) {
  console.error(`RESULT: FAILED - ${failed.length} DealerStatement dashboard kontrolu eksik.`);
  process.exit(1);
}

console.log('RESULT: OK - DealerStatement gelecek tahsilat butcesi ana finans paneline bagli gorunuyor.');
