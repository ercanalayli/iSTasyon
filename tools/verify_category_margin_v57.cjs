const fs = require('fs');
const path = require('path');

const root = process.cwd();
const sqlPath = path.join(root, 'finance', 'AperiON_Category_Margin_SQL_v57.sql');
const docPath = path.join(root, 'docs', 'APERION_V57_KARLILIK_HESAPLAMA_KURALI.md');

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

const sql = read(sqlPath);
const doc = read(docPath);

[
  'product_category_margin_rules_v57',
  'aperion_real_categories_v57_view',
  'aperion_category_margin_status_v57_view',
  'upsert_category_margin_rule_v57',
  'aperion_missing_category_margins_v57_view',
  'margin_missing',
  'approval_needed',
  'user_approved',
  'sales_raw'
].forEach(token => {
  if (!sql.includes(token)) fail('missing SQL token: ' + token);
  else ok('SQL token: ' + token);
});

[
  'Kategoriler asla asistan tarafından tahmin edilmeyecek',
  'Önce gerçek kategori listesi çıkarılır',
  'Gerçek maliyet varsa',
  'Marjı Eksik Kategoriler',
  'Kategori ortalama marjı eksik'
].forEach(token => {
  if (!doc.includes(token)) fail('missing doc token: ' + token);
  else ok('doc token: ' + token);
});

[
  'hasta bezi',
  'havalı yatak',
  'tekerlekli sandalye',
  'kolostomi',
  'sonda',
  'kulak işitme cihazı'
].forEach(token => {
  if (doc.toLowerCase().includes(token)) fail('hardcoded example category remains in doc: ' + token);
});

if (process.exitCode) {
  console.error('');
  console.error('FAIL v57 category margin verify failed.');
  process.exit(process.exitCode);
}

console.log('');
console.log('OK v57 category margin verify successful.');
