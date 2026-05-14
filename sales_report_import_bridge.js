/* AperiON / ErpaltH iSTasyon - Satış Raporu Import Bridge
Bu dosya mevcut index.html dosyasını değiştirmez.
Amaç: Excel satış raporunu standart satış kaydına çevirip Finans Takvimi için onay kuyruğu üretmek.
*/

const SALES_COMPANIES = ['alayli', 'woodlet', 'elit', 'odyoform', 'alkam', 'yenicespor'];

function normText(v) {
  return String(v || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, ' ').trim();
}

function toNum(v) {
  if (typeof v === 'number') return v;
  const n = Number(String(v || '0').replace(/TL/gi, '').replace(/₺/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30));
    d.setUTCDate(d.getUTCDate() + v);
    return d.toISOString().slice(0, 10);
  }
  const raw = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function findCol(headers, words) {
  const nh = headers.map(normText);
  for (const w of words) {
    const i = nh.findIndex(h => h.includes(normText(w)));
    if (i >= 0) return headers[i];
  }
  return null;
}

function detectSalesColumns(headers) {
  return {
    date: findCol(headers, ['tarih', 'fatura tarihi', 'belge tarihi']),
    customer: findCol(headers, ['cari', 'müşteri', 'musteri', 'unvan', 'alıcı', 'alici', 'firma']),
    product: findCol(headers, ['ürün', 'urun', 'stok', 'malzeme', 'açıklama', 'aciklama']),
    quantity: findCol(headers, ['adet', 'miktar', 'qty']),
    amount: findCol(headers, ['tutar', 'toplam', 'ciro', 'net tutar', 'genel toplam'])
  };
}

function normalizeSalesRows(rows, options = {}) {
  const company = SALES_COMPANIES.includes(options.company) ? options.company : 'alayli';
  if (!Array.isArray(rows) || rows.length === 0) return { records: [], warnings: ['Boş sayfa'] };
  const headers = Object.keys(rows[0] || {});
  const col = detectSalesColumns(headers);
  const warnings = [];
  if (!col.date) warnings.push('Tarih kolonu bulunamadı');
  if (!col.customer) warnings.push('Cari/Müşteri kolonu bulunamadı');
  if (!col.amount) warnings.push('Tutar kolonu bulunamadı');
  const records = rows.map((r, i) => {
    const amount = toNum(r[col.amount]);
    const customer = String(r[col.customer] || 'Eşleşmeyen Cari').trim();
    const date = toDate(r[col.date]) || options.fallbackDate || new Date().toISOString().slice(0, 10);
    return {
      temp_id: `SALE-${String(i + 1).padStart(5, '0')}`,
      company,
      sale_date: date,
      customer_name: customer,
      product_name: col.product ? String(r[col.product] || '').trim() : '',
      quantity: toNum(r[col.quantity]),
      total_amount: amount,
      source: options.source || 'satis_raporu_excel',
      source_file: options.fileName || null,
      approval_status: 'onay_bekliyor',
      confidence_score: amount > 0 && customer !== 'Eşleşmeyen Cari' ? 85 : 55,
      match_reason: amount > 0 && customer !== 'Eşleşmeyen Cari' ? 'tarih/cari/tutar okundu' : 'eksik bilgi kontrolü gerekli'
    };
  }).filter(r => r.total_amount !== 0 || r.customer_name !== 'Eşleşmeyen Cari');
  return { records, warnings, headerMap: col };
}

function summarizeSalesRecords(records) {
  const total = records.reduce((a, r) => a + Number(r.total_amount || 0), 0);
  const quantity = records.reduce((a, r) => a + Number(r.quantity || 0), 0);
  const byCustomer = {};
  records.forEach(r => {
    byCustomer[r.customer_name] = byCustomer[r.customer_name] || { count: 0, total_amount: 0 };
    byCustomer[r.customer_name].count += 1;
    byCustomer[r.customer_name].total_amount += Number(r.total_amount || 0);
  });
  return {
    count: records.length,
    total_amount: total,
    total_quantity: quantity,
    top_customers: Object.entries(byCustomer).map(([customer, v]) => ({ customer, ...v })).sort((a, b) => b.total_amount - a.total_amount).slice(0, 20)
  };
}

function convertSalesToFinanceQueue(records) {
  return records.map(r => ({
    company: r.company,
    record_type: 'tahsilat',
    status: 'bekliyor',
    cari_name: r.customer_name,
    description: `Satış raporu kaynaklı tahsilat planı${r.product_name ? ' - ' + r.product_name : ''}`,
    original_due_date: r.sale_date,
    actual_payment_date: r.sale_date,
    accrual_month: r.sale_date.slice(0, 7) + '-01',
    expected_amount: r.total_amount,
    realized_amount: 0,
    source: r.source,
    source_ref: r.temp_id,
    approval_status: 'onay_bekliyor',
    confidence_score: r.confidence_score,
    match_reason: r.match_reason,
    notes: `Kaynak dosya: ${r.source_file || '-'}; adet: ${r.quantity || 0}`
  }));
}

if (typeof module !== 'undefined') {
  module.exports = { normalizeSalesRows, summarizeSalesRecords, convertSalesToFinanceQueue };
}
