const fs = require('fs');
const path = require('path');
const {
  normalizeSupplierPriceRows,
  validateSupplierPriceRows,
  summarizeSupplierPrices
} = require('./AperiON_Supplier_Price_List_Normalizer_v44.js');

function money(n){
  return Number(n || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

const file = path.join(__dirname, 'AperiON_Supplier_Price_List_Test_Data_v44.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const rows = normalizeSupplierPriceRows(data.rows, {
  supplier_name: data.supplier_name,
  price_date: data.price_date,
  currency: data.currency,
  company: 'ALAYLI'
});

const errors = validateSupplierPriceRows(rows);
const summary = summarizeSupplierPrices(rows);

console.log('AperiON Supplier Price List Test v44');
console.log('--------------------------------');

rows.forEach((r, i) => {
  console.log(`${i + 1}. ${r.supplier_product_name}`);
  console.log(`   normalized=${r.normalized_product_name}`);
  console.log(`   price=${money(r.supplier_price)} net=${money(r.net_supplier_price)} discount=${r.discount_rate}`);
  console.log(`   package=${r.package_info || '-'} match=${r.matched_product_name || '-'} status=${r.approval_status} confidence=${r.match_confidence}`);
});

console.log('--------------------------------');
console.log('Summary');
console.log(JSON.stringify(summary, null, 2));
console.log('Validation errors: ' + errors.length);

if(errors.length){
  console.log('Validation error detail');
  console.log(JSON.stringify(errors, null, 2));
  console.log('RESULT: OK WITH REVIEW - invalid/price missing rows must go to approval/reject flow');
  process.exitCode = 0;
} else if(summary.waiting_match_count > 0){
  console.log('RESULT: OK WITH MATCH REVIEW - some products wait for matching');
  process.exitCode = 0;
} else {
  console.log('RESULT: OK');
}
