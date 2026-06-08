const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const liveSql = fs.readFileSync(path.join(root, 'finance', 'AperiON_Finance_Calendar_Live_SQL_v47.sql'), 'utf8');
const actionsSql = fs.readFileSync(path.join(root, 'finance', 'AperiON_Finance_Calendar_Actions_SQL_v48.sql'), 'utf8');
const fullSql = fs.readFileSync(path.join(root, 'finance', 'AperiON_Finance_Calendar_FULL_INSTALL_v58.sql'), 'utf8');

const checks = [
  ['UI plan tab', html.includes("fT('plan'") && html.includes('Plan Girişi')],
  ['UI business/personal scope', html.includes('planScope') && html.includes('Kişisel')],
  ['UI plan type fields', html.includes('planType') && html.includes('Sözleşmeli') && html.includes('Öngörülen')],
  ['UI date amount responsibility', html.includes('planStart') && html.includes('planEnd') && html.includes('planAmount') && html.includes('planResponsible')],
  ['UI save RPC call', html.includes("db.rpc('finance_calendar_create_plan'")],
  ['UI expense template cards', html.includes('PLAN_TEMPLATES') && html.includes('İşyeri Kirası') && html.includes('Kredi Kartı Ekstresi')],
  ['UI template apply function', html.includes('function applyPlanTemplate')],
  ['SQL scope column', liveSql.includes("scope text default 'business'")],
  ['SQL plan type column', liveSql.includes('plan_type text default')],
  ['SQL responsibility columns', liveSql.includes('responsible_person') && liveSql.includes('obligation_note')],
  ['SQL create plan RPC', actionsSql.includes('create or replace function finance_calendar_create_plan')],
  ['SQL execute grant', actionsSql.includes('grant execute on function finance_calendar_create_plan')],
  ['Full install regenerated', fullSql.includes('finance_calendar_create_plan') && fullSql.includes('counterparty_type')],
];

let failed = 0;
console.log('AperiON Finance Personal Plan v59 Verify');
console.log('----------------------------------------');
for (const [name, ok] of checks) {
  console.log(`${ok ? 'OK ' : 'ERR'} - ${name}`);
  if (!ok) failed += 1;
}
console.log('----------------------------------------');
if (failed) {
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
} else {
  console.log('RESULT: OK - İşletme/kisisel plan girişi, SQL modeli ve RPC bağlı.');
}
