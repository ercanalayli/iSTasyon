/* AperiON Supplier Price List Normalizer v44
   Purpose: normalize Telegram supplier price list rows into supplier_price_items format.
   Safe rule: no Supabase write, no BizimHesap write. Preview/approval first.
*/

function cleanText(value){
  return String(value || '').trim();
}

function normalizeText(value){
  return cleanText(value)
    .toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
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

function detectPackageInfo(productName){
  const text = normalizeText(productName);
  const size = (text.match(/\b(xs|s|m|l|xl|xxl|large|medium|small)\b/) || [])[0] || '';
  const count = (text.match(/\b(\d+)\s*(li|lu|adet|pcs|paket)\b/) || [])[0] || '';
  return [size, count].filter(Boolean).join(' / ');
}

function normalizeSupplierPriceRow(row, defaults = {}){
  const supplierProductName = cleanText(pick(row, [
    'supplier_product_name','tedarikci_urun_adi','Tedarikçi Ürün Adı','Ürün Adı','Urun Adi','urun','Ürün','Mal/Hizmet','Açıklama','aciklama'
  ]));
  const supplierPrice = parseNumber(pick(row, [
    'supplier_price','tedarikci_fiyat','Liste Fiyatı','Fiyat','Birim Fiyat','Alış Fiyatı','Alis Fiyati','Net Fiyat','Tutar'
  ]));
  const discountRateRaw = parseNumber(pick(row, ['discount_rate','iskonto','İskonto','iskonto_orani','İskonto Oranı']));
  const discountRate = discountRateRaw > 1 ? discountRateRaw / 100 : discountRateRaw;
  const netSupplierPrice = parseNumber(pick(row, ['net_supplier_price','Net Fiyat','Net Alış','Net Alis'])) || (supplierPrice * (1 - discountRate));
  const matchedName = cleanText(pick(row, ['matched_product_name','AperiON Ürün','Aperion Urun','Sistem Ürünü','Sistem Urunu']));

  return {
    company: cleanText(pick(row, ['company','firma','Firma'])) || defaults.company || 'ALAYLI',
    supplier_name: cleanText(pick(row, ['supplier_name','tedarikci','Tedarikçi','Tedarikci','Firma Adı','Firma Adi'])) || defaults.supplier_name || null,
    supplier_product_code: cleanText(pick(row, ['supplier_product_code','tedarikci_kod','Tedarikçi Kod','Tedarikci Kod','Kod','Stok Kodu'])),
    supplier_product_name: supplierProductName,
    normalized_product_name: normalizeText(supplierProductName),
    matched_product_code: cleanText(pick(row, ['matched_product_code','product_code','Ürün Kodu','Urun Kodu'])) || null,
    matched_product_name: matchedName || null,
    match_confidence: matchedName ? 95 : 0,
    package_info: cleanText(pick(row, ['package_info','Paket','Ambalaj'])) || detectPackageInfo(supplierProductName),
    unit: cleanText(pick(row, ['unit','Birim','birim'])) || 'adet',
    supplier_price: supplierPrice,
    discount_rate: discountRate,
    net_supplier_price: netSupplierPrice,
    currency: cleanText(pick(row, ['currency','Para Birimi','Döviz','Doviz'])) || defaults.currency || 'TRY',
    vat_included: row.vat_included !== undefined ? Boolean(row.vat_included) : defaults.vat_included ?? null,
    price_date: cleanText(pick(row, ['price_date','Tarih','Liste Tarihi'])) || defaults.price_date || null,
    approval_status: matchedName ? 'matched' : 'waiting',
    note: cleanText(pick(row, ['note','Not'])) || null
  };
}

function normalizeSupplierPriceRows(rows, defaults = {}){
  return (rows || []).map(row => normalizeSupplierPriceRow(row, defaults));
}

function validateSupplierPriceRows(rows){
  const errors = [];
  (rows || []).forEach((r, index) => {
    if(!r.company) errors.push({ index, field:'company', message:'company missing' });
    if(!r.supplier_product_name) errors.push({ index, field:'supplier_product_name', message:'product name missing' });
    if(r.supplier_price <= 0 && r.net_supplier_price <= 0) errors.push({ index, field:'supplier_price', message:'price must be positive' });
  });
  return errors;
}

function summarizeSupplierPrices(rows){
  const list = rows || [];
  return {
    row_count: list.length,
    waiting_match_count: list.filter(r => r.approval_status === 'waiting').length,
    matched_count: list.filter(r => r.approval_status === 'matched').length,
    min_price: Math.min(...list.map(r => Number(r.net_supplier_price || r.supplier_price || 0)).filter(n => n > 0)),
    max_price: Math.max(...list.map(r => Number(r.net_supplier_price || r.supplier_price || 0)).filter(n => n > 0))
  };
}

if(typeof module !== 'undefined'){
  module.exports = {
    cleanText,
    normalizeText,
    parseNumber,
    detectPackageInfo,
    normalizeSupplierPriceRow,
    normalizeSupplierPriceRows,
    validateSupplierPriceRows,
    summarizeSupplierPrices
  };
}
