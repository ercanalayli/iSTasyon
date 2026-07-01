require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const root = path.resolve(__dirname, '..');
const REQUIRED_CONFIRM = 'ONAYLIYORUM';

function valueArg(name, fallback = '') {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function hasArg(name) {
  return args.includes(name);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, body) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

function toDbRow(item) {
  return {
    company: item.company || 'ALAYLI',
    item_date: item.item_date,
    original_due_date: item.original_due_date,
    effective_due_date: item.effective_due_date || item.original_due_date || item.item_date,
    item_type: 'receivable',
    direction: 'in',
    title: item.title,
    description: item.description,
    cari_name: item.cari_name || 'DealerStatement / Pazaryeri',
    category: item.category || 'Gelecek tahsilat',
    expected_amount: Number(item.expected_amount || 0),
    collected_amount: 0,
    status: 'open',
    priority: 'normal',
    fixed_or_variable: 'variable',
    source_type: item.source_type || 'excel',
    source_table: item.source_table || 'dealer_statement',
    source_id: Number(item.source_id),
    plan_type: item.plan_type || 'forecast',
    scope: item.scope || 'business',
    note: item.note || null,
  };
}

function assertPlan(plan) {
  if (!plan || plan.source !== 'dealer_statement') throw new Error('Plan dosyasi dealer_statement formunda degil.');
  if (!Array.isArray(plan.finance_calendar_items)) throw new Error('Plan icinde finance_calendar_items yok.');
  for (const item of plan.finance_calendar_items) {
    if (!item.source_id) throw new Error('source_id eksik kayit var.');
    if (!item.original_due_date) throw new Error(`Odeme tarihi eksik: ${item.source_id}`);
    if (!(Number(item.expected_amount) > 0)) throw new Error(`Tutar gecersiz: ${item.source_id}`);
  }
}

async function existingSourceIds(db, rows) {
  const sourceIds = rows.map((row) => row.source_id).filter(Number.isFinite);
  if (!sourceIds.length) return new Set();
  const company = rows[0]?.company || 'ALAYLI';
  const { data, error } = await db
    .from('finance_calendar_items')
    .select('source_id')
    .eq('company', company)
    .eq('source_type', 'excel')
    .eq('source_table', 'dealer_statement')
    .in('source_id', sourceIds);
  if (error) throw new Error(`Mevcut kayit kontrolu basarisiz: ${error.message}`);
  return new Set((data || []).map((row) => Number(row.source_id)));
}

async function main() {
  const planFile = valueArg('--plan', path.join(root, 'data', 'dealer_statement_finance_calendar_plan.json'));
  const outputFile = valueArg('--out', path.join(root, 'data', 'dealer_statement_finance_calendar_import_proof.json'));
  const commit = hasArg('--commit');
  const confirm = valueArg('--confirm', '');

  if (!fs.existsSync(planFile)) {
    throw new Error(`Plan dosyasi bulunamadi: ${planFile}. Once npm run finance-calendar:dealer-statement calistir.`);
  }

  const plan = readJson(planFile);
  assertPlan(plan);
  const rows = plan.finance_calendar_items.map(toDbRow);

  const result = {
    created_at: new Date().toISOString(),
    source: 'dealer_statement',
    plan_file: planFile,
    commit_requested: commit,
    live_insert_called: false,
    summary: {
      plan_count: rows.length,
      plan_total: Number(rows.reduce((sum, row) => sum + Number(row.expected_amount || 0), 0).toFixed(2)),
      existing_count: null,
      insertable_count: null,
      inserted_count: 0,
    },
  };

  if (!commit) {
    result.mode = 'dry_run';
    result.message = 'Canli insert yapilmadi. Insert icin --commit --confirm ONAYLIYORUM gerekli.';
    result.sample = rows.slice(0, 5);
    writeJson(outputFile, result);
    console.log('DealerStatement Finans Takvimi import dry-run');
    console.log(`Plan kaydi: ${rows.length}`);
    console.log(`Toplam: TL ${result.summary.plan_total.toLocaleString('tr-TR')}`);
    console.log('Canli insert yapilmadi.');
    console.log(`Cikti: ${outputFile}`);
    console.log('SONUC: BASARILI');
    return;
  }

  if (confirm !== REQUIRED_CONFIRM) {
    throw new Error(`Canli insert icin --confirm ${REQUIRED_CONFIRM} gerekli. Insert yapilmadi.`);
  }

  const { url, key } = supabaseConfig();
  if (!url || !key) throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY gerekli.');
  const db = createClient(url, key, { auth: { persistSession: false } });

  const existing = await existingSourceIds(db, rows);
  const insertable = rows.filter((row) => !existing.has(Number(row.source_id)));
  result.summary.existing_count = existing.size;
  result.summary.insertable_count = insertable.length;

  if (insertable.length) {
    const { data, error } = await db
      .from('finance_calendar_items')
      .insert(insertable)
      .select('id, source_id, expected_amount, original_due_date');
    if (error) throw new Error(`Canli insert basarisiz: ${error.message}`);
    result.live_insert_called = true;
    result.summary.inserted_count = (data || []).length;
    result.inserted = data || [];
  } else {
    result.live_insert_called = true;
    result.inserted = [];
  }

  result.mode = 'commit';
  result.message = insertable.length ? 'Yeni DealerStatement tahsilatlari Finans Takvimi kaydina eklendi.' : 'Yeni eklenecek kayit yok; tum source_id kayitlari zaten mevcut.';
  writeJson(outputFile, result);

  console.log('DealerStatement Finans Takvimi import');
  console.log(`Plan kaydi: ${rows.length}`);
  console.log(`Mevcut: ${existing.size}`);
  console.log(`Eklenen: ${result.summary.inserted_count}`);
  console.log(`Cikti: ${outputFile}`);
  console.log('SONUC: BASARILI');
}

main().catch((error) => {
  console.error('SONUC: BASARISIZ');
  console.error(error.message || error);
  process.exitCode = 1;
});
