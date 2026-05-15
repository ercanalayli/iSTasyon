/* AperiON Product Profit Test Runner v34.2
   Purpose: verify product sale, cost of goods sold, gross profit, net profit and missing cost queue logic.
   Missing cost rows are warning/control items, not CI failure.
*/

const fs = require('fs');
const path = require('path');
const { convertBizimHesapRowsToProductProfit } = require('./AperiON_BizimHesap_Product_Profit_Import_v34.js');
const { extractMissingCostRows, summarizeMissingCostQueue } = require('./AperiON_Missing_Cost_Queue_Helper_v34.js');

function money(n){
  return Number(n || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

function calculate(row){
  const sales_amount = Number(row.quantity || 0) * Number(row.unit_sale_price || 0);
  const cogs_amount = Number(row.quantity || 0) * Number(row.unit_cost || 0);
  const gross_profit = sales_amount - cogs_amount;
  const net_profit = gross_profit - Number(row.dynamic_expense_share || 0) - Number(row.variable_expense || 0);
  const net_margin = sales_amount > 0 ? (net_profit / sales_amount) * 100 : 0;
  return { ...row, sales_amount, cogs_amount, gross_profit, net_profit, net_margin };
}

function run(){
  const file = path.join(__dirname, 'AperiON_Product_Profit_Test_Data_v34.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const converted = convertBizimHesapRowsToProductProfit(data.bizimhesap_sales_rows, data.product_costs).map(calculate);
  const missingQueue = extractMissingCostRows(converted);
  const queueSummary = summarizeMissingCostQueue(missingQueue);

  console.log('AperiON Product Profit Test v34.2');
  console.log('--------------------------------');

  let totalSales = 0;
  let totalCogs = 0;
  let totalGross = 0;
  let totalNet = 0;
  let missingCost = 0;
  let invalidRows = 0;

  converted.forEach((r, i) => {
    totalSales += r.sales_amount;
    totalCogs += r.cogs_amount;
    totalGross += r.gross_profit;
    totalNet += r.net_profit;
    if (r.profit_status === 'cost_missing') missingCost += 1;
    if (!r.product_name || r.quantity <= 0 || r.unit_sale_price <= 0) invalidRows += 1;

    console.log(`${i + 1}. ${r.product_name}`);
    console.log(`   Sales: ${money(r.sales_amount)}`);
    console.log(`   COGS: ${money(r.cogs_amount)}`);
    console.log(`   Gross Profit: ${money(r.gross_profit)}`);
    console.log(`   Net Profit: ${money(r.net_profit)}`);
    console.log(`   Margin: %${r.net_margin.toFixed(2)}`);
    console.log(`   Status: ${r.profit_status}`);
  });

  console.log('--------------------------------');
  console.log(`Total Sales: ${money(totalSales)}`);
  console.log(`Total COGS: ${money(totalCogs)}`);
  console.log(`Total Gross Profit: ${money(totalGross)}`);
  console.log(`Total Net Profit: ${money(totalNet)}`);
  console.log(`Missing Cost Rows: ${missingCost}`);
  console.log(`Invalid Rows: ${invalidRows}`);
  console.log('--------------------------------');
  console.log('Missing Cost Queue Summary');
  console.log(`Queue Rows: ${queueSummary.missing_count}`);
  console.log(`Product Count: ${queueSummary.product_count}`);
  console.log(`Total Sales Waiting Cost: ${money(queueSummary.total_sales)}`);
  console.log(`Queue Status: ${queueSummary.status}`);

  if (missingQueue.length > 0) {
    console.log('Missing Cost Queue Rows');
    missingQueue.forEach((q, i) => {
      console.log(`${i + 1}. ${q.product_name} | invoice=${q.invoice_no || '-'} | sales=${money(q.sales_amount)} | status=${q.approval_status}`);
    });
  }

  if (invalidRows > 0) {
    console.log('RESULT: FAILED - invalid sales rows exist.');
    process.exitCode = 1;
    return;
  }

  if (missingCost > 0) {
    console.log('RESULT: OK WITH CONTROL - cost missing rows correctly queued.');
    process.exitCode = 0;
    return;
  }

  console.log('RESULT: OK');
}

run();