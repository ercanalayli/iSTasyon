const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sqlPath = path.join(root, 'finance', 'AperiON_Risk_Alert_Dedup_SQL_v52.sql');
const botPath = path.join(root, 'telegram', 'aperion_critical_risk_alert_v52.cjs');

const sql = fs.readFileSync(sqlPath, 'utf8');
const bot = fs.readFileSync(botPath, 'utf8');

const checks = [
  { name: 'risk_alert_sent_log table', ok: /create table if not exists public\.risk_alert_sent_log/i.test(sql) },
  { name: 'risk_key unique index', ok: /risk_alert_sent_log_company_key_uidx/i.test(sql) },
  { name: 'make key function', ok: /risk_alert_make_key/i.test(sql) },
  { name: 'is sendable rpc', ok: /risk_alert_is_sendable/i.test(sql) },
  { name: 'mark sent rpc', ok: /risk_alert_mark_sent/i.test(sql) },
  { name: 'recent view', ok: /risk_alert_sent_log_recent_v52_view/i.test(sql) },
  { name: 'bot uses sendable rpc', ok: bot.includes('risk_alert_is_sendable') },
  { name: 'bot marks sent after telegram', ok: bot.includes('risk_alert_mark_sent') },
  { name: 'bot has cooldown env', ok: bot.includes('RISK_ALERT_COOLDOWN_HOURS') },
  { name: 'bot creates stable risk key', ok: bot.includes('makeRiskKey') }
];

let failed = 0;
console.log('AperiON v52 Risk Alert Dedup Verify');
console.log('-----------------------------------');
for(const c of checks){
  console.log(`${c.ok ? 'OK ' : 'ERR'} ${c.name}`);
  if(!c.ok) failed++;
}
console.log('-----------------------------------');
if(failed){
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
}else{
  console.log('RESULT: OK - v52 dedup files verified.');
}
