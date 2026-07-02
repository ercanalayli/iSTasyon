const fs = require('fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function ok(label, condition) {
  if (!condition) {
    console.error(`ERR ${label}`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK  ${label}`);
}

const body = read('tools/approve_bank_candidate_v70.cjs');
const proofBody = read('tools/check_bank_candidate_queue_proof_v71.cjs');
const statusBody = read('tools/build_bank_approval_status_v76.cjs');
const workflowBody = read('.github/workflows/bank-approval-status.yml');
const pkg = JSON.parse(read('package.json'));

ok('approval tool exists', body.includes('approve_pending_bank_movement'));
ok('requires explicit id', body.includes("if (!ID) throw new Error('--id zorunlu"));
ok('requires Turkish confirmation', body.includes("const REQUIRED_CONFIRM = 'ONAYLIYORUM'"));
ok('dry check does not call RPC', body.includes('RPC calistirilmadi'));
ok('candidate safety check exists', body.includes('assertCandidateSafe(candidate)'));
ok('low risk guard exists', body.includes("candidate.risk_class !== 'low'"));
ok('confidence guard exists', body.includes('Number(candidate.confidence || 0) < 84'));
ok('queue proof output exists', body.includes('banka_onay_kuyruk_kaniti.json'));
ok('queue proof auto-selects candidate report', proofBody.includes("data/banka_onay_guvenli_adaylar.json"));
ok('queue proof has no hardcoded pending id fallback', !proofBody.includes("9b91f984-c94b-4005-92ab-7fb334aa31e7"));
ok('dry npm command exists', pkg.scripts['bank:approval:candidate:dry'] === 'npm run bank:approval:candidates && node tools/approve_bank_candidate_v70.cjs --dry-check');
ok('live npm command exists', pkg.scripts['bank:approval:approve-selected'] === 'node tools/approve_bank_candidate_v70.cjs');
ok('proof npm command refreshes candidates first', pkg.scripts['bank:approval:candidate:proof'] === 'npm run bank:approval:candidates && node tools/check_bank_candidate_queue_proof_v71.cjs');
ok('status npm command exists', pkg.scripts['bank:approval:status'] === 'npm run bank:approval:candidate:dry && npm run bank:approval:candidate:proof && npm run bizimhesap:queue:dry && node tools/build_bank_approval_status_v76.cjs');
ok('status report stays dry', statusBody.includes('live_rpc_called: false') && statusBody.includes('live_bizimhesap_save_called: false'));
ok('status report names exact approval text', statusBody.includes('required_user_approval_text'));
ok('status workflow exists', workflowBody.includes('AperiON Bank Approval Status'));
ok('status workflow is read-only build', workflowBody.includes('npm run bank:approval:status') && !workflowBody.includes('approve_pending_bank_movement'));
ok('status workflow commits only status snapshot', workflowBody.includes('git add data/aperion_bank_approval_status.json'));

if (process.exitCode) {
  console.error('Bank candidate approval guard verification failed.');
  process.exit(process.exitCode);
}

console.log('Bank candidate approval guard verification passed.');
