const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { classifyBankMovement } = require('./bank_posting_plan.cjs');

const root = path.resolve(__dirname, '..');
const rules = JSON.parse(fs.readFileSync(path.join(root, 'config', 'aperion_finance_rules.json'), 'utf8'));
assert(Array.isArray(rules.related_parties_need_confirmation), 'related party rule list missing');
assert(rules.related_parties_need_confirmation.includes('ERCAN ALAYLI'), 'ERCAN ALAYLI confirmation rule missing');

const incomingOwner = classifyBankMovement({
  id: 'test-ercan-income',
  bank_name: 'Akbank',
  transaction_date: '2026-07-10',
  amount_in: 17500,
  description: '16:52:20 Para Gonder Diger GELEN FAST - ERCAN ALAYLI tarafindan aktarilan',
});

assert.equal(incomingOwner.plan.kind, 'customer_collection');
assert.match(incomingOwner.plan.counterparty, /ERCAN ALAYLI/);
assert.equal(incomingOwner.plan.requires_counterparty_confirmation, true);
assert.equal(incomingOwner.plan.requires_user_review, true);
assert.match(incomingOwner.plan.confirmation_question, /tahsilat/i);
assert.equal(incomingOwner.plan.business_scope, 'sirket_finansi');

const confirmedOwner = classifyBankMovement({
  id: 'test-ercan-confirmed',
  bank_name: 'Akbank',
  transaction_date: '2026-07-10',
  amount_in: 17500,
  user_confirmed_counterparty: 'ERCAN ALAYLI',
  counterparty_confirmed: true,
  confidence_score: 90,
  description: 'GELEN FAST ERCAN ALAYLI',
});

assert.equal(confirmedOwner.plan.requires_counterparty_confirmation, false);
assert.equal(confirmedOwner.plan.requires_user_review, false);

const personalSchool = classifyBankMovement({
  id: 'test-personal-school',
  bank_name: 'Yapi Kredi',
  transaction_date: '2026-07-10',
  amount_out: 25000,
  confidence_score: 90,
  description: 'Cocuk okul ucreti ozel okul odemesi',
});

assert.equal(personalSchool.plan.business_scope, 'kisisel_veya_sirket_disi_inceleme');
assert.equal(personalSchool.plan.requires_user_review, true);
assert.match(personalSchool.plan.confirmation_question, /sirket kaydi mi/i);

const bankFee = classifyBankMovement({
  id: 'test-bank-fee',
  bank_name: 'Akbank',
  transaction_date: '2026-07-10',
  amount_out: 8.37,
  description: 'Banka masrafi BSMV elektronik fon transferi ucreti',
});

assert.equal(bankFee.plan.kind, 'bank_fee_expense');
assert.equal(bankFee.plan.fixed_variable, 'sabit');
assert.equal(bankFee.plan.requires_user_review, false);

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const counterpartySql = fs.readFileSync(path.join(root, 'automation', 'sql', '007_confirm_pending_bank_counterparty.sql'), 'utf8');
assert(index.includes('bankPersonalOrReviewScope'), 'home scope helper missing');
assert(index.includes('bankFixedVariable'), 'home fixed/variable helper missing');
assert(index.includes('bankNeedsCounterpartyConfirmation'), 'home counterparty confirmation helper missing');
assert(index.includes('confirmationQuestion'), 'home confirmation question missing');
assert(index.includes('bankCariDogrula'), 'home counterparty confirmation action missing');
assert(index.includes('confirm_pending_bank_counterparty'), 'home counterparty confirmation RPC missing');
assert(/confirmed_counterparty/i.test(counterpartySql), 'counterparty SQL does not persist confirmed counterparty');
assert(/counterparty_confirmed/i.test(counterpartySql), 'counterparty SQL proof flag missing');
assert(/target_counterparty.*confirmed_counterparty/is.test(counterpartySql), 'queue payload does not use confirmed counterparty');

console.log('Finance decision rules v84 verification passed.');
