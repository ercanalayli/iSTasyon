#!/usr/bin/env node
/*
 * Builds a source proof for the Hasta Bezi/FIFO dashboard.
 * Raw Excel rows stay local: the Pages artifact only contains aggregates.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..');
const DOWNLOADS = process.env.APERION_REPORTS_DIR || path.join(process.env.USERPROFILE || '', 'Downloads');
const OUTPUT = path.join(ROOT, 'data', 'hasta_bezi_kaynak_denetimi.json');
const PUBLIC_OUTPUT = path.join(ROOT, 'hasta-bezi', 'fifo_chunks', 'source_audit.json');

function die(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function findReport(kind) {
  const expectedNumber = kind === 'sales' ? '(24).xlsx' : '(5).xlsx';
  const prefix = kind === 'sales' ? 'SAT' : 'ALI';
  const found = fs.readdirSync(DOWNLOADS).filter((name) => {
    const upper = String(name).toUpperCase();
    return upper.startsWith(prefix) && upper.endsWith(expectedNumber.toUpperCase());
  }).sort((a, b) => fs.statSync(path.join(DOWNLOADS, b)).size - fs.statSync(path.join(DOWNLOADS, a)).size)[0];
  if (!found) die(`${kind} report was not found in ${DOWNLOADS}`);
  return path.join(DOWNLOADS, found);
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function normalize(value) {
  return clean(value)
    .replace(/[ıİ]/g, 'I')
    .replace(/[şŞ]/g, 'S')
    .replace(/[ğĞ]/g, 'G')
    .replace(/[üÜ]/g, 'U')
    .replace(/[öÖ]/g, 'O')
    .replace(/[çÇ]/g, 'C')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function toDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  const text = clean(value);
  const tr = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (tr) return new Date(Date.UTC(+tr[3], +tr[2] - 1, +tr[1]));
  const date = new Date(text);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function iso(date) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function number(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = clean(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readReport(file, type) {
  const book = XLSX.readFile(file, { cellDates: true, raw: true });
  const sheet = book.Sheets[book.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  const headers = rows[2] || [];
  const columns = {};
  headers.forEach((header, index) => { columns[normalize(header)] = index; });
  const required = type === 'sales'
    ? ['TARIH', 'URUN', 'KATEGORI', 'MIKTAR', 'NET']
    : ['TARIH', 'URUN', 'KATEGORI', 'MIKTAR', 'NET'];
  required.forEach((key) => { if (columns[key] == null) die(`${path.basename(file)} is missing ${key}`); });

  const category = new Map();
  const product = new Map();
  let minDate = null;
  let maxDate = null;
  let accepted = 0;
  let totalNet = 0;
  let totalQuantity = 0;
  let datedRows = 0;

  for (const row of rows.slice(3)) {
    const date = toDate(row[columns.TARIH]);
    const qty = number(row[columns.MIKTAR]);
    const net = number(row[columns.NET]);
    const item = clean(row[columns.URUN]) || 'TANIMSIZ URUN';
    const categoryName = clean(row[columns.KATEGORI]) || 'KATEGORISIZ';
    if (date) {
      datedRows += 1;
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
    }
    if (!date || !item || (!qty && !net)) continue;
    accepted += 1;
    totalNet += net;
    totalQuantity += qty;
    const categoryMetric = category.get(categoryName) || { name: categoryName, rows: 0, quantity: 0, net: 0 };
    categoryMetric.rows += 1;
    categoryMetric.quantity += qty;
    categoryMetric.net += net;
    category.set(categoryName, categoryMetric);
    const productMetric = product.get(item) || { name: item, category: categoryName, rows: 0, quantity: 0, net: 0 };
    productMetric.rows += 1;
    productMetric.quantity += qty;
    productMetric.net += net;
    product.set(item, productMetric);
  }

  const top = (items) => [...items.values()]
    .sort((a, b) => b.net - a.net || b.quantity - a.quantity || a.name.localeCompare(b.name, 'tr'))
    .slice(0, 20)
    .map((item) => ({ ...item, net: Math.round(item.net * 100) / 100, quantity: Math.round(item.quantity * 100) / 100 }));

  return {
    file: path.basename(file),
    sha256: hashFile(file),
    sheet: book.SheetNames[0],
    source_row_count: Math.max(rows.length - 3, 0),
    accepted_row_count: accepted,
    dated_row_count: datedRows,
    date_range: { from: iso(minDate), to: iso(maxDate) },
    totals: { net: Math.round(totalNet * 100) / 100, quantity: Math.round(totalQuantity * 100) / 100 },
    top_categories: top(category),
    top_products: top(product),
    distinct_category_count: category.size,
    distinct_product_count: product.size
  };
}

const salesFile = findReport('sales');
const purchaseFile = findReport('purchase');
const sales = readReport(salesFile, 'sales');
const purchases = readReport(purchaseFile, 'purchase');
const manifestFile = path.join(ROOT, 'hasta-bezi', 'fifo_chunks', 'manifest.json');
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : null;

const audit = {
  schema_version: 1,
  created_at: new Date().toISOString(),
  timezone: 'Europe/Istanbul',
  purpose: 'Hasta Bezi dashboard source evidence; raw customer, supplier and invoice rows remain local.',
  source_system: 'BizimHesap exported reports',
  reports: { sales, purchases },
  fifo_package_check: manifest ? {
    build: manifest.build || null,
    summary_count: manifest.summaryCount || 0,
    movement_count: manifest.moveCount || 0,
    sales_count: manifest.salesCount || 0,
    warning_count: manifest.warningCount || 0,
    sales_line_match: Number(manifest.salesCount || 0) === sales.accepted_row_count,
    expected_movement_count: sales.accepted_row_count + purchases.accepted_row_count,
    movement_line_match: Number(manifest.moveCount || 0) === sales.accepted_row_count + purchases.accepted_row_count
  } : { status: 'manifest_missing' },
  next_refresh: 'Re-export both reports from BizimHesap, run npm run hasta-bezi:source-audit, then rebuild the FIFO package only after the audit passes.'
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
const publicAudit = {
  schema_version: audit.schema_version,
  created_at: audit.created_at,
  timezone: audit.timezone,
  source_system: audit.source_system,
  reports: {
    sales: { source_file_label: 'BizimHesap Sales Report 24', source_row_count: sales.source_row_count, accepted_row_count: sales.accepted_row_count, date_range: sales.date_range, totals: sales.totals, distinct_category_count: sales.distinct_category_count, distinct_product_count: sales.distinct_product_count },
    purchases: { source_file_label: 'BizimHesap Purchase Report 5', source_row_count: purchases.source_row_count, accepted_row_count: purchases.accepted_row_count, date_range: purchases.date_range, totals: purchases.totals, distinct_category_count: purchases.distinct_category_count, distinct_product_count: purchases.distinct_product_count }
  },
  fifo_package_check: audit.fifo_package_check
};
fs.writeFileSync(PUBLIC_OUTPUT, `${JSON.stringify(publicAudit, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  result: 'OK',
  sales: { rows: sales.accepted_row_count, from: sales.date_range.from, to: sales.date_range.to },
  purchases: { rows: purchases.accepted_row_count, from: purchases.date_range.from, to: purchases.date_range.to },
  fifo_package_check: audit.fifo_package_check
}, null, 2));
