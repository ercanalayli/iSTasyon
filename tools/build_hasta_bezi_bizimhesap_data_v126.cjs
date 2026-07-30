const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'hasta-bezi');
const FIRMA_ID = 'alayli';
const UPDATE_NO = '1245290726';
const PAGE_SIZE = 1000;

const url = ((process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/i, '') || '').replace(/\/rest\/v1\/?$/,'');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
  process.exit(2);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const n = value => Number(value) || 0;
const s = value => String(value ?? '').trim();
const norm = value => s(value).toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ');
const round = value => Math.round((n(value) + Number.EPSILON) * 100) / 100;
const id = (...parts) => parts.map(norm).filter(Boolean).join('|');
const productKey = value => norm(value)
  .replace(/^\d{4}\s+/, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

async function fetchAll(table, columns = '*') {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db.from(table)
      .select(columns)
      .eq('firma_id', FIRMA_ID)
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      if (/does not exist|schema cache/i.test(error.message)) return { rows: [], error: error.message };
      throw new Error(`${table}: ${error.message}`);
    }
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { rows, error: '' };
}

function rawValue(raw, names) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const mapped = source.mapped && typeof source.mapped === 'object' ? source.mapped : {};
  for (const name of names) {
    const value = source[name] ?? mapped[name];
    if (value !== undefined && value !== null && s(value)) return value;
  }
  return '';
}

function write(name, payload) {
  const file = path.join(OUT, name);
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, file);
}

