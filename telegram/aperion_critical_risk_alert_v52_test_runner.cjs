const {
  levelWeight,
  makeRiskKey,
  formatCriticalAlert,
  filterUnsentByLocalLog
} = require('./aperion_critical_risk_alert_v52.cjs');

const now = new Date('2026-05-25T12:00:00Z');
const risks = [
  {
    company: 'ALAYLI',
    risk_type: 'cash',
    risk_level: 'critical',
    title: 'Nakit Akisi',
    message: 'Ay sonuna kadar ciddi nakit acigi riski var.',
    amount: 500000,
    risk_date: '2026-05-25'
  },
  {
    company: 'ALAYLI',
    risk_type: 'overdue_receivable',
    risk_level: 'high',
    title: 'Geciken Tahsilat',
    message: 'Geciken tahsilat yuksek.',
    amount: 250000,
    risk_date: '2026-05-25'
  }
].map(r => ({ ...r, risk_key: makeRiskKey(r, 'ALAYLI') }));

const sentMap = {
  [risks[0].risk_key]: '2026-05-25T06:00:00Z',
  [risks[1].risk_key]: '2026-05-23T06:00:00Z'
};

const sendable = filterUnsentByLocalLog(risks, sentMap, 24, now);
const text = formatCriticalAlert(sendable, 'ALAYLI', 'high');

const checks = [
  { name: 'critical weight > high', ok: levelWeight('critical') > levelWeight('high') },
  { name: 'risk key is stable', ok: makeRiskKey(risks[0], 'ALAYLI') === risks[0].risk_key },
  { name: 'cooldown suppresses recent risk', ok: !sendable.some(r => r.risk_type === 'cash') },
  { name: 'expired cooldown allows older risk', ok: sendable.some(r => r.risk_type === 'overdue_receivable') },
  { name: 'alert text exists', ok: text && text.includes('AperiON Kritik Risk Alarmi') },
  { name: 'alert includes allowed risk', ok: text && text.includes('Geciken Tahsilat') },
  { name: 'alert excludes suppressed risk', ok: text && !text.includes('Nakit Akisi') }
];

console.log('AperiON Critical Risk Alert v52 Test');
console.log('-----------------------------------');
let failed = 0;
for(const c of checks){
  console.log(`${c.ok ? 'OK ' : 'ERR'} ${c.name}`);
  if(!c.ok) failed++;
}
console.log('-----------------------------------');
console.log(text || 'NO ALERT');
console.log('-----------------------------------');

if(failed){
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
}else{
  console.log('RESULT: OK - Critical risk alert dedup v52 is ready.');
}
