const assert = require('assert');
const { attachSimulation } = require('./attach_bizimhesap_simulation_to_approval_v117.cjs');

const unified = {
  selected_candidate: { pending_bank_movement_id: 'p-pos-1' },
  safe_to_post: false,
};
const simulation = {
  source: 'bizimhesap_queue_worker dry-run',
  created_at: '2026-07-24T00:00:00Z',
  summary: { queue_count: 2, ready_for_user_approval: 1, blocked: 1 },
  simulations: [
    { pending_bank_movement_id: 'p-pos-1', queue_id: 'q-pos-1', ready_for_user_approval: true, writes_to_bizimhesap: false },
    { pending_bank_movement_id: 'p-bad-1', queue_id: 'q-bad-1', ready_for_user_approval: false, blockers: ['target_account'] },
  ],
};
const result = attachSimulation(unified, simulation);

assert.equal(result.safe_to_post, false);
assert.equal(result.approval_center_simulation.live_save_allowed, false);
assert.equal(result.approval_center_simulation.writes_to_bizimhesap, false);
assert.equal(result.approval_center_simulation.queue_count, 2);
assert.equal(result.approval_center_simulation.selected.queue_id, 'q-pos-1');
assert.equal(result.approval_center_simulation.simulations[1].blockers[0], 'target_account');
console.log('RESULT: OK - Gerçek BizimHesap dry-run simülasyonu AperiON Onay Merkezi birleşik durumuna bağlandı.');
