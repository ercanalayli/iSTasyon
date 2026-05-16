const fs = require('fs');
const path = require('path');
const {
  normalizeFinanceCalendarRows,
  validateFinanceCalendarRows,
  summarizeFinanceCalendarRows
} = require('./AperiON_Finance_Calendar_Normalizer_v47.js');

function money(n){
  return Number(n || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

const file = path.join(__dirname, 'AperiON_Finance_Calendar_Normalizer_Test_Data_v47.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const rows = normalizeFinanceCalendarRows(data.rows, data.defaults);
const errors = validateFinanceCalendarRows(rows);
const summary = summarizeFinanceCalendarRows(rows);

console.log('AperiON Finance Calendar Normalizer Test v47');
console.log('--------------------------------------------');

rows.forEach((r, i) => {
  console.log(`${i + 1}. ${r.title}`);
  console.log(`   date=${r.item_date} type=${r.item_type} direction=${r.direction} status=${r.status} priority=${r.priority}`);
  console.log(`   cari=${r.cari_name || '-'} account=${r.account_name || '-'} category=${r.category || '-'}`);
  console.log(`   amount=${money(r.expected_amount)} fixed=${r.fixed_or_variable} source=${r.source_type}`);
});

console.log('--------------------------------------------');
console.log('Summary');
console.log(JSON.stringify(summary, null, 2));
console.log('Validation errors: ' + errors.length);

if(errors.length){
  console.log('Validation error detail');
  console.log(JSON.stringify(errors, null, 2));
  console.log('RESULT: OK WITH REVIEW - invalid rows must go to approval/import error flow');
  process.exitCode = 0;
} else {
  console.log('RESULT: OK');
}
