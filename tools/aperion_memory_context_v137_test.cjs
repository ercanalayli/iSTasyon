const assert = require('assert');
const fixtures = require('../test_data/aperion_reference_resolution_tr_v137.json');
const { classifyMemoryCandidate, resolveReference, assembleContext } = require('./aperion_memory_context_v137.cjs');

const state = {
  now: '2026-08-14T09:00:00+03:00',
  activeEntityRef: 'party-laboral',
  activeRole: 'supplier',
  objectives: [
    { objectiveKey: 'objective-aperion-memory', title: 'AperiON hafıza motoru', status: 'active' },
    { objectiveKey: 'objective-old', title: 'Eski tamamlanmış proje', status: 'completed' }
  ],
  workItems: [
    { workKey: 'work-memory-implementation', objectiveKey: 'objective-aperion-memory', title: 'Hafıza bağlam motorunu uygula', status: 'in_progress', updatedAt: '2026-08-14T08:55:00+03:00', nextAction: 'Türkçe testleri çalıştır' },
    { workKey: 'work-old', objectiveKey: 'objective-old', title: 'Eski işi bitir', status: 'completed', updatedAt: '2026-08-14T08:59:00+03:00' }
  ],
  entities: [
    { entityRef: 'party-laboral', name: 'LABORAL TIBBİ ÜRÜNLER', aliases: ['Laboral', 'LABORAL TIBBİ ÜRÜNLER'] }
  ],
  memories: [
    { memoryKey: 'memory-freight-july', statement: 'Temmuz ayı nakliye fiyatı 4.500 TL idi', occurredAt: '2026-07-15', status: 'active', entityRef: 'party-laboral' },
    { memoryKey: 'memory-stale', statement: 'Nakliye fiyatı 3.000 TL', occurredAt: '2025-01-01', validUntil: '2025-12-31', status: 'active' }
  ]
};

for (const fixture of fixtures) {
  const result = resolveReference(fixture.input, state);
  for (const key of ['expectedWorkKey', 'expectedEntityRef', 'expectedRole', 'expectedMemoryKey', 'expectedObjectiveKey']) {
    if (fixture[key] !== undefined) {
      const actualKey = key.replace(/^expected/, '').replace(/^./, (c) => c.toLowerCase());
      assert.strictEqual(result[actualKey], fixture[key], `${fixture.name}: ${actualKey}`);
    }
  }
}

assert.strictEqual(classifyMemoryCandidate('OTP: 123456').reason, 'secret_material');
assert.strictEqual(classifyMemoryCandidate('Şifre: gizli123').reason, 'secret_material');
assert.strictEqual(classifyMemoryCandidate('Finansal işlem onaysız yapılmaz').memoryType, 'business_rule');
assert.strictEqual(classifyMemoryCandidate('Cari LABORAL TIBBİ ÜRÜNLER tedarikçi olarak kullanılır').memoryType, 'entity_fact');
assert.strictEqual(classifyMemoryCandidate('Bugün hava güzel').decision, 'do_not_promote');

const assembled = assembleContext({
  threadKey: 'thread-test', input: 'devam et', state,
  recentTurns: Array.from({ length: 12 }, (_, i) => ({ turnKey: `turn-${i}`, content: `mesaj ${i}` })),
  rules: [{ ruleKey: 'rule-approval', text: 'Onay gerekli' }],
  evidence: [{ evidenceRef: 'evidence-1' }], tokenBudget: 500
});
assert(assembled.manifest.recentTurnRefs.length <= 8);
assert(assembled.manifest.memoryRefs.includes('memory-freight-july'));
assert(assembled.manifest.evidenceRefs.includes('evidence-1'));

console.log(`AperiON Turkish reference resolution: ${fixtures.length}/${fixtures.length} PASSED`);
console.log('Memory secret rejection and bounded context assembly: PASSED');

