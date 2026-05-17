const { riskIcon, riskTR, formatRiskRows, formatRiskSummary } = require('./aperion_risk_formatter_v49.js');

const summary = {
  total_risk_count: 4,
  critical_count: 1,
  high_count: 2,
  warning_count: 1,
  financial_risk_amount: 750000
};

const rows = [
  {
    company: 'ALAYLI',
    risk_type: 'cash',
    risk_level: 'critical',
    title: 'Nakit Akışı',
    message: 'Ay sonuna kadar ciddi nakit açığı riski var.',
    amount: 500000,
    risk_date: '2026-05-16'
  },
  {
    company: 'ALAYLI',
    risk_type: 'overdue_receivable',
    risk_level: 'high',
    title: 'Geciken Tahsilat',
    message: 'Geciken tahsilat: 3 kayıt / 250000 TL',
    amount: 250000,
    risk_date: '2026-05-16'
  },
  {
    company: 'ALAYLI',
    risk_type: 'price',
    risk_level: 'warning',
    title: 'Fiyat Riski',
    message: 'Tedarikçi fiyatı belirgin artmış; satış fiyatı kontrol edilmeli.',
    amount: 520,
    ref_code: 'CD-K-L',
    ref_name: 'Coverdry Külot L'
  }
];

console.log('AperiON Risk Formatter v49 Test');
console.log('--------------------------------');

let failed = 0;
const formattedRows = formatRiskRows(rows, 'Risk Listesi');
const formattedSummary = formatRiskSummary(summary, rows);

const checks = [
  { name: 'critical icon', ok: riskIcon('critical') === '🚨' },
  { name: 'high icon', ok: riskIcon('high') === '🟠' },
  { name: 'warning icon', ok: riskIcon('warning') === '🟡' },
  { name: 'critical translation', ok: riskTR('critical') === 'Kritik' },
  { name: 'summary includes title', ok: formattedSummary.includes('AperiON Risk Özeti') },
  { name: 'summary includes total count', ok: formattedSummary.includes('Toplam: <b>4</b>') },
  { name: 'rows include cash risk', ok: formattedRows.includes('Nakit Akışı') },
  { name: 'rows include overdue risk', ok: formattedRows.includes('Geciken Tahsilat') },
  { name: 'rows include price ref', ok: formattedRows.includes('Coverdry Külot L') },
  { name: 'money format exists', ok: formattedSummary.includes('₺') || formattedSummary.includes('TRY') }
];

for (const c of checks) {
  console.log(`${c.ok ? 'OK ' : 'ERR'} ${c.name}`);
  if (!c.ok) failed++;
}

console.log('--------------------------------');
console.log(formattedSummary);
console.log('--------------------------------');

if (failed) {
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
} else {
  console.log('RESULT: OK - Risk formatter v49 is ready.');
}
