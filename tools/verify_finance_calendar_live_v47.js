const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const sqlPath = path.join(root, 'finance', 'AperiON_Finance_Calendar_Live_SQL_v47.sql');
const patchPath = path.join(root, 'tools', 'apply_finance_calendar_live_v47_patch.js');
const html = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
const sql = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, 'utf8') : '';

const checks = [
  { name: 'v47 SQL exists', ok: fs.existsSync(sqlPath) },
  { name: 'finance_calendar_items table exists in SQL', ok: sql.includes('create table if not exists finance_calendar_items') },
  { name: 'finance_calendar_drawer_view exists in SQL', ok: sql.includes('create or replace view finance_calendar_drawer_view') },
  { name: 'finance_calendar_summary_view exists in SQL', ok: sql.includes('create or replace view finance_calendar_summary_view') },
  { name: 'sales_flow_finance_mini_v47_view exists in SQL', ok: sql.includes('sales_flow_finance_mini_v47_view') },
  { name: 'v47 patch script exists', ok: fs.existsSync(patchPath) },
  { name: 'index drawer uses finance_calendar_drawer_view', ok: html.includes("finance_calendar_drawer_view") },
  { name: 'index drawer has today net KPI', ok: html.includes('Bugün Net') },
  { name: 'index has finance type translator', ok: html.includes('function financeTypeTR') },
  { name: 'index uses calendar_date', ok: html.includes('calendar_date') }
];

console.log('AperiON Finance Calendar Live Verify v47');
console.log('----------------------------------------');
let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? 'OK ' : 'ERR'} - ${c.name}`);
  if (!c.ok) failed++;
}
console.log('----------------------------------------');
if (failed) {
  console.log(`RESULT: FAILED - ${failed} kontrol eksik. Önce v46 patch, sonra v47 live patch çalıştırılmalı.`);
  process.exitCode = 1;
} else {
  console.log('RESULT: OK - Finans Takvimi v47 canlı veri modeli ve UI bağlantısı görünüyor.');
}
