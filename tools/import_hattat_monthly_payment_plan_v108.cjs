if (process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const root = path.resolve(__dirname, '..');
const REQUIRED_CONFIRM = 'ONAYLIYORUM';

function valueArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function hasArg(name) { return process.argv.includes(name); }
function writeJson(file, data) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`); }

function dbRow(item) {
  return {
    company: item.company, item_date: item.item_date, original_due_date: item.original_due_date,
    effective_due_date: item.effective_due_date, item_type: item.item_type, direction: item.direction,
    title: item.title, description: item.description, cari_name: item.cari_name, category: item.category,
    expected_amount: item.expected_amount, collected_amount: 0, status: 'open', priority: item.priority,
    fixed_or_variable: item.fixed_or_variable, source_type: item.source_type, source_table: item.source_table,
    source_id: item.source_id, plan_type: item.plan_type, scope: item.scope,
    note: `Kaynak: ${item.source_file}; referans: ${item.source_reference}; Hattat PDF tahakkuk listesi.`,
  };
}

async function main() {
  const planFile = valueArg('plan', path.join(root, 'finance_imports', 'hattat', 'hattat_monthly_payment_plan.json'));
  const outputFile = valueArg('out', path.join(root, 'finance_imports', 'hattat', 'hattat_monthly_payment_import_proof.json'));
  const commit = hasArg('--commit');
  if (!fs.existsSync(planFile)) throw new Error(`Plan bulunamadÄ±: ${planFile}`);
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  if (plan.source !== 'hattat_musavir_monthly_payment_list' || !Array.isArray(plan.finance_calendar_items)) throw new Error('GeÃ§erli Hattat Ã¶deme planÄ± bulunamadÄ±.');
  const rows = plan.finance_calendar_items.map(dbRow);
  const result = { created_at: new Date().toISOString(), source: plan.source, mode: commit ? 'commit_requested' : 'dry_run', plan_file: planFile, summary: { planned: rows.length, existing: 0, inserted: 0, total: Number(rows.reduce((sum, row) => sum + row.expected_amount, 0).toFixed(2)) } };
  if (!commit) {
    result.message = 'CanlÄ± yazma yapÄ±lmadÄ±. Bu satÄ±rlar tahakkuk/beklenen Ã¶deme olarak planlandÄ±; --commit --confirm=ONAYLIYORUM olmadan Supabase yazÄ±lmaz.';
    result.sample = rows.slice(0, 5); writeJson(outputFile, result);
    console.log(`Dry-run: ${rows.length} Hattat Ã¶deme planÄ±; canlÄ± insert yapÄ±lmadÄ±.`); console.log('SONUC: BASARILI'); return;
  }
  if (valueArg('confirm') !== REQUIRED_CONFIRM) throw new Error('CanlÄ± import iÃ§in --confirm=ONAYLIYORUM zorunlu.');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
  const db = createClient(url, key, { auth: { persistSession: false } });
  const ids = rows.map((row) => row.source_id);
  const { data: existing, error: existingError } = await db.from('finance_calendar_items').select('source_id').eq('company', 'ALAYLI').eq('source_type', 'hattat_pdf').eq('source_table', 'monthly_payment_list').in('source_id', ids);
  if (existingError) throw new Error(`Mevcut kayÄ±t kontrolÃ¼ baÅŸarÄ±sÄ±z: ${existingError.message}`);
  const seen = new Set((existing || []).map((row) => Number(row.source_id)));
  const insertable = rows.filter((row) => !seen.has(Number(row.source_id)));
  result.summary.existing = seen.size;
  if (insertable.length) {
    const { data, error } = await db.from('finance_calendar_items').insert(insertable).select('id, source_id, title, expected_amount, original_due_date');
    if (error) throw new Error(`Finans Takvimi yazÄ±mÄ± baÅŸarÄ±sÄ±z: ${error.message}`);
    result.summary.inserted = (data || []).length; result.inserted = data || [];
  }
  result.message = 'Hattat Ã¶deme tahakkuklarÄ± Finans Takvimiâ€™ne eklendi. Ã–deme durumu banka mutabakatÄ± ile ayrÄ±ca kapanÄ±r.';
  writeJson(outputFile, result);
  console.log(`Hattat import: mevcut ${result.summary.existing}; eklenen ${result.summary.inserted}`); console.log('SONUC: BASARILI');
}

main().catch((error) => { console.error('SONUC: BASARISIZ'); console.error(error.message || error); process.exitCode = 1; });

