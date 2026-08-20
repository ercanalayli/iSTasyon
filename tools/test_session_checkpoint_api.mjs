import assert from 'node:assert/strict';
import { authorized, containsSecret, normalizeCheckpoint } from '../functions/api/session-checkpoint.js';

const secret = 'a'.repeat(40);
assert.equal(await authorized(new Request('https://example.test', { headers: { authorization: `Bearer ${secret}` } }), { APERION_BRIDGE_SECRET: secret }), true);
assert.equal(await authorized(new Request('https://example.test', { headers: { authorization: `Bearer ${'b'.repeat(40)}` } }), { APERION_BRIDGE_SECRET: secret }), false);
assert.equal(containsSecret({ summary: 'OTP: 123456' }), true);
assert.equal(containsSecret({ summary: 'Kar-Dağ sipariş arşivi hazırlandı.' }), false);

const normalized = normalizeCheckpoint({
  checkpoint_key: 'aperion-20260820-memory',
  summary: 'Hafıza motoru kuruldu.',
  completed: ['Checkpoint API'],
  pending: ['Canlı dağıtım'],
  blockers: [],
  next_action: 'Testleri çalıştır',
  evidence_refs: ['git:working-tree'],
});
assert.equal(normalized.checkpointKey, 'aperion-20260820-memory');
assert.deepEqual(normalized.completed, ['Checkpoint API']);
assert.throws(() => normalizeCheckpoint({ checkpoint_key: 'x', summary: 'Şifre: gizli' }), /secret_material_rejected/);
assert.throws(() => normalizeCheckpoint({ checkpoint_key: 'x' }), /summary_required/);

console.log('RESULT: OK');
console.log('Constant-work secret comparison: OK');
console.log('Secret material rejection: OK');
console.log('Bounded structured checkpoint: OK');
