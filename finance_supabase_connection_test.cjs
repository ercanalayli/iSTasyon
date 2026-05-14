const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv() {
  if (!fs.existsSync('.env')) return;
  const lines = fs.readFileSync('.env', 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) continue;
    const idx = clean.indexOf('=');
    if (idx <= 0) continue;
    const key = clean.slice(0, idx).trim();
    const value = clean.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

async function checkTable(sb, tableName) {
  const { data, error } = await sb.from(tableName).select('*').limit(1);
  if (error) return { table: tableName, ok: false, error: error.message };
  return { table: tableName, ok: true, sample_count: Array.isArray(data) ? data.length : 0 };
}

async function main() {
  loadEnv();
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.error('SUPABASE_URL ve SUPABASE_ANON_KEY gerekli. .env veya ortam değişkeni olarak tanımla.');
    process.exit(1);
  }

  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const tables = [
    'finance_calendar_records',
    'fixed_payment_contracts',
    'variable_payment_items',
    'moka_united_movements',
    'turkiye_public_holidays',
    'finance_cashflow_summary',
    'finance_command_center_records',
    'finance_command_center_action_log',
    'finance_telegram_alarm_queue',
    'finance_command_center_today',
    'finance_command_center_late',
    'finance_command_center_alarm_candidates'
  ];

  const results = [];
  for (const table of tables) results.push(await checkTable(sb, table));

  console.table(results);
  const failed = results.filter(r => !r.ok);
  if (failed.length) {
    console.error('Supabase finans bağlantı testi başarısız. Eksik/erişilemeyen objeler:', failed.map(f => f.table).join(', '));
    process.exit(1);
  }

  console.log('Supabase finans ve komuta merkezi bağlantı testi başarılı.');
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
