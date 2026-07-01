const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const root = path.resolve(__dirname, '..');

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function keyOf(row, candidates) {
  const keys = Object.keys(row);
  return keys.find((key) => candidates.some((candidate) => key.toLowerCase().includes(candidate.toLowerCase())));
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseMoney(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value / 100 : value;
  }
  const text = String(value).trim();
  if (!text) return 0;
  const normalized = text.includes(',')
    ? text.replace(/\./g, '').replace(',', '.')
    : text.replace(/[^\d.-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function monthKey(isoDate) {
  return isoDate ? isoDate.slice(0, 7) : 'unknown';
}

function buildInsertSql(items) {
  const values = items.map((item) => {
    const esc = (value) => String(value ?? '').replace(/'/g, "''");
    return `select '${esc(item.company)}'::text as company, '${esc(item.item_date)}'::date as item_date, '${esc(item.original_due_date)}'::date as original_due_date, '${esc(item.effective_due_date)}'::date as effective_due_date, '${esc(item.title)}'::text as title, '${esc(item.description)}'::text as description, '${esc(item.cari_name)}'::text as cari_name, '${esc(item.category)}'::text as category, ${Number(item.expected_amount).toFixed(2)}::numeric as expected_amount, '${esc(item.source_type)}'::text as source_type, '${esc(item.source_table)}'::text as source_table, ${Number(item.source_id)}::bigint as source_id, '${esc(item.note)}'::text as note`;
  }).join('\nunion all\n');

  return `-- DealerStatement gelecek tahsilat planlari\n-- Not: source_table/source_id ile mukerrer engeli uygulanir.\nwith incoming as (\n${values}\n)\ninsert into finance_calendar_items (\n  company, item_date, original_due_date, effective_due_date,\n  item_type, direction, title, description, cari_name, category,\n  expected_amount, collected_amount, status, priority, fixed_or_variable,\n  source_type, source_table, source_id, plan_type, scope, note\n)\nselect\n  i.company, i.item_date, i.original_due_date, i.effective_due_date,\n  'receivable', 'in', i.title, i.description, i.cari_name, i.category,\n  i.expected_amount, 0, 'open', 'normal', 'variable',\n  i.source_type, i.source_table, i.source_id, 'forecast', 'business', i.note\nfrom incoming i\nwhere not exists (\n  select 1\n  from finance_calendar_items f\n  where f.company = i.company\n    and f.source_type = i.source_type\n    and f.source_table = i.source_table\n    and f.source_id = i.source_id\n);\n`;
}

function main() {
  const input = argValue('file', path.join(process.env.USERPROFILE || '', 'Downloads', 'DealerStatement (3).xls'));
  const asOf = argValue('as-of', new Date().toISOString().slice(0, 10));
  const company = argValue('company', 'ALAYLI');
  const out = argValue('out', path.join(root, 'data', 'dealer_statement_finance_calendar_plan.json'));

  if (!fs.existsSync(input)) {
    throw new Error(`DealerStatement dosyasi bulunamadi: ${input}`);
  }

  const workbook = XLSX.readFile(input, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const first = rows[0] || {};
  const idKey = keyOf(first, ['Bayi Ekstre ID']);
  const qtyKey = keyOf(first, ['Satış Adedi', 'Satis Adedi']);
  const amountKey = keyOf(first, ['Satış Tutarı', 'Satis Tutari']);
  const startKey = keyOf(first, ['Başlang', 'Baslang']);
  const endKey = keyOf(first, ['Bitiş', 'Bitis']);
  const paymentKey = keyOf(first, ['Ödeme Tarihi', 'Odeme Tarihi', 'deme Tarihi']);
  const statusKey = keyOf(first, ['Durum']);
  const commissionKey = keyOf(first, ['Komisyon']);
  const paidKey = keyOf(first, ['Yatırılan', 'Yatirilan']);

  const required = { idKey, qtyKey, amountKey, startKey, endKey, paymentKey, statusKey };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    throw new Error(`DealerStatement kolonlari eksik: ${missing.join(', ')}`);
  }

  const seen = new Set();
  const normalized = rows.map((row) => {
    const sourceId = Number(row[idKey]);
    const salesAmount = parseMoney(row[amountKey]);
    const commissionAmount = parseMoney(row[commissionKey]);
    const paidAmount = parseMoney(row[paidKey]);
    const expectedAmount = Math.max(salesAmount - commissionAmount, 0);
    const item = {
      source_id: sourceId,
      sales_qty: Number(row[qtyKey] || 0),
      sales_amount: salesAmount,
      commission_amount: commissionAmount,
      paid_amount: paidAmount,
      expected_amount: expectedAmount,
      statement_start_date: parseDate(row[startKey]),
      statement_end_date: parseDate(row[endKey]),
      payment_date: parseDate(row[paymentKey]),
      status: String(row[statusKey] || '').trim(),
      duplicate_in_file: seen.has(sourceId),
    };
    seen.add(sourceId);
    return item;
  });

  const futureActive = normalized
    .filter((row) => row.payment_date && row.payment_date >= asOf && /^aktif$/i.test(row.status) && !row.duplicate_in_file);
  const needsReview = futureActive
    .filter((row) => !(row.expected_amount > 0))
    .map((row) => ({
      source_id: row.source_id,
      payment_date: row.payment_date,
      sales_amount: row.sales_amount,
      paid_amount: row.paid_amount,
      reason: 'Gelecek tarihli aktif kayit ama satis/expected tutari 0; otomatik butce tahsilati yapilmaz.',
    }));

  const candidates = futureActive
    .filter((row) => row.expected_amount > 0)
    .map((row) => ({
      company,
      item_date: row.statement_end_date || row.statement_start_date || row.payment_date,
      original_due_date: row.payment_date,
      effective_due_date: row.payment_date,
      item_type: 'receivable',
      direction: 'in',
      title: `Bayi ekstre tahsilati ${row.source_id}`,
      description: `DealerStatement ${row.statement_start_date || '-'} / ${row.statement_end_date || '-'} donemi`,
      cari_name: 'DealerStatement / Pazaryeri',
      category: 'Gelecek tahsilat',
      expected_amount: Number(row.expected_amount.toFixed(2)),
      source_type: 'excel',
      source_table: 'dealer_statement',
      source_id: row.source_id,
      plan_type: 'forecast',
      scope: 'business',
      note: `Satis adedi: ${row.sales_qty}; satis tutari: ${row.sales_amount.toFixed(2)}; komisyon: ${row.commission_amount.toFixed(2)}; yatirilan: ${row.paid_amount.toFixed(2)}`,
    }));

  const byMonth = {};
  for (const item of candidates) {
    const key = monthKey(item.original_due_date);
    byMonth[key] ||= { count: 0, expected_amount: 0 };
    byMonth[key].count += 1;
    byMonth[key].expected_amount += item.expected_amount;
  }

  const result = {
    created_at: new Date().toISOString(),
    source: 'dealer_statement',
    input_file: input,
    as_of: asOf,
    company,
    summary: {
      total_rows: rows.length,
      future_receivable_count: candidates.length,
      future_receivable_total: Number(candidates.reduce((sum, row) => sum + row.expected_amount, 0).toFixed(2)),
      duplicate_rows_in_file: normalized.filter((row) => row.duplicate_in_file).length,
      needs_review_count: needsReview.length,
      months: Object.fromEntries(Object.entries(byMonth).map(([key, value]) => [key, {
        count: value.count,
        expected_amount: Number(value.expected_amount.toFixed(2)),
      }])),
    },
    finance_calendar_items: candidates,
    needs_review: needsReview,
    sql_preview: candidates.length ? buildInsertSql(candidates) : '',
  };

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);

  console.log('DealerStatement -> Finans Takvimi plan');
  console.log(`Dosya: ${input}`);
  console.log(`Satir: ${rows.length}`);
  console.log(`Gelecek tahsilat: ${candidates.length}`);
  console.log(`Toplam: TL ${result.summary.future_receivable_total.toLocaleString('tr-TR')}`);
  console.log(`Cikti: ${out}`);
  console.log('SONUC: BASARILI');
}

try {
  main();
} catch (error) {
  console.error('SONUC: BASARISIZ');
  console.error(error.message || error);
  process.exit(1);
}
