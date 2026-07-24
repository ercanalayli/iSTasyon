const fs = require('fs');
const path = require('path');

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Dry-run dosyasi bulunamadi: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function simulatePlan(plan = {}) {
  const evidence = plan.evidence || {};
  const blockers = [...new Set([...(evidence.blockers || []), plan.stopReason].filter(Boolean))];
  const fields = {
    company_id: plan.company_id || 'alayli',
    operation: plan.kind || '',
    source_account: plan.source_account || '',
    target_account: plan.target_account || plan.account || '',
    counterparty: plan.counterparty || '',
    category: plan.category || '',
    transaction_date: plan.date || '',
    amount: Number(plan.amount || 0),
    description: `APERION QUEUE:${plan.queue_id || ''} | ${plan.title || ''} | ${plan.description || ''}`.slice(0, 300),
  };
  const missing = [];
  if (!fields.operation) missing.push('operation');
  if (!fields.transaction_date) missing.push('transaction_date');
  if (!(fields.amount > 0)) missing.push('amount');
  if (fields.operation === 'bank_transfer' && !fields.source_account) missing.push('source_account');
  if (!fields.target_account) missing.push('target_account');
  if (missing.length) blockers.push(`eksik alanlar: ${missing.join(', ')}`);
  if (!plan.queue_id) blockers.push('queue_id yok');

  return {
    simulation_id: `bizimhesap:${plan.queue_id || 'missing'}`,
    queue_id: plan.queue_id || '',
    pending_bank_movement_id: plan.pending_bank_movement_id || '',
    mode: 'dry_run',
    writes_to_bizimhesap: false,
    fields,
    evidence: {
      queue_status: evidence.queue_status || '',
      confidence: Number(evidence.confidence ?? plan.confidence ?? 0),
      duplicate_guard: evidence.duplicate_guard || '',
      reasons: plan.reasons || [],
    },
    blockers,
    ready_for_user_approval: blockers.length === 0,
    live_save_allowed: false,
    steps: plan.steps || [],
  };
}

function buildSimulation(dryRun = {}) {
  const plans = Array.isArray(dryRun.plans) ? dryRun.plans : [];
  const simulations = plans.map(plan => simulatePlan({ ...plan, company_id: dryRun.company_id }));
  return {
    created_at: new Date().toISOString(),
    source: 'bizimhesap_queue_worker dry-run',
    source_created_at: dryRun.created_at || null,
    company_id: dryRun.company_id || 'alayli',
    policy: 'Bu rapor BizimHesap worker planinin on izlemesidir; canli kayit yapmaz.',
    summary: {
      queue_count: simulations.length,
      ready_for_user_approval: simulations.filter(x => x.ready_for_user_approval).length,
      blocked: simulations.filter(x => !x.ready_for_user_approval).length,
      live_save_allowed: 0,
    },
    simulations,
  };
}

if (require.main === module) {
  const input = process.argv[2] || 'data/bizimhesap_queue_dryrun.json';
  const output = process.argv[3] || 'data/bizimhesap_simulation.json';
  const report = buildSimulation(readJson(input));
  writeJson(output, report);
  console.log(`BizimHesap simülasyonu: ${report.summary.queue_count} kayıt, ${report.summary.blocked} blokaj, canlı yazma: 0`);
  console.log(`Output: ${output}`);
}

module.exports = { simulatePlan, buildSimulation };
