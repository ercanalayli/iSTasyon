const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(ROOT, 'hasta-bezi', name), 'utf8').replace(/^\uFEFF/, ''));
const sales = read('bizimhesap_sales.json').rows || [];
const purchases = read('bizimhesap_purchases.json').rows || [];
const stock = read('bizimhesap_stock.json').rows || [];
const products = read('bizimhesap_products.json').rows || [];
const audit = read('bizimhesap_source_audit.json');

const invoiceMissing = sales.filter(row => !row.fatura_no || row.fatura_no === 'KONTROL').length;
const fifoControl = sales.filter(row => row.fifo_status !== 'OK').length;
const productsWithSales = products.filter(row => Number(row.satis_sayisi) > 0).length;
const productsWithPurchases = products.filter(row => Number(row.alis_sayisi) > 0).length;
const jender = sales.filter(row => /JENDER.*XXL|XXL.*JENDER/i.test(row.urun || ''));
const ilkbahar = sales.filter(row => /ILKBAHAR|Ã„Â°LKBAHAR/i.test(row.musteri || ''));
const match = sales.filter(row =>
  /JENDER.*XXL|XXL.*JENDER/i.test(row.urun || '') &&
  /ILKBAHAR|Ã„Â°LKBAHAR/i.test(row.musteri || ''));

const report = {
  sales_raw: sales.length,
  purchase_raw: purchases.length,
  stock_raw: stock.length,
  sales_invoice_missing: invoiceMissing,
  products_with_sales_history: productsWithSales,
  products_with_purchase_history: productsWithPurchases,
  fifo_control_remaining: fifoControl,
  jender_xxl_sales: jender.length,
  ilkbahar_sales: ilkbahar.length,
  jender_xxl_ilkbahar_matches: match.length,
  source_errors: audit.table_errors || {},
};

console.log(JSON.stringify(report, null, 2));
const failed = [];
if (!sales.length) failed.push('sales_raw yok');
if (!purchases.length) failed.push('purchase_raw yok');
if (!stock.length) failed.push('stock_raw yok');
if (invoiceMissing) failed.push(`${invoiceMissing} satÃ„Â±Ã…Å¸ta fatura no eksik`);
if (!productsWithSales) failed.push('ÃƒÂ¼rÃƒÂ¼n kartÃ„Â±nda satÃ„Â±Ã…Å¸ geÃƒÂ§miÃ…Å¸i yok');
if (!productsWithPurchases) failed.push('ÃƒÂ¼rÃƒÂ¼n kartÃ„Â±nda alÃ„Â±Ã…Å¸ geÃƒÂ§miÃ…Å¸i yok');
if (!match.length) failed.push('Jender XXL / Ã„Â°lkbahar Eczanesi eÃ…Å¸leÃ…Å¸mesi yok');
if (failed.length) {
  console.error(`KAYNAK EKSÃ„Â°K: ${failed.join('; ')}`);
  process.exit(1);
}


