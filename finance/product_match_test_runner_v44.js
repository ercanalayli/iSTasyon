const fs = require('fs');
const path = require('path');
const {
  applyProductMatching,
  summarizeProductMatching
} = require('./AperiON_Product_Match_Helper_v44.js');

const file = path.join(__dirname, 'AperiON_Product_Match_Test_Data_v44.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const matchedRows = applyProductMatching(data.supplier_rows, data.product_master);
const summary = summarizeProductMatching(matchedRows);

console.log('AperiON Product Match Test v44');
console.log('--------------------------------');

matchedRows.forEach((r, i) => {
  console.log(`${i + 1}. ${r.supplier_product_name}`);
  console.log(`   -> ${r.matched_product_name || '-'} (${r.matched_product_code || '-'})`);
  console.log(`   confidence=${r.match_confidence} status=${r.approval_status}`);
  console.log(`   reason=${r.match_reason || '-'}`);
});

console.log('--------------------------------');
console.log('Summary');
console.log(JSON.stringify(summary, null, 2));

const hasMatched = summary.matched > 0;
const hasReviewOrWaiting = (summary.review + summary.waiting) > 0;

if(!hasMatched){
  console.log('RESULT: FAILED - no high-confidence matches found');
  process.exitCode = 1;
} else if(hasReviewOrWaiting){
  console.log('RESULT: OK WITH REVIEW - uncertain matches must go to approval center');
  process.exitCode = 0;
} else {
  console.log('RESULT: OK');
}
