const { formatMorningDigest } = require('./aperion_morning_finance_digest_v50.js');

const sample = {
  finance: {
    today_receivable: 120000,
    today_payable: 85000,
    today_cash_net: 35000,
    week_receivable: 780000,
    week_payable: 650000,
    week_cash_net: 130000
  },
  riskSummary: {
    total_risk_count: 5,
    critical_count: 1,
    high_count: 2,
    warning_count: 2,
    financial_risk_amount: 750000
  },
  today: [
    { title: 'Bugün tahsil test', remaining_amount: 120000, calendar_date: '2026-05-17' },
    { title: 'Bugün ödeme test', remaining_amount: 85000, calendar_date: '2026-05-17' }
  ],
  overdue: [
    { title: 'Geciken tahsil test', remaining_amount: 250000, calendar_date: '2026-05-14' }
  ],
  risks: [
    { risk_level: 'critical', title: 'Nakit Akışı', message: 'Ay sonuna kadar ciddi nakit açığı riski var.', amount: 500000 },
    { risk_level: 'high', title: 'Geciken Tahsilat', message: 'Geciken tahsilat yüksek.', amount: 250000 }
  ]
};

console.log('AperiON Morning Finance Digest v50 Test');
console.log('---------------------------------------');

const text = formatMorningDigest(sample, 'ALAYLI');
let failed = 0;
const checks = [
  { name: 'includes digest title', ok: text.includes('AperiON Sabah Finans Özeti') },
  { name: 'includes company', ok: text.includes('ALAYLI') },
  { name: 'includes today section', ok: text.includes('<b>Bugün</b>') },
  { name: 'includes week section', ok: text.includes('<b>Bu Hafta</b>') },
  { name: 'includes risk section', ok: text.includes('<b>Risk</b>') },
  { name: 'includes today receivable', ok: text.includes('Tahsil') && (text.includes('₺120.000') || text.includes('TRY')) },
  { name: 'includes overdue item', ok: text.includes('Geciken tahsil test') },
  { name: 'includes risk item', ok: text.includes('Nakit Akışı') },
  { name: 'includes critical icon', ok: text.includes('🚨') },
  { name: 'is not empty', ok: text.length > 200 }
];

for(const c of checks){
  console.log(`${c.ok ? 'OK ' : 'ERR'} ${c.name}`);
  if(!c.ok) failed++;
}

console.log('---------------------------------------');
console.log(text);
console.log('---------------------------------------');

if(failed){
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
}else{
  console.log('RESULT: OK - Morning finance digest formatter is ready.');
}
