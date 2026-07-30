if (process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '');
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
  'AlÄ±ÅŸ / SatÄ±ÅŸ',
  'Tahsilat / Ã‡Ä±kÄ±ÅŸ'
];

const stale = mustNotContain.filter((needle) => html.includes(needle));
if (stale.length) {
  console.error('Eski oran etiketi kaldÄ±:', stale.join(', '));
  process.exit(1);
}

console.log('OK: Ana finans akis matrisi v55 index.html icinde dogrulandi.');

