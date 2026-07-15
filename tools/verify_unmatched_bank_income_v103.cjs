const assert = require('assert');
const { classifyBankMovement } = require('./bank_posting_plan.cjs');

const unknownIncoming = classifyBankMovement({
  id: 'unknown-incoming',
  bank_name: 'VakifBank',
  transaction_date: '2026-07-15',
  amount_in: 17500,
  description: 'GELEN FAST - RAMIZ YIGIT - aciklama yok',
});
assert.equal(unknownIncoming.plan.kind, 'bank_unmatched_incoming');
assert.equal(unknownIncoming.plan.account, '*VAKIF SIRKET');
assert.equal(unknownIncoming.plan.confidence, 99);
assert.equal(unknownIncoming.plan.recording_confidence, 100);
assert.equal(unknownIncoming.plan.requires_user_review, false);
assert.match(unknownIncoming.plan.confirmation_question, /cari baglamadan/i);

const posIncoming = classifyBankMovement({
  id: 'pos-incoming',
  bank_name: 'VakifBank',
  transaction_date: '2026-07-15',
  amount_in: 46540,
  description: 'Batch Yatan POS POS KREDI KARTI',
});
assert.equal(posIncoming.plan.kind, 'bank_transfer');

const announcement = classifyBankMovement({
  id: 'bank-announcement',
  bank_name: 'Yapi Kredi',
  transaction_date: '2026-07-15',
  amount_in: 56,
  description: 'Bilgi: Saat ve Saat Halka Arz Ediliyor',
});
assert.notEqual(announcement.plan.kind, 'bank_unmatched_incoming');
assert.equal(announcement.plan.requires_user_review, true);

const bankConflict = classifyBankMovement({
  id: 'bank-conflict',
  bank_name: 'Turkiye Is Bankasi',
  transaction_date: '2026-07-15',
  amount_in: 712,
  balance_after: 41862.29,
  description: 'VAKIFBANK FAST Anlik Odeme Bilgilendirmesi',
});
assert.notEqual(bankConflict.plan.kind, 'bank_unmatched_incoming');
assert.equal(bankConflict.plan.requires_user_review, true);

console.log('RESULT: OK - unknown incoming bank movements use the non-cari Hesaba Para Girisi flow.');
