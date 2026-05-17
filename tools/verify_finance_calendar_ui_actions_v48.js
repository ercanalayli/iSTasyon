const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const patchPath = path.join(root, 'tools', 'apply_finance_calendar_ui_actions_v48_patch.js');
const sqlPath = path.join(root, 'finance', 'AperiON_Finance_Calendar_Actions_SQL_v48.sql');

const html = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
const sql = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, 'utf8') : '';

const checks = [
  { name: 'v48 actions SQL exists', ok: fs.existsSync(sqlPath) },
  { name: 'mark paid RPC exists', ok: sql.includes('finance_calendar_mark_paid') },
  { name: 'mark collected RPC exists', ok: sql.includes('finance_calendar_mark_collected') },
  { name: 'postpone RPC exists', ok: sql.includes('finance_calendar_postpone') },
  { name: 'action log RPC exists', ok: sql.includes('finance_calendar_log_action') },
  { name: 'v48 UI patch script exists', ok: fs.existsSync(patchPath) },
  { name: 'index has financeCalDo function', ok: html.includes('function financeCalDo(action,id)') },
  { name: 'index has financeCalRpc function', ok: html.includes('function financeCalRpc(fnName,payload)') },
  { name: 'index has financeCalActionButtons function', ok: html.includes('function financeCalActionButtons(r)') },
  { name: 'index has action button css', ok: html.includes('.finance-cal-actions') },
  { name: 'index has action toast', ok: html.includes('id="financeCalToast"') },
  { name: 'index has mark paid call', ok: html.includes('finance_calendar_mark_paid') },
  { name: 'index has mark collected call', ok: html.includes('finance_calendar_mark_collected') },
  { name: 'index has postpone call', ok: html.includes('finance_calendar_postpone') },
  { name: 'index reloads drawer after action', ok: html.includes('await openFinanceCalendarDrawer()') }
];

console.log('AperiON Finance Calendar UI Actions Verify v48');
console.log('------------------------------------------------');
let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? 'OK ' : 'ERR'} - ${c.name}`);
  if (!c.ok) failed++;
}
console.log('------------------------------------------------');
if (failed) {
  console.log(`RESULT: FAILED - ${failed} kontrol eksik. Önce v46 + v47 + v48 UI patch çalıştırılmalı.`);
  process.exitCode = 1;
} else {
  console.log('RESULT: OK - Finans Takvimi UI v48 aksiyon butonları ve RPC bağlantıları görünüyor.');
}
