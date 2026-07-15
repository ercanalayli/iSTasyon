const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { classifyBankMovement } = require('./bank_posting_plan.cjs');

const args = process.argv.slice(2);
const commit = args.includes('--commit');
const confirm = valueArg('--confirm', '');
const requestedDate = valueArg('--date', 'latest');
const output = valueArg('--out', 'data/unmatched_bank_income_daily_queue_v104.json');
const company = valueArg('--firma', process.env.COMPANY_ID || 'alayli');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

function valueArg(name, fallback = '') {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function write(body) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
}

async function main() {
  if (!SUPABASE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY gerekli.');
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data: rows, error } = await db.from('pending_bank_movements')
    .select('*')
    .eq('company_id', company)
    .in('status', ['pending', 'needs_review'])
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(250);
  if (error) throw new Error(`pending_bank_movements okunamadi: ${error.message}`);

  const candidates = (rows || []).map(row => ({ row, classified: classifyBankMovement(row) }))
    .filter(({ classified }) => classified.plan.kind === 'bank_unmatched_incoming' && !classified.plan.requires_user_review);
  const latestDate = candidates.map(x => x.classified.transaction_date).filter(Boolean).sort().at(-1) || '';
  const selectedDate = requestedDate === 'latest' ? latestDate : requestedDate;
  const selected = candidates.filter(x => x.classified.transaction_date === selectedDate);
  const report = {
    created_at: new Date().toISOString(),
    company_id: company,
    requested_date: requestedDate,
    selected_date: selectedDate,
    dry_run: !commit,
    policy: 'Belirsiz gelen para, gercek banka hesabinda Hesaba Para Girisi olarak; cari/tedarikci bakiyesini etkilemeden kaydedilir.',
    candidates: selected.map(({ row, classified }) => ({
      pending_bank_movement_id: row.id,
      duplicate_key: row.duplicate_key || '',
      date: classified.transaction_date,
      time: classified.transaction_time,
      bank: classified.bank_name,
      account: classified.plan.account,
      amount: classified.plan.amount,
      counterparty: classified.plan.counterparty,
      description: classified.description,
      recording_confidence: classified.plan.recording_confidence,
    })),
    queued: [],
  };
  if (!commit) {
    write(report);
    console.log(`RESULT: DRY - ${selected.length} aday, tarih ${selectedDate || '-'}`);
    return;
  }
  if (confirm !== 'BANKA_GIRISI_ONAYLIYORUM') {
    throw new Error('Canli gunluk para girisi kuyrugu icin --confirm BANKA_GIRISI_ONAYLIYORUM gerekli.');
  }
  for (const item of selected) {
    const { data: existing, error: existingError } = await db.from('bizimhesap_queue')
      .select('id,status')
      .eq('company_id', company)
      .eq('pending_bank_movement_id', item.row.id)
      .limit(1);
    if (existingError) throw new Error(`Kuyruk kontrolu okunamadi: ${existingError.message}`);
    if (existing?.[0]) {
      report.queued.push({ pending_bank_movement_id: item.row.id, queue_id: existing[0].id, status: existing[0].status, action: 'already_queued' });
      continue;
    }
    const { data: queueId, error: rpcError } = await db.rpc('approve_pending_bank_movement', {
      p_id: item.row.id,
      p_note: 'AperiON gunluk belirsiz banka girisi: cari baglamadan Hesaba Para Girisi',
    });
    if (rpcError || !queueId) throw new Error(`Kuyruk olusturulamadi (${item.row.id}): ${rpcError?.message || 'queue id yok'}`);
    report.queued.push({ pending_bank_movement_id: item.row.id, queue_id: queueId, status: 'ready_for_bizimhesap', action: 'queued' });
  }
  write(report);
  console.log(`RESULT: QUEUED - ${report.queued.length} aday, tarih ${selectedDate}`);
  for (const row of report.queued) console.log(`QUEUE: ${row.queue_id} ${row.action}`);
}

main().catch(error => { console.error(error.message || error); process.exitCode = 1; });
