import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const company = process.env.COMPANY_ID || 'alayli';

if (!url || !key) {
  console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli');
  process.exit(1);
}

const sb = createClient(url, key);

async function count(table, filterFn) {
  let q = sb.from(table).select('*', { count: 'exact', head: true });
  q = filterFn ? filterFn(q) : q;
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

async function samplePending() {
  const { data, error } = await sb
    .from('pending_bank_movements')
    .select('id,bank_name,transaction_date,transaction_time,description,amount_in,amount_out,detected_type,status,confidence_score')
    .eq('company_id', company)
    .in('status', ['pending', 'needs_review'])
    .order('transaction_date', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data || [];
}

async function main() {
  const pending = await count('pending_bank_movements', q => q.eq('company_id', company).in('status', ['pending', 'needs_review']));
  const approved = await count('pending_bank_movements', q => q.eq('company_id', company).eq('status', 'approved'));
  const rejected = await count('pending_bank_movements', q => q.eq('company_id', company).eq('status', 'rejected'));
  const queueReady = await count('bizimhesap_queue', q => q.eq('company_id', company).eq('status', 'ready_for_bizimhesap'));
  const queueProcessed = await count('bizimhesap_queue', q => q.eq('company_id', company).eq('status', 'processed'));
  const latest = await samplePending();

  const report = {
    run_at: new Date().toISOString(),
    company_id: company,
    pending_bank_movements: pending,
    approved_bank_movements: approved,
    rejected_bank_movements: rejected,
    bizimhesap_ready_queue: queueReady,
    bizimhesap_processed_queue: queueProcessed,
    latest_pending: latest,
    test_gate: {
      pending_to_approval_center: pending >= 0,
      one_click_to_queue: queueReady >= 0,
      next_required: 'Gmail OAuth ile mailden otomatik ekstre alma testini kapat'
    }
  };

  await fs.mkdir('automation/logs', { recursive: true });
  await fs.writeFile(`automation/logs/onay-monitor-${Date.now()}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
