const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

const checks = [
  {
    name: 'Sales flow has Bugün button first',
    ok: html.includes('data-period="today"') && html.includes("sM('today',this,1)")
  },
  {
    name: 'Sales page defaults to today',
    ok: html.includes("cM='today';setSalesPeriodButton('today');refresh().then(()=>rU())")
  },
  {
    name: 'Sales flow has Finance Calendar action button',
    ok: html.includes('openFinanceCalendarDrawer()">Finans Takvimi</button>')
  },
  {
    name: 'Sidebar has Finance Calendar item',
    ok: html.includes('Finans Takvimi</span><span class="sb-sub">odenecek, tahsil, gorev')
  },
  {
    name: 'Finance Calendar floating button exists',
    ok: html.includes('finance-cal-float') && html.includes('💰 Finans Takvimi')
  },
  {
    name: 'Finance Calendar drawer exists',
    ok: html.includes('id="financeCalDrawer"') && html.includes('id="financeCalBody"')
  },
  {
    name: 'Finance Calendar loads quick control view',
    ok: html.includes("quick_control_center_view")
  },
  {
    name: 'Backup file rule exists in patch script',
    ok: fs.existsSync(path.join(root, 'tools', 'apply_sales_today_finance_calendar_patch_v46.js'))
  }
];

console.log('AperiON Sales Today + Finance Calendar Verify v46');
console.log('------------------------------------------------');
let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? 'OK ' : 'ERR'} - ${c.name}`);
  if (!c.ok) failed++;
}
console.log('------------------------------------------------');
if (failed) {
  console.log(`RESULT: FAILED - ${failed} kontrol eksik. Önce npm run patch:sales-today-finance-calendar çalıştırılmalı.`);
  process.exitCode = 1;
} else {
  console.log('RESULT: OK - Satış Bugün + Finans Takvimi entegrasyonu index.html içinde görünüyor.');
}
