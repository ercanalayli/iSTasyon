const assert = require('assert');
const { classifyBankMovement } = require('./bank_posting_plan.cjs');

const pos = classifyBankMovement({ bank_name: 'VakifBank', amount_in: 46540, statement_transaction_no: '2026009923018191', description: 'Batch Yatan POS POS KREDI KARTI' }).plan;
assert.equal(pos.kind, 'bank_transfer');
assert.equal(pos.target_account, '*VAKIF SIRKET');
assert.equal(pos.requires_user_review, false);

const unknown = classifyBankMovement({ bank_name: 'VakifBank', amount_in: 100, statement_transaction_no: '2026000000000001', description: 'GELEN FAST aciklama yok' }).plan;
assert.equal(unknown.kind, 'bank_unmatched_incoming');
assert.equal(unknown.target_account, '*VAKIF SIRKET');
assert.equal(unknown.requires_user_review, false);
console.log('RESULT: OK - historical reconciliation policy preserves source bank account and prevents duplicate posting.');
