const path = require('path');
const { readExportFile, summarizeRawRows } = require('./AperiON_BizimHesap_File_Reader_v40.js');
const { normalizeBizimHesapExport, validateNormalizedRows } = require('./AperiON_BizimHesap_Export_Normalizer_v40.js');

const file = path.join(__dirname, 'test_exports', 'bizimhesap_sales_sample_v40.csv');
const rawRows = readExportFile(file);
const rawSummary = summarizeRawRows(rawRows);
const normalized = normalizeBizimHesapExport(rawRows, 'sales');
const errors = validateNormalizedRows(normalized, 'sales');
const missingCost = normalized.filter(r => r.profit_status === 'cost_missing');

console.log('AperiON File Reader Test v40');
console.log('--------------------------------');
console.log('Raw rows: ' + rawSummary.row_count);
console.log('Columns: ' + rawSummary.columns.join(', '));
console.log('Normalized sales rows: ' + normalized.length);
console.log('Missing cost rows: ' + missingCost.length);
console.log('Validation errors: ' + errors.length);

if(errors.length){
  console.log(JSON.stringify(errors, null, 2));
  console.log('RESULT: FAILED');
  process.exitCode = 1;
} else {
  console.log(missingCost.length ? 'RESULT: OK WITH CONTROL' : 'RESULT: OK');
}
