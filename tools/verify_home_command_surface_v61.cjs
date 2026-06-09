const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const checks = [
  ['dashboard command surface block', /Home command surface v61/.test(html)],
  ['dashboard dark professional shell', /#pg-dashboard\{[\s\S]*linear-gradient\(145deg,#101113/.test(html)],
  ['legacy grid rules neutralized', /#pg-dashboard #kartsDiv>\*\{[\s\S]*grid-column:1\/-1 !important/.test(html)],
  ['income module first and prominent', /#pg-dashboard \.income-card\{[\s\S]*box-shadow:0 28px 70px/.test(html)],
  ['decision KPI grid has seven columns', /#pg-dashboard \.income-card \.report-grid\{[\s\S]*repeat\(7,minmax\(0,1fr\)\)/.test(html)],
  ['rounded operational controls', /#pg-dashboard \.income-btn\{[\s\S]*border-radius:999px/.test(html)],
  ['dark table header contrast', /#pg-dashboard \.income-row\.head\{[\s\S]*background:#171817/.test(html)],
  ['chart cards dark operational style', /#pg-dashboard \.income-chart-card\{[\s\S]*background:#171817/.test(html)],
  ['report hub grid preserved separately', /#pg-dashboard \.report-hub \.report-grid\{[\s\S]*background:#F7F8F4/.test(html)],
  ['responsive tablet fallback', /@media\(max-width:1320px\)[\s\S]*#pg-dashboard \.income-card \.report-grid/.test(html)],
  ['responsive mobile fallback', /@media\(max-width:980px\)[\s\S]*#pg-dashboard \.income-title/.test(html)]
];

console.log('AperiON Home Command Surface v61 Verify');
console.log('---------------------------------------');
let ok = true;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'OK ' : 'ERR'} - ${label}`);
  if (!pass) ok = false;
}
console.log('---------------------------------------');
if (!ok) {
  console.error('RESULT: FAIL - Ana ekran profesyonel komuta yuzeyi eksik.');
  process.exit(1);
}
console.log('RESULT: OK - Ana ekran profesyonel komuta yuzeyi kilitlendi.');
