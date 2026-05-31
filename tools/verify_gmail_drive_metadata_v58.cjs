const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appsScriptPath = path.join(root, 'automation', 'google_apps_script_gmail_to_drive_metadata_v58.js');
const sqlPath = path.join(root, 'finance', 'AperiON_Document_Metadata_SQL_v58.sql');

function fail(message) {
  console.error('FAIL ' + message);
  process.exitCode = 1;
}

function ok(message) {
  console.log('OK ' + message);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail('missing file: ' + path.relative(root, file));
    return '';
  }
  ok('file exists: ' + path.relative(root, file));
  return fs.readFileSync(file, 'utf8');
}

const apps = read(appsScriptPath);
const sql = read(sqlPath);

[
  'APERION_SUPABASE_URL',
  'APERION_SUPABASE_SERVICE_ROLE_KEY',
  'APERION_DRIVE_ROOT_FOLDER_ID',
  'APERION_GMAIL_QUERY',
  'APERION_PROCESSED',
  'APERION_ERROR',
  'aperionProcessGmailToDriveV58',
  'aperionInstallGmailTriggerV58',
  'create_document_metadata_v58',
  'AperiON Gelen Belgeler',
  'to:alaylimedikal@gmail.com has:attachment',
  'DriveApp.getFolderById',
  'GmailApp.search',
  'UrlFetchApp.fetch'
].forEach(token => {
  if (!apps.includes(token)) fail('missing Apps Script token: ' + token);
  else ok('Apps Script token: ' + token);
});

[
  'aperion_document_metadata_v58',
  'create_document_metadata_v58',
  'aperion_document_inbox_v58_view',
  'aperion_unlinked_documents_v58_view',
  "'gmail'",
  "'finance'",
  "'life'"
].forEach(token => {
  if (!sql.includes(token)) fail('missing SQL token: ' + token);
  else ok('SQL token: ' + token);
});

if (apps.includes('SUPABASE_SERVICE_ROLE_KEY =') || apps.includes('TELEGRAM_BOT_TOKEN =')) {
  fail('possible hardcoded secret assignment detected');
}

if (process.exitCode) {
  console.error('');
  console.error('FAIL v58 Gmail Drive metadata verify failed.');
  process.exit(process.exitCode);
}

console.log('');
console.log('OK v58 Gmail Drive metadata verify successful.');
