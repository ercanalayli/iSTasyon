const { levelWeight, formatCriticalAlert } = require('./aperion_critical_risk_alert_v51.js');

const risks = [
  {
    company: 'ALAYLI',
    risk_type: 'cash',
    risk_level: 'critical',
    title: 'Nakit Akışı',
    message: 'Ay sonuna kadar ciddi nakit açığı riski var.',
    amount: 500000,
    risk_date: '2026-05-17'
  },
  {
    company: 'ALAYLI',
    risk_type: 'overdue_receivable',
    risk_level: 'high',
    title: 'Geciken Tahsilat',
    message: 'Geciken tahsilat yüksek.',
    amount: 250000,
    risk_date: '2026-05-17'
  },
  {
    company: 'ALAYLI',
    risk_type: 'price',
    risk_level: 'warning',
    title: 'Fiyat Riski',
    message: 'Satış fiyatı kontrol edilmeli.',
    amount: 520,
    ref_name: 'Coverdry Külot L'
  }
];

console.log('AperiON Critical Risk Alert v51 Test');
console.log('------------------------------------');

let failed = 0;

const highRows = risks.filter(r => levelWeight(r.risk_level) >= levelWeight('high'));
const warningRows = risks.filter(r => levelWeight(r.risk_level) >= levelWeight('warning'));
const criticalRows = risks.filter(r => levelWeight(r.risk_level) >= levelWeight('critical'));

const highText = formatCriticalAlert(highRows, 'ALAYLI', 'high');
const warningText = formatCriticalAlert(warningRows, 'ALAYLI', 'warning');
const criticalText = formatCriticalAlert(criticalRows, 'ALAYLI', 'critical');
const emptyText = formatCriticalAlert([], 'ALAYLI', 'high');

const checks = [
  { name: 'critical weight > high', ok: levelWeight('critical') > levelWeight('high') },
  { name: 'high weight > warning', ok: levelWeight('high') > levelWeight('warning') },
  { name: 'high threshold returns 2 rows', ok: highRows.length === 2 },
  { name: 'warning threshold returns 3 rows', ok: warningRows.length === 3 },
  { name: 'critical threshold returns 1 row', ok: criticalRows.length === 1 },
  { name: 'empty alert returns null', ok: emptyText === null },
  { name: 'alert title exists', ok: highText.includes('AperiON Kritik Risk Alarmı') },
  { name: 'alert includes company', ok: highText.includes('ALAYLI') },
  { name: 'alert includes critical count', ok: highText.includes('Kritik') },
  { name: 'alert includes high risk title', ok: highText.includes('Geciken Tahsilat') },
  { name: 'warning alert includes product ref', ok: warningText.includes('Coverdry Külot L') },
  { name: 'critical alert excludes high risk', ok: !criticalText.includes('Geciken Tahsilat') },
  { name: 'money format exists', ok: highText.includes('₺') || highText.includes('TRY') }
];

for(const c of checks){
  console.log(`${c.ok ? 'OK ' : 'ERR'} ${c.name}`);
  if(!c.ok) failed++;
}

console.log('------------------------------------');
console.log(highText);
console.log('------------------------------------');

if(failed){
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
}else{
  console.log('RESULT: OK - Critical risk alert v51 is ready.');
}
