const assert = require('assert');
const { buildSimulation } = require('./build_bizimhesap_simulation_v116.cjs');

const transfer = {
  queue_id: 'q-pos-1', pending_bank_movement_id: 'p-pos-1', kind: 'bank_transfer',
  title: 'POS banka transferi', source_account: 'POS POS POS KREDI KARTI',
  target_account: '*IS BANKASI', amount: 2400, date: '2026-07-22', confidence: 100,
  evidence: { queue_status: 'ready_for_bizimhesap', confidence: 100, blockers: [], duplicate_guard: 'manuel kanit yok' },
};
const blocked = { ...transfer, queue_id: 'q-bad-1', source_account: '', evidence: { ...transfer.evidence } };
const report = buildSimulation({ company_id: 'alayli', plans: [transfer, blocked] });

assert.equal(report.summary.queue_count, 2);
assert.equal(report.summary.ready_for_user_approval, 1);
assert.equal(report.summary.blocked, 1);
assert.equal(report.summary.live_save_allowed, 0);
assert.equal(report.simulations[0].writes_to_bizimhesap, false);
assert.equal(report.simulations[0].fields.operation, 'bank_transfer');
assert.equal(report.simulations[0].fields.source_account, 'POS POS POS KREDI KARTI');
assert.equal(report.simulations[0].fields.target_account, '*IS BANKASI');
assert(report.simulations[1].blockers.some(x => x.includes('source_account')));

console.log('RESULT: OK - Gercek queue worker dry-run plani guvenli BizimHesap simulasyon raporuna donusuyor.');
