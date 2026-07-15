const assert = require('assert');
const { buildDailyReview } = require('./build_daily_bank_review_v89.cjs');
const { formatDailyBankReview } = require('../telegram/aperion_daily_bank_review_digest_v89.cjs');

const rows = [
  { id: 'new-cari', company_id: 'alayli', transaction_date: '2026-07-13', transaction_time: '11:20', bank_name: 'Akbank', description: 'GELEN EFT ERCAN ALAYLI tarafindan aktarilan', amount_in: 17300, amount_out: 0, confidence_score: 72, status: 'pending' },
  { id: 'old-fee', company_id: 'alayli', transaction_date: '2026-07-12', transaction_time: '10:00', bank_name: 'Akbank', description: 'EFT UCRETI', amount_in: 0, amount_out: 8.37, confidence_score: 92, status: 'pending' },
  { id: 'new-fee', company_id: 'alayli', transaction_date: '2026-07-13', transaction_time: '12:00', bank_name: 'Is Bankasi', description: 'BSMV EFT UCRETI', amount_in: 0, amount_out: 0.8, confidence_score: 92, status: 'pending' },
  { id: 'vakif-pos', company_id: 'alayli', transaction_date: '2026-07-13', transaction_time: '07:13', bank_name: 'VakifBank', description: 'Batch Yatan 130000000001605 nolu isyerinin 01661230 0843 nolu pos ve batchinin satis islemleri', amount_in: 46540, amount_out: 0, confidence_score: 99, statement_transaction_no: '2026009923018191', status: 'pending' },
  { id: 'vakif-fee', company_id: 'alayli', transaction_date: '2026-07-13', transaction_time: '07:13', bank_name: 'VakifBank', description: 'Batch Komisyonu 130000000001605 nolu isyerinin 01661230 0843 nolu pos ve batchinin komisyonu', amount_in: 0, amount_out: 902.81, confidence_score: 99, statement_transaction_no: '2026009923018202', status: 'pending' },
];

const report = buildDailyReview(rows);
assert.equal(report.review_date, '2026-07-13');
assert.equal(report.summary.total, 4);
assert.equal(report.summary.cari_dogrulama, 1);
assert.equal(report.summary.hazir, 3);
const text = formatDailyBankReview(report);
assert(text.includes('Gunluk Banka Kontrolu'));
assert(!text.includes('old-fee'));
assert(!text.includes('raw_text'));
assert(text.includes('POS banka transferi'));
assert(text.includes('2026009923018191'));
assert(!text.includes('PDF sayfa'));
console.log('RESULT: OK - daily bank review selects newest date, separates counterparty confirmation, and formats concise Telegram text.');
