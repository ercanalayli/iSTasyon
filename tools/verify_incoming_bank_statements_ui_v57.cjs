const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pagePath = path.join(root, 'gelen-ekstreler-v57.html');

function fail(message) {
  console.error('❌ ' + message);
  process.exitCode = 1;
}

function pass(message) {
  console.log('✅ ' + message);
}

if (!fs.existsSync(pagePath)) {
  fail('gelen-ekstreler-v57.html bulunamadı.');
  process.exit(1);
}

const html = fs.readFileSync(pagePath, 'utf8');

const required = [
  'Gelen Ekstreler Merkezi',
  'Gmail → Google Drive',
  'bank_statement_files_inbox_v57_view',
  'free_automation_health_v57_view',
  'gelen-ekstreler-v57.html',
  'nakit-komuta-v57.html',
  'BizimHesap’a kayıt göndermez',
  'kesin finans kaydı oluşturmaz',
  'eksik veri',
  'Toplam Dosya',
  'Onay Bekleyen',
  'Parser bekliyor',
  'loadInbox',
  'DriveFileId'
];

for (const token of required) {
  if (!html.includes(token)) fail('Sayfada eksik token: ' + token);
  else pass('Sayfa token OK: ' + token);
}

const forbidden = [
  'otomatik kesin kayıt',
  'BizimHesap kesin kayıt',
  'make.com',
  'n8n cloud',
  'TL 1K',
  'TL 1M'
];

const lower = html.toLowerCase();
for (const token of forbidden) {
  if (lower.includes(token.toLowerCase())) fail('Riskli/istenmeyen içerik bulundu: ' + token);
}

if (process.exitCode) {
  console.error('');
  console.error('❌ v57 Gelen Ekstreler UI verify başarısız.');
  process.exit(process.exitCode);
}

console.log('');
console.log('✅ v57 Gelen Ekstreler UI verify başarılı.');
