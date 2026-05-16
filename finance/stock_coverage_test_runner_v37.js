const fs = require('fs');
const path = require('path');
const { calculateStockCoverage, summarizeStockCoverage } = require('./AperiON_Stock_Coverage_Helper_v37.js');

function fmt(n){
  if(n === null || n === undefined) return '-';
  return Number(n || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

const file = path.join(__dirname, 'AperiON_Stock_Coverage_Test_Data_v37.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const rows = calculateStockCoverage(data.stock_rows, data.sales_rows_12m);
const summary = summarizeStockCoverage(rows);

console.log('AperiON Stock Coverage Test v37');
console.log('--------------------------------');

for (const r of rows) {
  console.log(r.product_name + ' | stok=' + fmt(r.stock_qty) + ' | 12ay satis=' + fmt(r.sales_qty_12m) + ' | aylik ort=' + fmt(r.avg_monthly_sales_qty) + ' | kalan ay=' + fmt(r.stock_months_left) + ' | durum=' + r.stock_status);
}

console.log('--------------------------------');
console.log(JSON.stringify(summary, null, 2));

const critical = (summary.out_of_stock || 0) + (summary.critical_under_1_month || 0);
console.log(critical > 0 ? 'RESULT: OK WITH STOCK ALERT' : 'RESULT: OK');
