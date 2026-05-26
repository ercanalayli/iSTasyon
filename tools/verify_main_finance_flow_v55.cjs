const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const required = [
  'id="mainFinanceFlow"',
  'Ana Finans Akış Matrisi',
  'async function renderMainFinanceFlow()',
  'fetchFlowCalendarRows',
  'fetchFlowPurchaseRows',
  'Tahsilat / Satış',
  'Alış / Satış',
  'Tahsilat / Çıkış',
  'finance_calendar_drawer_view',
  'banka_gorsel_parser.js',
  'renderMainFinanceFlow();renderHomeSales()',
  'renderMainFinanceFlow();renderDataAudit()'
];

const missing = required.filter((needle) => !html.includes(needle));
if (missing.length) {
  console.error('Eksik kontrol:', missing.join(', '));
  process.exit(1);
}

console.log('OK: Ana finans akış matrisi v55 index.html içinde doğrulandı.');
