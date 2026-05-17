import {
  levelWeight,
  buildRiskKey,
  formatCriticalAlert,
  filterRowsForCooldown,
  markRowsSent
} from './aperion_critical_risk_alert_v52.js';

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
    ref_name: 'Coverdry Külot L',
    risk_date: '2026-05-17'
  }
];

console.log('AperiON Critical Risk Alert v52 Dedup Test');
console.log('------------------------------------------');

let failed = 0;
function check(name, ok){
  console.log(`${ok ? 'OK ' : 'ERR'} ${name}`);
  if(!ok) failed++;
}

const highRows = risks.filter(r => levelWeight(r.risk_level) >= levelWeight('high'));
const criticalRows = risks.filter(r => levelWeight(r.risk_level) >= levelWeight('critical'));
const key1 = buildRiskKey(risks[0]);
const key1Again = buildRiskKey({ ...risks[0] });
const key2 = buildRiskKey(risks[1]);

const mockRpc = async (fn, payload) => {
  if(fn === 'risk_alert_can_send_v52'){
    return payload.p_risk_key.includes('geciken tahsilat') ? false : true;
  }
  if(fn === 'risk_alert_mark_sent_v52'){
    return 1000 + Number(payload.p_risk_key.length || 0);
  }
  throw new Error('Unexpected RPC: ' + fn);
};

const { sendable, skipped } = await filterRowsForCooldown(highRows, 360, mockRpc);
const text = formatCriticalAlert(sendable, 'ALAYLI', 'high', skipped.length);
const emptyText = formatCriticalAlert([], 'ALAYLI', 'high', 2);
const markIds = await markRowsSent(sendable, { result: { message_id: 12345 } }, 360, mockRpc);

check('critical weight > high', levelWeight('critical') > levelWeight('high'));
check('high weight > warning', levelWeight('high') > levelWeight('warning'));
check('high threshold returns 2 rows', highRows.length === 2);
check('critical threshold returns 1 row', criticalRows.length === 1);
check('risk key is deterministic', key1 === key1Again);
check('different risks have different keys', key1 !== key2);
check('cooldown filter sends 1 row', sendable.length === 1);
check('cooldown filter skips 1 row', skipped.length === 1);
check('sendable row has risk_key', Boolean(sendable[0]?.risk_key));
check('skipped row has risk_key', Boolean(skipped[0]?.risk_key));
check('alert title exists', text.includes('AperiON Kritik Risk Alarmı'));
check('alert includes skipped count', text.includes('Tekrar engellenen'));
check('empty alert returns null', emptyText === null);
check('mark sent returns id list', Array.isArray(markIds) && markIds.length === sendable.length);
check('critical alert excludes skipped high risk', !text.includes('Geciken tahsilat yüksek'));

console.log('------------------------------------------');
console.log(text);
console.log('------------------------------------------');

if(failed){
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
}else{
  console.log('RESULT: OK - Critical risk alert dedup v52 is ready.');
}
