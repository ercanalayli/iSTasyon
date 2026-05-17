import fs from 'fs';

const checks = [];
let failed = 0;

function read(path){
  if(!fs.existsSync(path)){
    return '';
  }
  return fs.readFileSync(path, 'utf8');
}

function check(name, ok){
  checks.push({ name, ok });
  console.log(`${ok ? 'OK ' : 'ERR'} ${name}`);
  if(!ok) failed++;
}

const sqlPath = 'finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql';
const healthPath = 'finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql';
const botPath = 'telegram/aperion_critical_risk_alert_v52.js';
const testPath = 'telegram/aperion_critical_risk_alert_v52_test_runner.js';
const pkgPath = 'package.json';

const sql = read(sqlPath);
const health = read(healthPath);
const bot = read(botPath);
const test = read(testPath);
const pkg = read(pkgPath);

console.log('AperiON Risk Alert Dedup v52 Verify');
console.log('-----------------------------------');

check('SQL file exists', Boolean(sql));
check('Health check SQL file exists', Boolean(health));
check('Telegram v52 file exists', Boolean(bot));
check('Telegram v52 test runner exists', Boolean(test));
check('package.json exists', Boolean(pkg));

check('SQL creates risk_alert_sent_log', sql.includes('create table if not exists risk_alert_sent_log'));
check('SQL has risk_key column', sql.includes('risk_key text not null'));
check('SQL has cooldown_until column', sql.includes('cooldown_until'));
check('SQL has can send RPC', sql.includes('risk_alert_can_send_v52'));
check('SQL has mark sent RPC', sql.includes('risk_alert_mark_sent_v52'));
check('SQL has status view', sql.includes('aperion_risk_alert_dedup_status_v52_view'));

check('Health check validates risk_alert_sent_log', health.includes('risk_alert_sent_log table'));
check('Health check validates status view', health.includes('aperion_risk_alert_dedup_status_v52_view view'));
check('Health check validates can send RPC', health.includes('risk_alert_can_send_v52'));
check('Health check validates mark sent RPC', health.includes('risk_alert_mark_sent_v52'));
check('Health check has readonly function check', health.includes('can_send_readonly_check'));
check('Health check optional write test is commented', health.includes('-- select risk_alert_mark_sent_v52'));

check('Bot has RISK_ALERT_COOLDOWN_MINUTES env', bot.includes('RISK_ALERT_COOLDOWN_MINUTES'));
check('Bot builds deterministic risk key', bot.includes('function buildRiskKey'));
check('Bot calls risk_alert_can_send_v52', bot.includes('risk_alert_can_send_v52'));
check('Bot calls risk_alert_mark_sent_v52', bot.includes('risk_alert_mark_sent_v52'));
check('Bot filters rows for cooldown', bot.includes('filterRowsForCooldown'));
check('Bot marks rows sent only after Telegram send', bot.indexOf('telegramSend(text)') < bot.indexOf('markRowsSent(sendable'));
check('Bot keeps v49 risk feed source', bot.includes('aperion_risk_feed_v49_view'));
check('Bot no-new-risk message exists', bot.includes('no new risk alert to send'));

check('Test imports v52 module', test.includes('aperion_critical_risk_alert_v52.js'));
check('Test covers cooldown skip', test.includes('cooldown filter skips 1 row'));
check('Test covers mark sent', test.includes('mark sent returns id list'));

check('package has telegram:critical-risk-v52', pkg.includes('telegram:critical-risk-v52'));
check('package has telegram:critical-risk-v52:test', pkg.includes('telegram:critical-risk-v52:test'));
check('package has verify:risk-alert-dedup-v52', pkg.includes('verify:risk-alert-dedup-v52'));

console.log('-----------------------------------');
if(failed){
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
}else{
  console.log('RESULT: OK - Risk alert dedup v52 verification passed.');
}