function readRows(file, fallback = []) {
  try {
    const payload = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    return Array.isArray(payload) ? payload : payload.rows || payload.kayitlar || fallback;
  } catch {
    return fallback;
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const generatedAt = new Date().toISOString();
  const [salesResult, purchasesResult, productsResult, customersResult, stockResult] = await Promise.all([
    fetchAll('sales_raw', 'id,tarih,urun,adet,ciro,unvan,kategori,kaynak,created_at'),
    fetchAll('purchase_raw', 'id,tarih,belge_no,tedarikci,urun_kod,barkod,urun,kategori,miktar,birim,alis_fiyat,tutar,kaynak,raw,created_at'),
    fetchAll('product_raw', 'id,urun_kod,barkod,urun,marka,kategori,alis_fiyat,satis_fiyat,kdv,miktar,birim,depo,raf,etiket,kaynak,raw,updated_at'),
    fetchAll('customers', 'id,cari_kod,cari_unvan,tip,telefon,email,adres,bakiye,bakiye_tipi,risk_etiketi,kaynak,raw,updated_at'),
    fetchAll('stock_raw', 'id,tarih,urun_kod,barkod,urun,kategori,depo,hareket_tipi,miktar,birim,kaynak,raw,created_at'),
  ]);

  const localSalesRows = readRows(path.join(ROOT, 'data', 'bizimhesap_sales_report_raw.json'));
  const localPurchaseRows = readRows(path.join(ROOT, 'data', 'bizimhesap_purchase_raw.json'));
  const localStockRows = readRows(path.join(ROOT, 'urun_stok_alayli.json'));
  if (!purchasesResult.rows.length && localPurchaseRows.length) purchasesResult.rows = localPurchaseRows;
  if (!stockResult.rows.length && localStockRows.length) {
    stockResult.rows = localStockRows.map(row => ({
      ...(row.raw || {}),
      ...row,
      tarih: generatedAt.slice(0, 10),
      hareket_tipi: 'anlik_stok',
      kaynak: row.kaynak || 'bizimhesap_stok_raporu',
    }));
  }

  const rawSaleBuckets = new Map();
  for (const row of localSalesRows) {
    const keyName = id(row.tarih, row.urun, row.unvan, round(row.ciro));
    if (!rawSaleBuckets.has(keyName)) rawSaleBuckets.set(keyName, []);
    rawSaleBuckets.get(keyName).push(row);
  }
  const takeRawSale = row => {
    const keyName = id(row.tarih, row.urun, row.unvan, round(row.ciro));
    return (rawSaleBuckets.get(keyName) || []).shift() || {};
  };

  const productRowsByKey = new Map();
  for (const row of productsResult.rows) {
    const keyName = norm(row.urun_kod || row.barkod) || productKey(row.urun);
    const current = productRowsByKey.get(keyName);
    if (!current || s(row.updated_at).localeCompare(s(current.updated_at)) >= 0) {
      productRowsByKey.set(keyName, row);
    }
  }
  const productRows = [...productRowsByKey.values()];
  const productByName = new Map(productRows.map(row => [norm(row.urun), row]));
  let sales = salesResult.rows.map(row => {
    const reportRow = takeRawSale(row);
    const product = productByName.get(norm(row.urun)) || {};
    const qty = n(row.adet);
    const net = n(row.ciro);
    const kdvRate = n(product.kdv);
    const freight = n(rawValue(row.raw, ['nakliye', 'freight']));
    return {
      id: `sale-${row.id}`,
      source: 'BizimHesap',
      tarih: row.tarih || '',
      musteri: row.unvan || 'KONTROL',
      fatura_no: reportRow.fatura_no || 'KONTROL',
      urun_kod: reportRow.urun_kod || product.urun_kod || '',
      urun: row.urun || 'KONTROL',
      kategori: row.kategori || product.kategori || 'KONTROL',
      adet: qty,
      paket_koli_balya: s(rawValue(row.raw, ['paket_koli_balya', 'paket', 'koli', 'balya'])) || 'KONTROL',
      satis_kdv_haric: round(reportRow.satis_kdv_haric || net),
      satis_kdv_dahil: round(reportRow.satis_kdv_dahil || net * (1 + kdvRate / 100)),
      satis_birim_fiyat: qty ? round(net / qty) : 0,
      fifo_birim_maliyet: null,
      fifo_toplam_maliyet: null,
      nakliye: freight,
      adet_kar: null,
      toplam_kar: null,
      kar_marji: null,
      kar_orani: null,
      satis_sonrasi_stok: null,
      fifo_status: 'KONTROL',
      fifo_lotlari: [],
      created_at: row.created_at || null,
    };
  });

  const purchases = purchasesResult.rows.map(row => {
    const qty = n(row.miktar);
    const unit = n(row.alis_fiyat);
    const net = n(row.tutar) || round(qty * unit);
    const kdvRate = n(rawValue(row.raw, ['kdv', 'kdv_orani']));
    return {
      id: `purchase-${row.id}`,
      source: 'BizimHesap',
      tarih: row.tarih || '',
      tedarikci: row.tedarikci || 'KONTROL',
      fatura_no: row.belge_no || 'KONTROL',
      urun_kod: row.urun_kod || '',
      barkod: row.barkod || '',
      urun: row.urun || 'KONTROL',
      kategori: row.kategori || 'KONTROL',
      gelen_adet: qty,
      birim: row.birim || '',
      net_alis_kdv_haric: round(net),
      net_alis_kdv_dahil: round(net * (1 + kdvRate / 100)),
      toplam_alis: round(net),
      fifo_sirasi: 0,
      kalan_stok: qty,
      pdf_kanit: s(rawValue(row.raw, ['pdf', 'pdf_url', 'belge_pdf'])),
      created_at: row.created_at || null,
    };
  }).sort((a, b) => s(a.tarih).localeCompare(s(b.tarih)) || a.id.localeCompare(b.id));

  const fifoLots = new Map();
  for (const purchase of purchases) {
    const keyName = productKey(purchase.urun);
    if (!fifoLots.has(keyName)) fifoLots.set(keyName, []);
    const lots = fifoLots.get(keyName);
    purchase.fifo_sirasi = lots.length + 1;
    lots.push({
      purchase,
      remaining: purchase.gelen_adet,
      unitCost: purchase.gelen_adet ? round(purchase.net_alis_kdv_haric / purchase.gelen_adet) : 0,
    });
  }

  for (const sale of [...sales].sort((a, b) => s(a.tarih).localeCompare(s(b.tarih)) || a.id.localeCompare(b.id))) {
    const keyName = productKey(sale.urun);
    const lots = fifoLots.get(keyName) || [];
    let needed = sale.adet;
    let fifoTotal = 0;
    const consumed = [];
    for (const lot of lots) {
      if (needed <= 0) break;
      if (lot.remaining <= 0 || lot.unitCost <= 0) continue;
      const used = Math.min(needed, lot.remaining);
      lot.remaining = round(lot.remaining - used);
      needed = round(needed - used);
      fifoTotal = round(fifoTotal + used * lot.unitCost);
      consumed.push({
        purchase_id: lot.purchase.id,
        fatura_no: lot.purchase.fatura_no,
        tarih: lot.purchase.tarih,
        adet: used,
        birim_maliyet: lot.unitCost,
      });
    }
    sale.fifo_lotlari = consumed;
    if (!(sale.adet > 0 && needed === 0 && fifoTotal > 0)) continue;
    const profit = round(sale.satis_kdv_haric - fifoTotal - sale.nakliye);
    sale.fifo_birim_maliyet = round(fifoTotal / sale.adet);
    sale.fifo_toplam_maliyet = fifoTotal;
    sale.adet_kar = round(profit / sale.adet);
    sale.toplam_kar = profit;
    sale.kar_marji = sale.satis_kdv_haric ? round((profit / sale.satis_kdv_haric) * 100) : null;
    sale.kar_orani = fifoTotal ? round((profit / fifoTotal) * 100) : null;
    sale.fifo_status = 'OK';
  }
  for (const lots of fifoLots.values()) {
    for (const lot of lots) lot.purchase.kalan_stok = lot.remaining;
  }
  sales = sales.sort((a, b) => s(b.tarih).localeCompare(s(a.tarih)) || b.id.localeCompare(a.id));
  const currentStockByProduct = new Map(productRows.map(row => [productKey(row.urun), n(row.miktar)]));
  const laterSalesByProduct = new Map();
  for (const sale of sales) {
    const keyName = productKey(sale.urun);
    const laterQty = laterSalesByProduct.get(keyName) || 0;
    sale.satis_sonrasi_stok = currentStockByProduct.has(keyName)
      ? round(currentStockByProduct.get(keyName) + laterQty)
      : null;
    laterSalesByProduct.set(keyName, round(laterQty + sale.adet));
  }

  const purchaseByProduct = new Map();
  for (const row of purchases) {
    const keyName = productKey(row.urun);
    if (!purchaseByProduct.has(keyName)) purchaseByProduct.set(keyName, []);
    purchaseByProduct.get(keyName).push(row);
  }
  const salesByProduct = new Map();
  const salesByCustomer = new Map();
  for (const sale of sales) {
    const keyName = productKey(sale.urun);
    if (!salesByProduct.has(keyName)) salesByProduct.set(keyName, []);
    salesByProduct.get(keyName).push(sale);
    const customerName = norm(sale.musteri);
    if (!salesByCustomer.has(customerName)) salesByCustomer.set(customerName, []);
    salesByCustomer.get(customerName).push(sale);
  }
  const stockMovements = new Map();
  for (const row of stockResult.rows) {
    const keyName = productKey(row.urun);
    if (!stockMovements.has(keyName)) stockMovements.set(keyName, []);
    stockMovements.get(keyName).push(row);
  }

  const products = productRows.map(row => {
    const keyName = productKey(row.urun);
    const productSales = salesByProduct.get(keyName) || [];
    const productPurchases = purchaseByProduct.get(keyName) || [];
    const priceHistory = ['ekim', 'ocak', 'subat', 'nisan', 'mayis'].map(month => ({
      donem: month,
      fiyat: n(rawValue(row.raw, [`liste_${month}`, `${month}_liste`, month])),
    })).filter(item => item.fiyat > 0);
    return {
      id: `product-${row.id}`,
      source: 'BizimHesap',
      urun_kod: row.urun_kod || '',
      barkod: row.barkod || '',
      urun: row.urun || 'KONTROL',
      marka: row.marka || '',
      kategori: row.kategori || 'KONTROL',
      liste_satis_fiyati: n(row.satis_fiyat),
      alis_referans_fiyati: n(row.alis_fiyat),
      kdv: n(row.kdv),
      stok: n(row.miktar),
      birim: row.birim || '',
      depo: row.depo || '',
      raf: row.raf || '',
      etiket: row.etiket || '',
      fiyat_gecmisi: priceHistory,
      satis_sayisi: productSales.length,
      alis_sayisi: productPurchases.length,
      satislar: productSales.map(item => item.id),
      alislar: productPurchases.map(item => item.id),
      stok_hareketleri: (stockMovements.get(keyName) || []).length,
      updated_at: row.updated_at || null,
    };
  }).sort((a, b) => a.urun.localeCompare(b.urun, 'tr'));

  const customerSeed = new Map(customersResult.rows.map(row => [norm(row.cari_unvan), row]));
  for (const sale of sales) {
    if (!customerSeed.has(norm(sale.musteri))) customerSeed.set(norm(sale.musteri), { cari_unvan: sale.musteri });
  }
  const customers = [...customerSeed.values()].map((row, index) => {
    const customerSales = salesByCustomer.get(norm(row.cari_unvan)) || [];
    const knownProfits = customerSales.filter(sale => sale.toplam_kar !== null);
    const totalNet = round(customerSales.reduce((sum, sale) => sum + sale.satis_kdv_haric, 0));
    const totalProfit = knownProfits.length ? round(knownProfits.reduce((sum, sale) => sum + sale.toplam_kar, 0)) : null;
    const warnings = [];
    if (customerSales.some(sale => sale.fatura_no === 'KONTROL')) warnings.push('Eksik fatura numarasÃ„Â±');
    if (customerSales.some(sale => sale.fifo_status === 'KONTROL')) warnings.push('FIFO maliyet kanÃ„Â±tÃ„Â± eksik');
    if (customerSales.some(sale => sale.toplam_kar !== null && sale.toplam_kar < 0)) warnings.push('Zarar eden satÃ„Â±Ã…Å¸');
    return {
      id: row.id ? `customer-${row.id}` : `customer-derived-${index + 1}`,
      source: row.kaynak || 'BizimHesap',
      cari_kod: row.cari_kod || '',
      cari_unvan: row.cari_unvan || 'KONTROL',
      tip: row.tip || '',
      telefon: row.telefon || '',
      email: row.email || '',
      adres: row.adres || '',
      bakiye: n(row.bakiye),
      bakiye_tipi: row.bakiye_tipi || '',
      risk_etiketi: row.risk_etiketi || '',
      acik_siparisler: [],
      kesilen_faturalar: [...new Set(customerSales.map(item => item.fatura_no).filter(no => no && no !== 'KONTROL'))],
      sevk_bekleyenler: [],
      aldigi_urunler: [...new Set(customerSales.map(item => item.urun))],
      son_satis_fiyatlari: customerSales.slice(0, 12).map(item => ({ urun: item.urun, tarih: item.tarih, fiyat: item.satis_birim_fiyat })),
      toplam_aldigi_adet: round(customerSales.reduce((sum, sale) => sum + sale.adet, 0)),
      toplam_satis: totalNet,
      toplam_kar: totalProfit,
      ortalama_marj: knownProfits.length ? round(knownProfits.reduce((sum, sale) => sum + sale.kar_marji, 0) / knownProfits.length) : null,
      ortalama_kar_orani: knownProfits.length ? round(knownProfits.reduce((sum, sale) => sum + sale.kar_orani, 0) / knownProfits.length) : null,
      uyarilar: warnings,
      satislar: customerSales.map(item => item.id),
      updated_at: row.updated_at || null,
    };
  }).sort((a, b) => a.cari_unvan.localeCompare(b.cari_unvan, 'tr'));

  const latest = values => values.filter(Boolean).sort().at(-1) || null;
  const stock = products.map(product => ({
    product_id: product.id,
    source: 'BizimHesap',
    urun_kod: product.urun_kod,
    barkod: product.barkod,
    urun: product.urun,
    kategori: product.kategori,
    depo: product.depo,
    miktar: product.stok,
    birim: product.birim,
    alis_referans_fiyati: product.alis_referans_fiyati,
    stok_degeri_referans: round(product.stok * product.alis_referans_fiyati),
    updated_at: product.updated_at,
    giris: round((stockMovements.get(productKey(product.urun)) || [])
      .filter(row => /GIRIS/i.test(row.hareket_tipi || '')).reduce((sum, row) => sum + n(row.miktar), 0)),
    cikis: round((stockMovements.get(productKey(product.urun)) || [])
      .filter(row => /CIKIS/i.test(row.hareket_tipi || '')).reduce((sum, row) => sum + n(row.miktar), 0)),
    hareket_tarihi: latest((stockMovements.get(productKey(product.urun)) || []).map(row => row.tarih || row.created_at)),
    hareket_tipi: (stockMovements.get(productKey(product.urun)) || []).at(-1)?.hareket_tipi || 'anlik_stok',
  }));

  const issues = [];
  if (!purchases.length) issues.push('purchase_raw boÃ…Å¸: FIFO ve alÃ„Â±Ã…Å¸ geÃƒÂ§miÃ…Å¸i kesin hesaplanamaz.');
  if (sales.some(row => row.fatura_no === 'KONTROL')) issues.push('sales_raw fatura numarasÃ„Â± taÃ…Å¸Ã„Â±mÃ„Â±yor: satÃ„Â±Ã…Å¸ faturasÃ„Â± alanlarÃ„Â± KONTROL.');
  if (sales.some(row => row.fifo_status === 'KONTROL')) issues.push('SatÃ„Â±Ã…Å¸-FIFO lot eÃ…Å¸leÃ…Å¸tirmesi eksik: kÃƒÂ¢r alanÃ„Â± kesinleÃ…Å¸tirilmedi.');
  const jender = sales.filter(row => /JENDER.*XXL|XXL.*JENDER/i.test(row.urun));
  const ilkbahar = sales.filter(row => /Ã„Â°LKBAHAR|ILKBAHAR/i.test(row.musteri));
  const match = sales.filter(row => /JENDER.*XXL|XXL.*JENDER/i.test(row.urun) && /Ã„Â°LKBAHAR|ILKBAHAR/i.test(row.musteri));
  if (!match.length) issues.push('Kabul kontrolÃƒÂ¼ bekliyor: Jender XXL / Ã„Â°lkbahar Eczanesi satÃ„Â±Ã…Å¸Ã„Â± BizimHesap kaynaÃ„Å¸Ã„Â±nda bulunamadÃ„Â±.');

  const envelope = rows => ({ update_no: UPDATE_NO, source: 'BizimHesap', firma_id: FIRMA_ID, generated_at: generatedAt, rows });
  write('bizimhesap_sales.json', envelope(sales));
  write('bizimhesap_purchases.json', envelope(purchases));
  write('bizimhesap_products.json', envelope(products));
  write('bizimhesap_customers.json', envelope(customers));
  write('bizimhesap_stock.json', envelope(stock));
  write('bizimhesap_source_audit.json', {
    update_no: UPDATE_NO,
    source: 'BizimHesap',
    firma_id: FIRMA_ID,
    generated_at: generatedAt,
    last_sync_at: latest([
      latest(salesResult.rows.map(row => row.created_at)),
      latest(productRows.map(row => row.updated_at)),
      latest(purchasesResult.rows.map(row => row.created_at)),
    ]),
    counts: {
      sales: sales.length,
      purchases: purchases.length,
      products: products.length,
      customers: customers.length,
      stock: stock.length,
    },
    table_errors: {
      sales_raw: salesResult.error,
      purchase_raw: purchasesResult.error,
      product_raw: productsResult.error,
      customers: customersResult.error,
      stock_raw: stockResult.error,
    },
    acceptance: {
      jender_xxl_sales: jender.length,
      ilkbahar_sales: ilkbahar.length,
      jender_xxl_ilkbahar_matches: match.length,
    },
    rules: {
      net_kar: 'SatÃ„Â±Ã…Å¸ KDV HariÃƒÂ§ - FIFO Maliyet - Nakliye',
      kar_marji: 'KÃƒÂ¢r / SatÃ„Â±Ã…Å¸ KDV HariÃƒÂ§',
      kar_orani: 'KÃƒÂ¢r / FIFO Maliyet',
      order_close: 'Fatura no + sevk tarihi zorunlu',
      purchase_invoice: 'AlÃ„Â±Ã…Å¸ fatura no boÃ…Å¸sa KONTROL',
    },
    issues,
  });
  console.log(`Hasta bezi BizimHesap veri motoru: ${sales.length} satÃ„Â±Ã…Å¸, ${purchases.length} alÃ„Â±Ã…Å¸, ${products.length} ÃƒÂ¼rÃƒÂ¼n, ${customers.length} cari, ${stock.length} stok.`);
})().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});



