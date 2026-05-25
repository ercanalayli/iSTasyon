const { levelWeight, makeRiskKey, formatCriticalAlert } = require('./aperion_critical_risk_alert_v52.js');

const risks = [
  {
    company: 'ALAYLI',
    risk_type: 'cash',
    risk_level: 'critical',
    title: 'Nakit Akışı',
    message: 'Ay sonuna kadar ciddi nakit açığı riski var.',
    amount: 500000,
    risk_date: '2026-05-25'
  },
  {
    company: 'ALAYLI',
    risk_type: 'overdue_receivable',
    risk_level: 'high',
    title: 'Geciken Tahsilat',
    message: 'Geciken tahsilat yüksek.',
    amount: 250000,
    risk_date: '2026-05-25'
  },
  {
    company: 'ALAYLI',
    risk_type: 'price',
    risk_level: 'warning',
    title: 'Fiyat Riski',
    message: 'Satış fiyatı kontrol edilmeli.',
    amount: 520,
    ref_name: 'Coverdry Külot L',
    risk_date: '2026-05-25'
  }
];

console.log('AperiON Critical Risk Alert v52 Dedup Test');
console.log('------------------------------------------');

let failed = 0;

const key1 = makeRiskKey(risks[0]);
const key2 = makeRiskKey({ ...risks[0], title: 'Nakit Akışı' });
const keyChangedDate = makeRiskKey({ ...risks[0], risk_date: '2026-05-26' });
const highRows = risks.filter(r => levelWeight(r.risk_level) >= levelWeight('high'));
const text = formatCriticalAlert(highRows.map(r => ({...r, risk_key: makeRiskKey(r)})), 'ALAYLI', 'high', 1);
const emptyText = formatCriticalAlert([], 'ALAYLI', 'high', 2);

const checks = [
  { name: 'critical weight > high', ok: levelWeight('critical') > levelWeight('high') },
  { name: 'high weight > warning', ok: levelWeight('high') > levelWeight('warning') },
  { name: 'risk key stable for same row', ok: key1 === key2 },
  { name: 'risk key changes by risk_date', ok: key1 !== keyChangedDate },
  { name: 'risk key includes company', ok: key1.includes('alayli') },
  { name: 'high threshold returns 2 rows', ok: highRows.length === 2 },
  { name: 'empty alert returns null', ok: emptyText === null },
  { name: 'alert title exists', ok: text.includes('AperiON Kritik Risk Alarmı') },
  { name: 'dedup skipped count shown', ok: text.includes('Tekrar alarm engeli') && text.includes('1') },
  { name: 'alert includes no K/M number shortening', ok: !text.includes('500K') && !text.includes('0.5M') },
  { name: 'alert includes risk title', ok: text.includes('Geciken Tahsilat') },
  { name: 'money format exists', ok: text.includes('₺') || text.includes('TRY') }
];

for(const c of checks){
  console.log(`${c.ok ? 'OK ' : 'ERR'} ${c.name}`);
  if(!c.ok) failed++;
}

console.log('------------------------------------------');
console.log(text);
console.log('------------------------------------------');

if(failed){
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
}else{
  console.log('RESULT: OK - Critical risk alert v52 dedup is ready.');
}
