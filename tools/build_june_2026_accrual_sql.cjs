const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'finance');
const outPath = path.join(outDir, 'AperiON_June_2026_Accruals_FROM_LIVE_v58.sql');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const COMPANY = 'ALAYLI';
const FIRM = 'alayli';
const FROM = '2026-06-01';
const TO = '2026-06-30';

function sqlText(v) {
  return String(v || '').replace(/'/g, "''");
}

function money(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function buildInsert(row) {
  return `insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, source_table, source_id, note
)
select
  '${COMPANY}', '${row.date}', '${row.date}', finance_next_business_day('${row.date}'::date),
  '${row.type}', '${row.direction}',
  '${sqlText(row.title)}', '${sqlText(row.description)}', '${sqlText(row.cari || '')}', '${sqlText(row.account || '')}', '${sqlText(row.category || '')}',
  ${money(row.amount)}::numeric, 'open', '${row.priority || 'normal'}', '${row.fixed || 'variable'}', '${row.sourceType}', '${row.sourceTable}', ${row.sourceId || 'null'}, '${sqlText(row.note || '')}'
where not exists (
  select 1 from finance_calendar_items
  where company='${COMPANY}'
    and item_date='${row.date}'
    and title='${sqlText(row.title)}'
    and expected_amount=${money(row.amount)}::numeric
);`;
}

async function getSalesAccruals() {
  const { data, error } = await db.from('sales_raw')
    .select('id,tarih,ciro,adet')
    .eq('firma_id', FIRM)
    .gte('tarih', FROM)
    .lte('tarih', TO)
    .limit(20000);
  if (error) throw error;
  const byDate = new Map();
  for (const r of data || []) {
    const d = String(r.tarih || '').slice(0, 10);
    if (!d) continue;
    const cur = byDate.get(d) || { amount: 0, adet: 0, rows: 0, minId: r.id };
    cur.amount += Number(r.ciro || 0);
    cur.adet += Number(r.adet || 0);
    cur.rows += 1;
    cur.minId = Math.min(cur.minId || r.id, r.id || cur.minId || 0);
    byDate.set(d, cur);
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({
    date,
    type: 'receivable',
    direction: 'in',
    title: `Haziran satış tahakkuku ${date}`,
    description: `${v.rows} satış satırı, ${v.adet} adet. Kaynak: sales_raw.`,
    cari: 'Satış müşterileri',
    account: 'Cari Alacak',
    category: 'Satış Tahakkuku',
    amount: v.amount,
    sourceType: 'sales_raw',
    sourceTable: 'sales_raw',
    sourceId: v.minId || 'null',
    priority: 'normal',
    note: 'Otomatik üretilen Haziran tahakkuk adayı; onaydan önce kontrol edilir.',
  })).filter(r => r.amount > 0);
}

async function getExpenseAccruals() {
  const { data, error } = await db.from('masraf_raw')
    .select('id,tarih,kategori,aciklama,tutar')
    .eq('firma_id', FIRM)
    .gte('tarih', FROM)
    .lte('tarih', TO)
    .limit(5000);
  if (error) throw error;
  return (data || []).map(r => ({
    date: String(r.tarih || '').slice(0, 10),
    type: 'variable_expense',
    direction: 'out',
    title: `Haziran gider tahakkuku ${r.kategori || 'Gider'} ${String(r.tarih || '').slice(0, 10)}`,
    description: r.aciklama || r.kategori || 'BizimHesap gider kaydı',
    cari: r.kategori || 'Gider',
    account: 'Gider Tahakkuku',
    category: r.kategori || 'Gider',
    amount: r.tutar,
    sourceType: 'masraf_raw',
    sourceTable: 'masraf_raw',
    sourceId: r.id || 'null',
    priority: 'normal',
    note: 'BizimHesap masraf ham verisinden Haziran gider tahakkuku.',
  })).filter(r => r.date && r.amount > 0);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const rows = [...await getSalesAccruals(), ...await getExpenseAccruals()];
  const totalIn = rows.filter(r => r.direction === 'in').reduce((s, r) => s + money(r.amount), 0);
  const totalOut = rows.filter(r => r.direction === 'out').reduce((s, r) => s + money(r.amount), 0);
  const sql = [
    '-- AperiON June 2026 Accruals FROM LIVE v58',
    '-- Kaynak: sales_raw ve masraf_raw. Mevcut veriyi silmez; ayni tarih+baslik+tutar varsa tekrar eklemez.',
    '-- Once finance/AperiON_Finance_Calendar_FULL_INSTALL_v58.sql kurulmus olmalidir.',
    `-- Uretim: ${new Date().toISOString()}`,
    `-- Kayit: ${rows.length}, Satis tahakkuk: ${money(totalIn)}, Gider tahakkuk: ${money(totalOut)}`,
    '',
    ...rows.map(buildInsert),
    '',
    "select * from finance_calendar_drawer_view where company='ALAYLI' and calendar_date between '2026-06-01' and '2026-06-30' order by calendar_date, id;",
    '',
  ].join('\n\n');
  fs.writeFileSync(outPath, sql, 'utf8');
  console.log(`OK: ${outPath}`);
  console.log(`rows=${rows.length} sales_accrual=${money(totalIn)} expense_accrual=${money(totalOut)}`);
}

main().catch(error => {
  console.error('RESULT: FAILED');
  console.error(error.message || error);
  process.exit(1);
});
