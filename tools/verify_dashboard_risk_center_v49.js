const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const patchPath = path.join(root, 'tools', 'apply_dashboard_risk_center_v49_patch.js');
const sqlPath = path.join(root, 'finance', 'AperiON_Finance_Risk_Engine_SQL_v49.sql');
const formatterPath = path.join(root, 'telegram', 'aperion_risk_formatter_v49.js');

const html = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
const sql = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, 'utf8') : '';

const checks = [
  { name: 'risk SQL exists', ok: fs.existsSync(sqlPath) },
  { name: 'risk feed view exists', ok: sql.includes('aperion_risk_feed_v49_view') },
  { name: 'risk summary view exists', ok: sql.includes('aperion_risk_summary_v49_view') },
  { name: 'risk formatter exists', ok: fs.existsSync(formatterPath) },
  { name: 'dashboard risk patch exists', ok: fs.existsSync(patchPath) },
  { name: 'index has risk center CSS', ok: html.includes('.risk-center') },
  { name: 'index has dashboardRiskCenter', ok: html.includes('dashboardRiskCenter') },
  { name: 'index has financeDrawerRiskCenter', ok: html.includes('financeDrawerRiskCenter') },
  { name: 'index has loadRiskCenter', ok: html.includes('function loadRiskCenter') },
  { name: 'index has renderRiskCenter', ok: html.includes('function renderRiskCenter') },
  { name: 'index has refreshRiskCenters', ok: html.includes('function refreshRiskCenters') },
  { name: 'index reads risk summary view', ok: html.includes('aperion_risk_summary_v49_view') },
  { name: 'index reads risk feed view', ok: html.includes('aperion_risk_feed_v49_view') },
  { name: 'drawer refreshes risk center', ok: html.includes('await refreshRiskCenters()') || html.includes('refreshRiskCenters()') }
];

console.log('AperiON Dashboard Risk Center Verify v49');
console.log('----------------------------------------');
let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? 'OK ' : 'ERR'} - ${c.name}`);
  if (!c.ok) failed++;
}
console.log('----------------------------------------');
if (failed) {
  console.log(`RESULT: FAILED - ${failed} kontrol eksik. Önce npm run patch:dashboard-risk-center-v49 çalıştırılmalı.`);
  process.exitCode = 1;
} else {
  console.log('RESULT: OK - Dashboard/Drawer Risk Merkezi v49 index.html içinde görünüyor.');
}
