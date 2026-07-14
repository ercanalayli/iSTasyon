#!/usr/bin/env node
/* Validate historical FIFO source exports before they are allowed into the live package. */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..');
const INPUT = process.env.APERION_HISTORICAL_REPORTS_DIR || path.join(process.env.USERPROFILE || '', 'Downloads', 'AperiON Tarihsel FIFO');
const OUTPUT = path.join(ROOT, 'data', 'hasta_bezi_historical_source_preflight.json');

function clean(value) { return String(value == null ? '' : value).trim(); }
function normal(value) {
  return clean(value)
    .replace(/[ıİ]/g, 'I').replace(/[şŞ]/g, 'S').replace(/[ğĞ]/g, 'G')
    .replace(/[üÜ]/g, 'U').replace(/[öÖ]/g, 'O').replace(/[çÇ]/g, 'C')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '');
}
function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  const match = clean(value).match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  return match ? new Date(Date.UTC(+match[3], +match[2] - 1, +match[1])) : null;
}
function iso(value) { return value.toISOString().slice(0, 10); }
function classify(name) {
  const value = normal(name);
  if (value.includes('DEVIR') || value.includes('ACILISSTOK') || value.includes('STOK')) return 'opening_stock';
  if (value.includes('SATIS')) return 'sales';
  if (value.includes('ALIS')) return 'purchases';
  return 'unknown';
}
function required(type) {
  if (type === 'opening_stock') return [['URUN'], ['MIKTAR', 'ADET'], ['ALISFIYATI', 'BIRIMMALIYET', 'MALIYET', 'FIYAT']];
  if (type === 'sales') return [['TARIH'], ['URUN'], ['MIKTAR', 'ADET'], ['NET', 'TUTAR', 'TOPLAM']];
  if (type === 'purchases') return [['TARIH'], ['URUN'], ['MIKTAR', 'ADET'], ['NET', 'TUTAR', 'TOPLAM', 'FIYAT']];
  return [];
}
function findHeader(rows) {
  for (let index = 0; index < Math.min(rows.length, 30); index += 1) {
    const headers = rows[index].map(normal);
    if (headers.includes('URUN') && (headers.includes('TARIH') || headers.includes('MIKTAR') || headers.includes('ADET'))) return { index, headers };
  }
  return null;
}
function inspect(file) {
  const type = classify(file);
  const workbook = XLSX.readFile(path.join(INPUT, file), { cellDates: true, raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  const header = findHeader(rows);
  const result = { file, type, sheets: workbook.SheetNames.length, rows: rows.length, valid: false, errors: [], date_range: null };
  if (!header) { result.errors.push('urun/tarih/miktar basliklari bulunamadi'); return result; }
  const missing = required(type).filter(group => !group.some(name => header.headers.includes(name)));
  if (type === 'unknown') result.errors.push('dosya adi satis, alis veya devir stok tipini belirtmiyor');
  if (missing.length) result.errors.push('zorunlu sutun eksik: ' + missing.map(group => group.join('/')).join(', '));
  const dateColumn = header.headers.indexOf('TARIH');
  if (dateColumn >= 0) {
    const dates = rows.slice(header.index + 1).map(row => parseDate(row[dateColumn])).filter(Boolean).sort((a, b) => a - b);
    if (dates.length) result.date_range = { from: iso(dates[0]), to: iso(dates[dates.length - 1]), dated_rows: dates.length };
  }
  result.valid = result.errors.length === 0;
  return result;
}

function main() {
  const files = fs.existsSync(INPUT) ? fs.readdirSync(INPUT).filter(file => /\.(xlsx|xls)$/i.test(file)) : [];
  const sources = files.map(inspect);
  const types = new Set(sources.filter(source => source.valid).map(source => source.type));
  const errors = sources.flatMap(source => source.errors.map(error => `${source.file}: ${error}`));
  const ready = types.has('sales') && types.has('purchases') && types.has('opening_stock') && errors.length === 0;
  const report = {
    created_at: new Date().toISOString(), input_directory: INPUT, ready,
    required: ['sales', 'purchases', 'opening_stock'], sources, errors,
    next_step: ready ? 'Historical sources are validated. Review the report, then build a separate import plan before changing FIFO.' : 'Add sales, purchases and opening stock exports to the input directory. No FIFO data has been changed.'
  };
  fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`RESULT: ${ready ? 'READY' : 'WAITING'} - ${sources.length} file(s) inspected; ${types.size}/3 required source types valid.`);
}

main();
