const fs = require('fs');
const path = require('path');
const {
  normalizeBizimHesapExport,
  validateNormalizedRows
} = require('./AperiON_BizimHesap_Export_Normalizer_v40.js');

function money(n){
  return Number(n || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

function printRows(title, rows){
  console.log('--------------------------------');
  console.log(title);
  rows.forEach((r, i) => console.log(String(i + 1) + '. ' + JSON.stringify(r)));
}

const file = path.join(__dirname, 'AperiON_BizimHesap_Normalizer_Test_Data_v40.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const sales = normalizeBizimHesapExport(data.sales_rows, 'sales');
const stock = normalizeBizimHesapExport(data.stock_rows, 'stock');
const salesQty = normalizeBizimHesapExport(data.sales_qty_rows, 'sales_qty');
const expenses = normalizeBizimHesapExport(data.expense_rows, 'expense');

const errors = [
  ...validateNormalizedRows(sales, 'sales').map(e => ({ type: 'sales', ...e })),
  ...validateNormalizedRows(stock, 'stock').map(e => ({ type: 'stock', ...e })),
  ...validateNormalizedRows(salesQty, 'sales_qty').map(e => ({ type: 'sales_qty', ...e })),
  ...validateNormalizedRows(expenses, 'expense').map(e => ({ type: 'expense', ...e }))
];

console.log('AperiON BizimHesap Normalizer Test v40');
printRows('Sales normalized', sales);
printRows('Stock normalized', stock);
printRows('Sales quantity normalized', salesQty);
printRows('Expense normalized', expenses);

const missingCostRows = sales.filter(r => r.profit_status === 'cost_missing');
const totalSalesAmount = sales.reduce((a, r) => a + (Number(r.quantity || 0) * Number(r.unit_sale_price || 0)), 0);
const totalStockQty = stock.reduce((a, r) => a + Number(r.stock_qty || 0), 0);
const totalExpense = expenses.reduce((a, r) => a + Number(r.amount || 0), 0);

console.log('--------------------------------');
console.log('Summary');
console.log('Sales rows: ' + sales.length);
console.log('Missing cost sales: ' + missingCostRows.length);
console.log('Total sales amount: ' + money(totalSalesAmount));
console.log('Stock rows: ' + stock.length);
console.log('Total stock qty: ' + totalStockQty.toLocaleString('tr-TR'));
console.log('Expense rows: ' + expenses.length);
console.log('Total expense: ' + money(totalExpense));
console.log('Validation errors: ' + errors.length);

if(errors.length){
  console.log('Validation error detail');
  console.log(JSON.stringify(errors, null, 2));
  console.log('RESULT: FAILED - normalized rows have validation errors');
  process.exitCode = 1;
} else if(missingCostRows.length){
  console.log('RESULT: OK WITH CONTROL - missing cost rows correctly flagged');
  process.exitCode = 0;
} else {
  console.log('RESULT: OK');
}
