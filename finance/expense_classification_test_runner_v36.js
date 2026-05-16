const fs = require('fs');
const path = require('path');
const { normalizeExpenseRows, summarizeExpenses } = require('./AperiON_Expense_Import_Helper_v36.js');

function money(n){
  return Number(n || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

const file = path.join(__dirname, 'AperiON_Expense_Test_Data_v36.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const rows = normalizeExpenseRows(data.expense_rows || []);
const summary = summarizeExpenses(rows);

console.log('AperiON Expense Classification Test v36');
console.log('--------------------------------');

for (const r of rows) {
  console.log(`${r.description} | ${r.matched_category_code} | ${money(r.amount)} | score=${r.confidence_score} | status=${r.classification_status}`);
}

console.log('--------------------------------');
console.log('Category Summary');
for (const [code, item] of Object.entries(summary)) {
  console.log(`${code}: count=${item.count}, amount=${money(item.amount)}`);
}

const reviewRows = rows.filter(r => r.classification_status !== 'auto_classified' || r.matched_category_code === 'OTHER');
console.log('--------------------------------');
console.log(`Review Rows: ${reviewRows.length}`);
console.log(reviewRows.length > 0 ? 'RESULT: OK WITH REVIEW' : 'RESULT: OK');
