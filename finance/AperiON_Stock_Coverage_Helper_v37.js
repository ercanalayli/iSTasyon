/* AperiON Stock Coverage Helper v37
   Purpose: calculate how many months of stock remain based on last 12 months sales quantity.
*/

function parseQty(value){
  if(value === null || value === undefined) return 0;
  return Number(String(value).replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'')) || 0;
}

function keyOf(row){
  return String(row.product_code || row.product_name || '').trim();
}

function calculateStockCoverage(stockRows, salesRows){
  const salesMap = {};
  for(const row of salesRows || []){
    const key = keyOf(row);
    if(!key) continue;
    if(!salesMap[key]) salesMap[key] = { sales_qty_12m: 0, product_name: row.product_name, product_code: row.product_code };
    salesMap[key].sales_qty_12m += parseQty(row.quantity || row.sales_qty || row.adet || row.miktar);
  }

  return (stockRows || []).map(stock => {
    const key = keyOf(stock);
    const stockQty = parseQty(stock.stock_qty || stock.stok || stock.mevcut_stok || stock.qty);
    const sales = salesMap[key] || { sales_qty_12m: 0 };
    const avgMonthlySalesQty = sales.sales_qty_12m / 12;
    let stockMonthsLeft = null;
    let stockStatus = 'no_sales_12m';

    if(stockQty <= 0){
      stockMonthsLeft = 0;
      stockStatus = 'out_of_stock';
    } else if(avgMonthlySalesQty > 0){
      stockMonthsLeft = stockQty / avgMonthlySalesQty;
      if(stockMonthsLeft < 1) stockStatus = 'critical_under_1_month';
      else if(stockMonthsLeft < 3) stockStatus = 'low_under_3_months';
      else if(stockMonthsLeft > 12) stockStatus = 'overstock_over_12_months';
      else stockStatus = 'ok';
    }

    return {
      company: stock.company || 'ALAYLI',
      product_code: stock.product_code || sales.product_code || null,
      product_name: stock.product_name || sales.product_name || key,
      category: stock.category || null,
      stock_qty: stockQty,
      sales_qty_12m: sales.sales_qty_12m,
      avg_monthly_sales_qty: avgMonthlySalesQty,
      stock_months_left: stockMonthsLeft === null ? null : Math.round(stockMonthsLeft * 100) / 100,
      stock_status: stockStatus
    };
  });
}

function summarizeStockCoverage(rows){
  const summary = {
    total_products: 0,
    out_of_stock: 0,
    critical_under_1_month: 0,
    low_under_3_months: 0,
    ok: 0,
    overstock_over_12_months: 0,
    no_sales_12m: 0
  };
  for(const r of rows || []){
    summary.total_products += 1;
    summary[r.stock_status] = (summary[r.stock_status] || 0) + 1;
  }
  return summary;
}

if(typeof module !== 'undefined'){
  module.exports = { calculateStockCoverage, summarizeStockCoverage, parseQty };
}
