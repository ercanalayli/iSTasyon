const { createClient } = require('@supabase/supabase-js');
const { classifyBankMovement } = require('./bank_posting_plan.cjs');

const id = process.argv[2] || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!id) throw new Error('Queue kimligi gerekli.');
if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY gerekli.');

const db = createClient(process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co', key, { auth: { persistSession: false } });
(async () => {
  const { data: current, error: readError } = await db.from('bizimhesap_queue')
    .select('id,status,payload').eq('id', id).single();
  if (readError) throw new Error(readError.message);
  if (current.status !== 'failed') throw new Error(`Kuyruk yeniden denemeye uygun degil: ${current.status}`);
  const payload = current.payload || {};
  const forPlan = { ...payload };
  delete forPlan.target_account;
  delete forPlan.source_account;
  delete forPlan.suggested_bizimhesap_action;
  const plan = classifyBankMovement(forPlan).plan;
  const nextPayload = {
    ...payload,
    target_account: plan.target_account,
    source_account: plan.source_account,
    target_counterparty: plan.counterparty,
    suggested_category: plan.category,
    suggested_bizimhesap_action: plan.kind,
    confidence_score: plan.confidence,
  };
  const { data, error } = await db.from('bizimhesap_queue')
    .update({ status: 'ready_for_bizimhesap', error_message: null, payload: nextPayload })
    .eq('id', id).select('id,status').single();
  if (error) throw new Error(error.message);
  console.log(`RESULT: QUEUE_RETRIED ${data.id} ${data.status}`);
})().catch(error => { console.error(error.message || error); process.exitCode = 1; });
