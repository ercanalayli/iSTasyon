const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'index.html');
const patchPath = path.join(process.cwd(), 'tools', 'apply_cash_command_ui_v57_patch.cjs');

function fail(message) {
  console.error('❌ ' + message);
  process.exitCode = 1;
}

function pass(message) {
  console.log('✅ ' + message);
}

if (!fs.existsSync(indexPath)) {
  fail('index.html bulunamadı.');
  process.exit(1);
}

if (!fs.existsSync(patchPath)) {
  fail('Patch dosyası yok: tools/apply_cash_command_ui_v57_patch.cjs');
} else {
  pass('Patch dosyası bulundu.');
}

const html = fs.readFileSync(indexPath, 'utf8');

const required = [
  'APERION_CASH_COMMAND_CENTER_UI_V57',
  'id="pg-nakit"',
  'Nakit Komuta Merkezi',
  'cash57Kpis',
  'cash57Forecast',
  'cash57Side',
  'renderCashCommandCenter',
  'finance_cash_position_v57_view',
  'cash_forecast_v57_view',
  'cash_approval_waiting_v57_view',
  'moka_pos_expected_v57_view',
  'gP(\'nakit\'',
  'eksik veri',
  'onaysız kesin kayıt yok'
];

for (const token of required) {
  if (!html.includes(token)) fail('index.html içinde eksik: ' + token);
  else pass('index.html token OK: ' + token);
}

const forbidden = [
  '1K',
  '1M',
  'otomatik kesin kayıt',
  'git push',
  'deploy'
];

for (const token of forbidden) {
  if (html.includes(token)) fail('Riskli içerik bulundu: ' + token);
}

if (process.exitCode) {
  console.error('');
  console.error('❌ v57 Nakit Komuta Merkezi UI verify başarısız.');
  process.exit(process.exitCode);
}

console.log('');
console.log('✅ v57 Nakit Komuta Merkezi UI verify başarılı.');
