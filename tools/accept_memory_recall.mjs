import assert from 'node:assert/strict';
import { memoryRequest } from './lib/memory_transport.mjs';

const cases = [
  { question: 'AI-0646 neydi?', check: r => r.data.document_no === 'AI-0646' && r.data.amount === 50 && r.data.category === 'MARKET' && r.data.payment_account === 'Ercan Nakit Kasa' && r.data.duplicate === false },
  { question: 'Çay giderlerini nereye kaydediyoruz?', check: r => r.data.category === 'MARKET' && r.provenance.some(p => p.source_ref.includes('user-correction')) },
  { question: 'Bu bilgiyi nereden biliyorsun?', check: r => r.provenance.some(p => p.verification_status === 'read_back_verified') && r.provenance.some(p => p.source_ref.includes('user-correction')) },
  { question: "16 Eylül 2026'da ilk gerçek Computer Use BizimHesap işlemi neydi?", check: r => r.data.document_no === 'AI-0646' && r.data.amount === 50 },
];

const results = [];
for (const entry of cases) {
  const r = await memoryRequest(`/v1/recall?q=${encodeURIComponent(entry.question)}`);
  assert.equal(r.found, true, `Recall missing: ${entry.question}`);
  assert.ok(r.provenance.length > 0, `Provenance missing: ${entry.question}`);
  assert.ok(entry.check(r), `Recall mismatch: ${entry.question}`);
  results.push({ question: entry.question, answer: r.answer, provenance: r.provenance, object_key: r.object_key, answer_hash: r.answer_hash });
}

for (const r of results) {
  const acceptance = await memoryRequest('/v1/recall', { method: 'POST', body: { question: r.question, answer_hash: r.answer_hash } });
  assert.equal(acceptance.durable_memory_verified, true);
}

console.log(JSON.stringify({ ok: true, new_context_process: true, retrieval_passed: results.length, retrieval_total: cases.length,
  results: results.map(({ question, answer, provenance }) => ({ question, answer, provenance })), financialWrites: 0, bizimHesapWrites: 0, secretsExposed: 0 }));
