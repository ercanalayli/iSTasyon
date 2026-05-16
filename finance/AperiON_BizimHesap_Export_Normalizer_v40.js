/* AperiON BizimHesap Export Normalizer v40
   Purpose: normalize BizimHesap export rows into AperiON finance data contract.
   No live write. This file only prepares clean rows for review/import.
*/

function cleanText(value){
  return String(value || '').trim();
}

function parseNumber(value){
  if(value === null || value === undefined) return 0;
  return Number(String(value).replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'')) || 0;
}

function pick(row, keys){
  for(const k of keys){
    if(row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k];
  }
  return '';
}

function normalizeSaleRow(row, defaults = {}){
  const company = cleanText(pick(row, ['company','firma','Firma'])) || defaults.company || 'ALAYLI';
  const productCode = cleanText(pick(row, ['product_code','urun_kodu','Ürün Kodu','Stok Kodu','kod','Kod']));
  const productName = cleanText(pick(row, ['product_name','urun_adi','Ürün Adı','Mal/Hizmet','urun','Ürün','hizmet']));
  const quantity = parseNumber(pick(row, ['quantity','adet','Adet','miktar','Miktar']));
  const unitSalePrice = parseNumber(pick(row, ['unit_sale_price','birim_satis','Birim Fiyat','Birim Satış','fiyat','Fiyat']));
  const unitCost = parseNumber(pick(row, ['unit_cost','birim_maliyet','Birim Maliyet','maliyet','Maliyet']));

  return {
    company,
    sale_date: cleanText(pick(row, ['sale_date','tarih','Tarih','Fatura Tarihi'])) || defaults.sale_date || null,
    invoice_no: cleanText(pick(row, ['invoice_no','fatura_no','Fatura No','Belge No','belge_no'])),
    cari_name: cleanText(pick(row, ['cari_name','cari','Cari','Müşteri','Musteri','Unvan','Ünvan'])),
    product_code: productCode,
    product_name: productName,
    quantity,
    unit_sale_price: unitSalePrice,
    unit_cost: unitCost,
    dynamic_expense_share: 0,
    variable_expense: 0,
    profit_status: unitCost > 0 ? 'estimate' : 'cost_missing',
    source_type: 'bizimhesap_export'
  };
}

function normalizeStockRow(row, defaults = {}){
  return {
    company: cleanText(pick(row, ['company','firma','Firma'])) || defaults.company || 'ALAYLI',
    snapshot_date: cleanText(pick(row, ['snapshot_date','tarih','Tarih'])) || defaults.snapshot_date || null,
    product_code: cleanText(pick(row, ['product_code','urun_kodu','Ürün Kodu','Stok Kodu','kod','Kod'])),
    product_name: cleanText(pick(row, ['product_name','urun_adi','Ürün Adı','Mal/Hizmet','urun','Ürün'])),
    category: cleanText(pick(row, ['category','kategori','Kategori','Grup'])) || null,
    stock_qty: parseNumber(pick(row, ['stock_qty','stok','Stok','Mevcut Stok','mevcut_stok','qty'])),
    source_type: 'bizimhesap_export'
  };
}

function normalizeSalesQtyRow(row, defaults = {}){
  return {
    company: cleanText(pick(row, ['company','firma','Firma'])) || defaults.company || 'ALAYLI',
    sale_date: cleanText(pick(row, ['sale_date','tarih','Tarih','Fatura Tarihi'])) || defaults.sale_date || null,
    product_code: cleanText(pick(row, ['product_code','urun_kodu','Ürün Kodu','Stok Kodu','kod','Kod'])),
    product_name: cleanText(pick(row, ['product_name','urun_adi','Ürün Adı','Mal/Hizmet','urun','Ürün'])),
    category: cleanText(pick(row, ['category','kategori','Kategori','Grup'])) || null,
    quantity: parseNumber(pick(row, ['quantity','adet','Adet','miktar','Miktar'])),
    source_type: 'bizimhesap_export'
  };
}

function normalizeExpenseRow(row, defaults = {}){
  return {
    company: cleanText(pick(row, ['company','firma','Firma'])) || defaults.company || 'ALAYLI',
    expense_date: cleanText(pick(row, ['expense_date','tarih','Tarih','İşlem Tarihi','Islem Tarihi'])) || defaults.expense_date || null,
    source_type: cleanText(pick(row, ['source_type','kaynak','Kaynak'])) || defaults.source_type || 'bizimhesap_export',
    source_name: cleanText(pick(row, ['source_name','dosya','Dosya'])) || defaults.source_name || null,
    description: cleanText(pick(row, ['description','aciklama','açıklama','Açıklama','Detay','memo'])) ,
    amount: parseNumber(pick(row, ['amount','tutar','Tutar','borc','borç','Borç','odeme','ödeme','Ödeme']))
  };
}

function normalizeBizimHesapExport(rows, type, defaults = {}){
  const list = rows || [];
  if(type === 'sales') return list.map(r => normalizeSaleRow(r, defaults));
  if(type === 'stock') return list.map(r => normalizeStockRow(r, defaults));
  if(type === 'sales_qty') return list.map(r => normalizeSalesQtyRow(r, defaults));
  if(type === 'expense') return list.map(r => normalizeExpenseRow(r, defaults));
  throw new Error('Unknown export type: ' + type);
}

function validateNormalizedRows(rows, type){
  const errors = [];
  (rows || []).forEach((r, index) => {
    if(!r.company) errors.push({ index, field: 'company', message: 'company missing' });
    if(type === 'sales' && !r.product_name) errors.push({ index, field: 'product_name', message: 'product_name missing' });
    if(type === 'sales' && r.quantity <= 0) errors.push({ index, field: 'quantity', message: 'quantity must be positive' });
    if(type === 'stock' && !r.product_name) errors.push({ index, field: 'product_name', message: 'product_name missing' });
    if(type === 'expense' && !r.description) errors.push({ index, field: 'description', message: 'description missing' });
  });
  return errors;
}

if(typeof module !== 'undefined'){
  module.exports = {
    parseNumber,
    normalizeSaleRow,
    normalizeStockRow,
    normalizeSalesQtyRow,
    normalizeExpenseRow,
    normalizeBizimHesapExport,
    validateNormalizedRows
  };
}
