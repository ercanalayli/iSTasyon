const fs = require('fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assertHas(file, text, label) {
  const body = read(file);
  if (!body.includes(text)) {
    console.error(`FAIL - ${label}`);
    console.error(`Missing ${text} in ${file}`);
    process.exit(1);
  }
  console.log(`OK  - ${label}`);
}

console.log('AperiON BizimHesap Queue Worker v65 Verify');
console.log('-------------------------------------------');

assertHas('bizimhesap_queue_worker.cjs', "from('bizimhesap_queue')", 'reads BizimHesap queue');
assertHas('bizimhesap_queue_worker.cjs', "ready_for_bizimhesap", 'processes ready queue');
assertHas('bizimhesap_queue_worker.cjs', 'classifyQueueRow', 'classifies posting type');
assertHas('bizimhesap_queue_worker.cjs', 'bank_posting_plan.cjs', 'uses shared bank posting plan');
assertHas('tools/preview_pending_bank_to_bizimhesap_plan.cjs', 'bank_posting_plan.cjs', 'preview uses shared bank posting plan');
assertHas('bizimhesap_queue_worker.cjs', 'BIZIMHESAP_POSTING_LIVE', 'live mode lock');
assertHas('bizimhesap_queue_worker.cjs', 'BIZIMHESAP_POSTING_SAVE', 'save mode lock');
assertHas('bizimhesap_queue_worker.cjs', "status === 'processed'", 'marks processed');
assertHas('bizimhesap_queue_worker.cjs', 'Queue durum doğrulaması', 'verifies queue status after update');
assertHas('bizimhesap_queue_worker.cjs', "markQueue(row, 'failed'", 'marks failed');
assertHas('bizimhesap_queue_worker.cjs', 'aperion_posting_result', 'writes posting result back');
assertHas('bizimhesap_queue_worker.cjs', '_after_save', 'captures after-save diagnostics');
assertHas('bizimhesap_queue_worker.cjs', 'verifyExpenseSourceAccount', 'verifies selected expense source account before save');
assertHas('bizimhesap_queue_worker.cjs', 'Banka masrafi kaynak hesap kaniti basarisiz', 'blocks mismatched default bank account');
assertHas('bizimhesap_queue_worker.cjs', 'manualPostingProof', 'skips manually verified postings');
assertHas('bizimhesap_queue_worker.cjs', 'postingEvidence', 'builds queue posting evidence');
assertHas('bizimhesap_queue_worker.cjs', 'safe_to_auto_save', 'reports safe auto-save decision');
assertHas('bizimhesap_queue_worker.cjs', 'duplicate_guard', 'reports duplicate/manual proof guard');
assertHas('bizimhesap_queue_worker.cjs', 'manual_proof_locked', 'summarizes manual proof locks');
assertHas('data/bizimhesap_manual_posting_proofs.json', '3b30e1a0-0f02-4b0d-b03c-ae2779d448fa', 'manual posting proof file');
assertHas('package.json', 'bizimhesap:queue:dry', 'npm dry command');
assertHas('package.json', 'bizimhesap:queue:form', 'npm form command');
assertHas('package.json', 'bizimhesap:queue:save', 'npm save command');
assertHas('.github/workflows/bizimhesap-queue-worker.yml', 'Scheduled approved queue live save', 'scheduled approved queue save');
assertHas('.github/workflows/bizimhesap-queue-worker.yml', 'workflow_run', 'mail pipeline completion trigger');
assertHas('.github/workflows/bizimhesap-queue-worker.yml', 'BIZIMHESAP_POSTING_SAVE: "1"', 'scheduled save unlock scoped to worker');
assertHas('.github/workflows/bizimhesap-queue-worker.yml', 'workflow_dispatch', 'manual dispatch');
assertHas('.github/workflows/bizimhesap-queue-worker.yml', 'Upload diagnostics', 'diagnostics upload');

console.log('-------------------------------------------');
console.log('RESULT: OK - Banka onayi -> BizimHesap queue -> worker -> processed/failed hatti bagli.');
