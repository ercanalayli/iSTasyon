const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const confirm = process.argv.includes('--apply');

async function main() {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY gerekli.');
  if (!confirm) throw new Error('Semayi uygulamak icin --apply gerekli.');

  const sqlPath = path.join(__dirname, '..', 'automation', 'sql', '007_confirm_pending_bank_counterparty.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await db.rpc('exec_sql', { sql_text: sql });
  if (error) throw new Error(`Supabase sema kurulumu basarisiz: ${error.message}`);
  console.log('RESULT: pending_bank_movements confirmed_counterparty semasi ve onay kuyrugu fonksiyonu guncellendi.');
}

main().catch(error => { console.error(error.message || error); process.exitCode = 1; });
