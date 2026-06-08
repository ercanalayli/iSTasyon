const { createClient } = require('@supabase/supabase-js');

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REFRESH_TOKEN',
];

function maskState(name) {
  const value = process.env[name];
  return value ? `OK ${name} len=${value.length}` : `MISS ${name}`;
}

async function tableCheck(db, name) {
  const { data, error, count } = await db.from(name).select('*', { count: 'exact' }).limit(1);
  return { name, ok: !error, detail: error ? error.message : `${count ?? 0} rows`, sample: data?.length || 0 };
}

async function rpcCheck(db, name, payload) {
  const { error, data } = await db.rpc(name, payload);
  const benign = error && /schema cache|function .* does not exist|Could not find/i.test(error.message || '');
  return { name, ok: !error || !benign, detail: error ? error.message : 'callable', data };
}

async function main() {
  console.log('AperiON Mail Ekstre GitHub Actions Check');
  console.log('Secret state');
  required.concat(['GDRIVE_EKSTRE_FOLDER_ID']).forEach(k => console.log(maskState(k)));

  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.log(`RESULT: BLOCKED missing secrets: ${missing.join(', ')}`);
    process.exitCode = 2;
    return;
  }

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const tables = [];
  for (const table of ['pending_bank_movements', 'bizimhesap_queue', 'bank_transactions', 'bizimhesap_posting_queue']) {
    tables.push(await tableCheck(db, table));
  }
  console.log('Supabase objects');
  tables.forEach(t => console.log(`${t.ok ? 'OK' : 'MISS'} table ${t.name}: ${t.detail}`));

  const ingest = await rpcCheck(db, 'ingest_mail_bank_movements', { p_rows: [] });
  const approve = await rpcCheck(db, 'approve_pending_bank_movement', { p_id: '00000000-0000-0000-0000-000000000000', p_note: 'preflight' });
  console.log(`${ingest.ok ? 'OK' : 'MISS'} rpc ingest_mail_bank_movements: ${ingest.detail}`);
  console.log(`${approve.ok ? 'OK' : 'MISS'} rpc approve_pending_bank_movement: ${approve.detail}`);

  const mailSqlOk = tables.find(t => t.name === 'pending_bank_movements')?.ok &&
    tables.find(t => t.name === 'bizimhesap_queue')?.ok &&
    ingest.ok;
  console.log(`MAIL_SQL_READY=${mailSqlOk ? '1' : '0'}`);
  if (!mailSqlOk) process.exitCode = 3;
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
