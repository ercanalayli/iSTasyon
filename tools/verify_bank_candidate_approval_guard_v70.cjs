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
const pkg = JSON.parse(read('package.json'));

ok('approval tool exists', body.includes('approve_pending_bank_movement'));
ok('requires explicit id', body.includes("if (!ID) throw new Error('--id zorunlu"));
ok('requires Turkish confirmation', body.includes("const REQUIRED_CONFIRM = 'ONAYLIYORUM'"));
ok('dry check does not call RPC', body.includes('RPC calistirilmadi'));
ok('candidate safety check exists', body.includes('assertCandidateSafe(candidate)'));
ok('low risk guard exists', body.includes("candidate.risk_class !== 'low'"));
ok('confidence guard exists', body.includes('Number(candidate.confidence || 0) < 84'));
ok('queue proof output exists', body.includes('banka_onay_kuyruk_kaniti.json'));
ok('dry npm command exists', pkg.scripts['bank:approval:candidate:dry'] === 'npm run bank:approval:candidates && node tools/approve_bank_candidate_v70.cjs --dry-check');
ok('live npm command exists', pkg.scripts['bank:approval:approve-selected'] === 'node tools/approve_bank_candidate_v70.cjs');

if (process.exitCode) {
  console.error('Bank candidate approval guard verification failed.');
  process.exit(process.exitCode);
}

console.log('Bank candidate approval guard verification passed.');
