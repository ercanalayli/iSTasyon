/* AperiON BizimHesap Import Preview CLI v40
   Usage:
   node bizimhesap_import_preview_cli_v40.js <type> <filePath> [company]
   type: sales | stock | sales_qty | expense
   Safe rule: preview only. No Supabase write, no BizimHesap write.
*/

const path = require('path');
const { readExportFile, summarizeRawRows } = require('./AperiON_BizimHesap_File_Reader_v40.js');
const { normalizeBizimHesapExport, validateNormalizedRows } = require('./AperiON_BizimHesap_Export_Normalizer_v40.js');

function money(n){
  return Number(n || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

function fail(message){
  console.error('ERROR: ' + message);
  process.exit(1);
}

const type = process.argv[2];
const fileArg = process.argv[3];
const company = process.argv[4] || 'ALAYLI';

if(!type) fail('type is required: sales | stock | sales_qty | expense');
if(!fileArg) fail('file path is required');

const allowed = ['sales','stock','sales_qty','expense'];
if(!allowed.includes(type)) fail('unsupported type: ' + type);

const filePath = path.resolve(process.cwd(), fileArg);
const rawRows = readExportFile(filePath);
const rawSummary = summarizeRawRows(rawRows);
const normalized = normalizeBizimHesapExport(rawRows, type, { company });
const errors = validateNormalizedRows(normalized, type);

console.log('AperiON BizimHesap Import Preview v40');
console.log('--------------------------------');
console.log('Type: ' + type);
console.log('File: ' + filePath);
console.log('Company: ' + company);
console.log('Raw rows: ' + rawSummary.row_count);
console.log('Columns: ' + rawSummary.columns.join(', '));
console.log('Normalized rows: ' + normalized.length);
console.log('Validation errors: ' + errors.length);

if(type === 'sales'){
  const totalSales = normalized.reduce((a, r) => a + Number(r.quantity || 0) * Number(r.unit_sale_price || 0), 0);
  const missingCost = normalized.filter(r => r.profit_status === 'cost_missing');
  console.log('Total sales amount: ' + money(totalSales));
  console.log('Missing cost rows: ' + missingCost.length);
}

if(type === 'stock'){
  const totalStock = normalized.reduce((a, r) => a + Number(r.stock_qty || 0), 0);
  console.log('Total stock qty: ' + totalStock.toLocaleString('tr-TR'));
}

if(type === 'sales_qty'){
  const totalQty = normalized.reduce((a, r) => a + Number(r.quantity || 0), 0);
  console.log('Total sales qty: ' + totalQty.toLocaleString('tr-TR'));
}

if(type === 'expense'){
  const totalExpense = normalized.reduce((a, r) => a + Number(r.amount || 0), 0);
  console.log('Total expense: ' + money(totalExpense));
}

console.log('--------------------------------');
console.log('First 5 normalized rows');
console.log(JSON.stringify(normalized.slice(0, 5), null, 2));

if(errors.length){
  console.log('--------------------------------');
  console.log('Validation error detail');
  console.log(JSON.stringify(errors, null, 2));
  console.log('RESULT: FAILED - fix file before import');
  process.exitCode = 1;
} else {
  console.log('RESULT: PREVIEW OK - ready for approval/import step');
  process.exitCode = 0;
}
