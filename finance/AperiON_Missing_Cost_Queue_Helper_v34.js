/* AperiON Missing Cost Queue Helper v34
   Purpose: when product profit import finds cost_missing rows, prepare queue records.
*/

function parseNumber(value){
  if(value === null || value === undefined) return 0;
  return Number(String(value).replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'')) || 0;
}

function buildMissingCostQueueRow(row){
  const quantity = parseNumber(row.quantity);
  const unitSalePrice = parseNumber(row.unit_sale_price);
  return {
    company: row.company || 'ALAYLI',
    sale_date: row.sale_date || null,
    invoice_no: row.invoice_no || null,
    cari_name: row.cari_name || null,
    product_code: row.product_code || null,
    product_name: row.product_name,
    quantity,
    unit_sale_price: unitSalePrice,
    sales_amount: quantity * unitSalePrice,
    suggested_unit_cost: row.suggested_unit_cost || null,
    approved_unit_cost: null,
    approval_status: 'waiting',
    note: 'Auto queued from cost_missing product sale'
  };
}

function extractMissingCostRows(productProfitRows){
  return (productProfitRows || [])
    .filter(r => r.profit_status === 'cost_missing' || parseNumber(r.unit_cost) <= 0)
    .map(buildMissingCostQueueRow);
}

function summarizeMissingCostQueue(queueRows){
  const rows = queueRows || [];
  const totalSales = rows.reduce((a,r) => a + parseNumber(r.sales_amount), 0);
  const productCount = new Set(rows.map(r => r.product_code || r.product_name)).size;
  return {
    missing_count: rows.length,
    product_count: productCount,
    total_sales: totalSales,
    status: rows.length > 0 ? 'control_required' : 'ok'
  };
}

if(typeof module !== 'undefined'){
  module.exports = { buildMissingCostQueueRow, extractMissingCostRows, summarizeMissingCostQueue };
}
