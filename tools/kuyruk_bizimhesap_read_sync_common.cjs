// Read-only BizimHesap sync queue helper.
// Prevents duplicate pending jobs and verifies that the Hermes Windows worker
// actually picks the command up. It never posts a financial transaction.
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_SUPABASE_URL = 'https://iilfwosoroflzubkaryj.supabase.co';
const ACTIVE_STATUSES = ['pending', 'processing'];
const DEDUPE_WINDOW_MS = 3 * 60 * 60 * 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function compact(value) {
  if (value == null) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.replace(/\s+/g, ' ').slice(0, 500);
}

async function queueReadSync({ command, params = null, waitSeconds = 0 }) {
  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY eksik; Hermes okuma kuyruğu oluşturulmadı.');

  const db = createClient(url, key);
  const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
  const { data: active, error: activeError } = await db
    .from('bot_commands')
    .select('id,status,created_at,result')
    .eq('command', command)
    .in('status', ACTIVE_STATUSES)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1);
  if (activeError) throw new Error(activeError.message);

  let row = active?.[0] || null;
  if (row) {
    console.log(`Mükerrer engellendi; mevcut komut izleniyor: ${row.id} | durum=${row.status}`);
  } else {
    const payload = { command, status: 'pending' };
    if (params) payload.params = params;
    const { data, error } = await db.from('bot_commands').insert(payload).select('id,status,created_at,result').single();
    if (error) throw new Error(error.message);
    row = data;
    console.log(`Kuyruğa eklendi, bot_commands id: ${row.id}`);
  }

  const waitMs = Math.max(0, Number(waitSeconds || process.env.APERION_QUEUE_WAIT_SECONDS || 0)) * 1000;
  if (!waitMs) return row;

  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    const { data, error } = await db.from('bot_commands').select('id,status,result,completed_at').eq('id', row.id).single();
    if (error) throw new Error(error.message);
    row = data;
    if (row.status === 'failed') throw new Error(`Hermes işçisi komutu başarısız tamamladı: ${compact(row.result) || row.id}`);
    if (row.status !== 'pending') {
      console.log(`Hermes işçisi komutu aldı: ${row.id} | durum=${row.status}${row.result ? ` | sonuç=${compact(row.result)}` : ''}`);
      return row;
    }
    await sleep(5000);
  }

  throw new Error(`Hermes Windows işçisi ${Math.round(waitMs / 1000)} saniye içinde komutu almadı: ${row.id}`);
}

module.exports = { queueReadSync };
