const fs = require('fs');
const path = require('path');

const root = process.cwd();
const sqlPath = path.join(root, 'finance', 'AperiON_Free_Gmail_Drive_Intake_SQL_v57.sql');
const scriptPath = path.join(root, 'automation', 'google_apps_script_gmail_to_drive_v57.js');
const docs = [
  path.join(root, 'docs', 'APERION_FREE_AUTOMATION_SETUP_v57.md'),
  path.join(root, 'docs', 'APERION_DRIVE_STRUCTURE_v57.md')
];

function fail(message) {
  console.error('❌ ' + message);
  process.exitCode = 1;
}

function pass(message) {
  console.log('✅ ' + message);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail('Dosya yok: ' + path.relative(root, file));
    return '';
  }
  pass('Dosya bulundu: ' + path.relative(root, file));
  return fs.readFileSync(file, 'utf8');
}

const sql = read(sqlPath);
const script = read(scriptPath);
const docText = docs.map(read).join('\n');

const sqlTokens = [
  'bank_statement_files_v57',
  'bank_statement_file_events_v57',
  'bank_statement_file_register_v57',
  'bank_statement_files_inbox_v57_view',
  'free_automation_health_v57_view',
  'parse_status',
  'duplicate',
  'approval_waiting',
  'control_waiting'
];

for (const token of sqlTokens) {
  if (!sql.includes(token)) fail('SQL içinde eksik token: ' + token);
  else pass('SQL token OK: ' + token);
}

const scriptTokens = [
  'alaylimedikal@gmail.com',
  'AperiON',
  '01 Banka Ekstreleri',
  '02 Moka POS',
  '03 Faturalar',
  '04 Gider Belgeleri',
  '05 BizimHesap Export',
  '06 Onay Bekleyen',
  '07 İşlenen Arşiv',
  '99 Hata Kontrol',
  'aperionEnsureStandardFolders',
  'aperionRunBankStatementIntake',
  'aperionInstallHourlyTrigger',
  'GmailApp.search',
  'DriveApp'
];

for (const token of scriptTokens) {
  if (!script.includes(token)) fail('Apps Script içinde eksik token: ' + token);
  else pass('Apps Script token OK: ' + token);
}

const docTokens = [
  'Tamamen Ücretsiz Otomasyon Kurulumu',
  'Google Drive Klasör Standardı',
  'alaylimedikal@gmail.com',
  'AperiON/01 Banka Ekstreleri/{YIL}/{AY}',
  'BizimHesap’a kayıt göndermez',
  'Onay Merkezi'
];

for (const token of docTokens) {
  if (!docText.includes(token)) fail('Dokümanlarda eksik token: ' + token);
  else pass('Doküman token OK: ' + token);
}

const forbidden = [
  'make.com',
  'n8n cloud',
  'otomatik kesin finans kaydı',
  'BizimHesap kesin kayıt gönder'
];

for (const token of forbidden) {
  const haystack = `${sql}\n${script}\n${docText}`.toLowerCase();
  if (haystack.includes(token.toLowerCase())) fail('Riskli/istenmeyen içerik bulundu: ' + token);
}

if (process.exitCode) {
  console.error('');
  console.error('❌ v57 ücretsiz Gmail/Drive intake verify başarısız.');
  process.exit(process.exitCode);
}

console.log('');
console.log('✅ v57 ücretsiz Gmail/Drive intake verify başarılı.');
