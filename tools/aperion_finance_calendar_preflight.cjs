const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const root = path.resolve(__dirname, '..');
loadEnv(path.join(root, '.env'));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const i = trimmed.indexOf('=');
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

async function existsObject(name) {
  const { error } = await db.from(name).select('*').limit(1);
  return { name, ok: !error, error: error?.message || null };
}

async function countRange(table, column, from, to) {
  const { count, error } = await db.from(table).select('*', { count: 'exact', head: true }).gte(column, from).lte(column, to);
  return { table, column, count: count || 0, error: error?.message || null };
}

async function main() {
  const required = [
    'finance_calendar_items',
    'finance_calendar_holidays',
    'fixed_payment_contracts',
    'finance_calendar_action_log',
    'finance_calendar_drawer_view',
    'finance_calendar_summary_view',
  ];
  const checks = [];
  for (const name of required) checks.push(await existsObject(name));

  const missing = checks.filter(x => !x.ok);
  console.log('AperiON finans takvimi canlı ön kontrol');
  console.log('--------------------------------------');
  for (const c of checks) console.log(`${c.ok ? 'OK ' : 'YOK'} ${c.name}${c.error ? ' - ' + c.error : ''}`);

  if (missing.length) {
    console.log('');
    console.log('RESULT: FAILED - Haziran tahakkukları için finans takvimi Supabase kurulumu eksik.');
    console.log('Kurulum dosyası üret: npm run finance-calendar:build-install');
    console.log('Sonra Supabase SQL Editor içinde finance/AperiON_Finance_Calendar_FULL_INSTALL_v58.sql çalıştır.');
    process.exit(1);
  }

  const june = await countRange('finance_calendar_drawer_view', 'calendar_date', '2026-06-01', '2026-06-30');
  console.log('');
  console.log(`Haziran finans takvimi görünen kayıt: ${june.error ? june.error : june.count}`);
  if (june.error || june.count === 0) {
    console.log('RESULT: WARNING - Kurulum var ama Haziran tahakkuk kaydı yok.');
    process.exitCode = 2;
    return;
  }
  console.log('RESULT: OK - Finans takvimi canlı ve Haziran kaydı var.');
}

main().catch(error => {
  console.error('RESULT: FAILED');
  console.error(error.message || error);
  process.exit(1);
});
