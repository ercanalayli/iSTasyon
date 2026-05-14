/*
AperiON / ErpaltH iSTasyon
Satış Dashboard Adapter

Amaç:
- Satış raporu özet/detay verisini dashboard kartlarına çevirmek.
- Müşteri / ürün / kategori bazlı top listeler üretmek.
- Finans Takvimi tarafında satışları tahsilat planı kaynağı olarak göstermek.

Bu dosya mevcut index.html dosyasını değiştirmez.
*/

function salesNumber(value) {
  if (typeof value === 'number') return value;
  const n = Number(String(value || '0').replace(/TL/gi, '').replace(/₺/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function salesText(value) {
  return String(value || '').trim();
}

function pick(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return '';
}

function normalizeSalesRecord(row, company = 'alayli') {
  return {
    company,
    date: salesText(pick(row, ['date', 'Tarih', 'Fatura Tarihi', 'Belge Tarihi'])),
    customer: salesText(pick(row, ['customer', 'Cari', 'Müşteri', 'Musteri', 'Unvan', 'Firma'])) || 'Eşleşmeyen Cari',
    product: salesText(pick(row, ['product', 'Ürün', 'Urun', 'Stok', 'Malzeme', 'Açıklama', 'Aciklama'])) || 'Tanımsız Ürün',
    category: salesText(pick(row, ['category', 'Kategori', 'Grup', 'Ana Grup'])) || 'Tanımsız Kategori',
    quantity: salesNumber(pick(row, ['quantity', 'Adet', 'Miktar', 'Qty'])),
    net: salesNumber(pick(row, ['net', 'Net', 'Net Tutar', 'Ciro'])),
    vat: salesNumber(pick(row, ['vat', 'KDV', 'Kdv'])),
    total: salesNumber(pick(row, ['total', 'Toplam', 'Genel Toplam', 'KDV Dahil']))
  };
}

function groupBy(records, key, amountField = 'total') {
  const map = new Map();
  records.forEach(r => {
    const name = r[key] || 'Tanımsız';
    if (!map.has(name)) map.set(name, { name, count: 0, quantity: 0, net: 0, vat: 0, total: 0 });
    const item = map.get(name);
    item.count += 1;
    item.quantity += salesNumber(r.quantity);
    item.net += salesNumber(r.net);
    item.vat += salesNumber(r.vat);
    item.total += salesNumber(r[amountField]);
  });
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function buildSalesDashboard(records) {
  const total = records.reduce((a, r) => a + salesNumber(r.total), 0);
  const net = records.reduce((a, r) => a + salesNumber(r.net), 0);
  const vat = records.reduce((a, r) => a + salesNumber(r.vat), 0);
  const quantity = records.reduce((a, r) => a + salesNumber(r.quantity), 0);
  return {
    kpis: {
      record_count: records.length,
      total_quantity: quantity,
      net_sales: net,
      vat_total: vat,
      gross_sales: total
    },
    top_customers: groupBy(records, 'customer').slice(0, 20),
    top_products: groupBy(records, 'product').slice(0, 50),
    top_categories: groupBy(records, 'category').slice(0, 20)
  };
}

function buildFinanceQueueFromSalesDashboard(summary, company = 'alayli', date = new Date().toISOString().slice(0, 10)) {
  return {
    company,
    record_type: 'tahsilat',
    status: 'taslak',
    cari_name: 'Satış Raporu Tahsilat Planı',
    description: `Satış raporu toplamı: ${summary.kpis.record_count} kayıt`,
    original_due_date: date,
    actual_payment_date: date,
    accrual_month: date.slice(0, 7) + '-01',
    expected_amount: summary.kpis.gross_sales,
    realized_amount: 0,
    source: 'sales_dashboard_adapter',
    approval_status: 'onay_bekliyor',
    confidence_score: 80,
    match_reason: 'Satış raporu özetinden tahsilat planı üretildi'
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    normalizeSalesRecord,
    buildSalesDashboard,
    buildFinanceQueueFromSalesDashboard,
    groupBy
  };
}
