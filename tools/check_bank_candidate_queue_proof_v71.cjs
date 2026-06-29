require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const ID = valueArg('--id', '9b91f984-c94b-4005-92ab-7fb334aa31e7');
const out = valueArg('--out', 'data/banka_onay_aday_kanit_durumu.json');
const company = valueArg('--firma', 'alayli');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';

function valueArg(name, fallback = '') {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function writeJson(file, body) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(body, null, 2), 'utf8');
}

function amount(row) {
  const amountIn = Number(row?.amount_in || 0);
  const amountOut = Number(row?.amount_out || 0);
  return amountIn > 0 ? amountIn : -Math.abs(amountOut);
}

function queueStatus(queue) {
  if (!queue) return 'queue_yok';
  return queue.status || queue.durum || 'queue_var_durum_belirsiz';
}

async function main() {
  if (!ID) throw new Error('--id zorunlu');
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  const { data: pendingRows, error: pendingError } = await db
    .from('pending_bank_movements')
    .select('*')
    .eq('company_id', company)
    .eq('id', ID)
    .limit(1);
  if (pendingError) throw new Error(`pending_bank_movements okunamadi: ${pendingError.message}`);
  const pending = (pendingRows || [])[0] || null;

  const { data: queueRows, error: queueError } = await db
    .from('bizimhesap_queue')
    .select('*')
    .eq('company_id', company)
    .eq('pending_bank_movement_id', ID)
    .order('created_at', { ascending: false })
    .limit(10);
  if (queueError) throw new Error(`bizimhesap_queue okunamadi: ${queueError.message}`);

  const latestQueue = (queueRows || [])[0] || null;
  const proof = {
    created_at: new Date().toISOString(),
    safe_mode: true,
    mutation: false,
    company_id: company,
    pending_bank_movement_id: ID,
    pending_found: !!pending,
    pending_status: pending?.status || null,
    pending_summary: pending ? {
      bank_name: pending.bank_name,
      transaction_date: pending.transaction_date,
      transaction_time: pending.transaction_time,
      amount: amount(pending),
      balance_after: pending.balance_after,
      description: pending.description,
      detected_type: pending.detected_type,
      suggested_counterparty: pending.suggested_counterparty,
      confidence_score: pending.confidence_score,
    } : null,
    queue_count: (queueRows || []).length,
    queue_status: queueStatus(latestQueue),
    latest_queue_id: latestQueue?.id || null,
    latest_queue: latestQueue,
    next_step: latestQueue
      ? 'Worker dry-run ile plan oku; canli kayit icin ayrica kullanici onayi gerekir.'
      : 'Kullanici onayi gelirse approve_bank_candidate_v70.cjs ile sadece bu ID kuyruga alinir.',
  };

  writeJson(out, proof);
  console.log('AperiON banka aday kanit durumu');
  console.log(`Pending ID: ${ID}`);
  console.log(`Pending bulundu: ${proof.pending_found ? 'evet' : 'hayir'}`);
  console.log(`Pending durum: ${proof.pending_status || '-'}`);
  if (proof.pending_summary) {
    console.log(`${proof.pending_summary.transaction_date} ${proof.pending_summary.bank_name} ${proof.pending_summary.amount} TL`);
  }
  console.log(`Queue count: ${proof.queue_count}`);
  console.log(`Queue status: ${proof.queue_status}`);
  console.log(`Output: ${out}`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
