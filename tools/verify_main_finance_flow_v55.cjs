const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const required = [
  'id="mainFinanceFlow"',
  'Ana Finans Ak',
  'async function renderMainFinanceFlow()',
  'fetchFlowCalendarRows',
  'fetchFlowPurchaseRows',
  'Tahsilat / Sat',
  'Sat',
  ' / Al',
  'Tahsilat / ',
  'Gider',
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

const mustNotContain = [
  'Alış / Satış',
  'Tahsilat / Çıkış'
];

const stale = mustNotContain.filter((needle) => html.includes(needle));
if (stale.length) {
  console.error('Eski oran etiketi kaldı:', stale.join(', '));
  process.exit(1);
}

console.log('OK: Ana finans akis matrisi v55 index.html icinde dogrulandi.');
