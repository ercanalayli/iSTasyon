/* AperiON BizimHesap Product Profit Import v34
   Purpose: Convert BizimHesap sales rows into product_sales_profit rows.
   Rule: product sale requires cost. If cost is missing, status remains cost_missing.
*/

function parseNumber(value){
  if(value === null || value === undefined) return 0;
  return Number(String(value).replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'')) || 0;
}

function normalizeText(value){
  return String(value || '').trim();
}

function buildProductProfitRow(row, costMap){
  const company = normalizeText(row.company || row.firma || 'ALAYLI');
  const productCode = normalizeText(row.product_code || row.urun_kodu || row.kod);
  const productName = normalizeText(row.product_name || row.urun_adi || row.urun || row.hizmet);
  const key = productCode || productName;
  const qty = parseNumber(row.quantity || row.adet || row.miktar);
  const unitSale = parseNumber(row.unit_sale_price || row.birim_satis || row.birim_fiyat);
  const unitCost = parseNumber(row.unit_cost || row.birim_maliyet || costMap[key] || 0);
  const dynamicExpenseShare = parseNumber(row.dynamic_expense_share || row.gider_payi || 0);
  const variableExpense = parseNumber(row.variable_expense || row.degisken_gider || 0);

  return {
    company,
    sale_date: row.sale_date || row.tarih,
    invoice_no: normalizeText(row.invoice_no || row.fatura_no || row.belge_no),
    cari_name: normalizeText(row.cari_name || row.cari || row.musteri),
    product_code: productCode,
    product_name: productName,
    quantity: qty,
    unit_sale_price: unitSale,
    unit_cost: unitCost,
    dynamic_expense_share: dynamicExpenseShare,
    variable_expense: variableExpense,
    profit_status: unitCost > 0 ? 'estimate' : 'cost_missing'
  };
}

function convertBizimHesapRowsToProductProfit(rows, productCosts){
  const costMap = {};
  (productCosts || []).forEach(c => {
    if(c.product_code) costMap[String(c.product_code).trim()] = parseNumber(c.unit_cost);
    if(c.product_name) costMap[String(c.product_name).trim()] = parseNumber(c.unit_cost);
  });
  return (rows || []).map(r => buildProductProfitRow(r, costMap));
}

if(typeof module !== 'undefined'){
  module.exports = { parseNumber, convertBizimHesapRowsToProductProfit, buildProductProfitRow };
}
