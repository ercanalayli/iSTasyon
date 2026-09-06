import assert from 'node:assert/strict';
import { detectPersonalFinanceQuery, financialDocumentInternals, personalFinanceSummaryReply } from '../functions/shared/financial-document.js';

const { amount, isoDate, normalizeEvent } = financialDocumentInternals;
assert.equal(amount('1.000,00 TL'), 1000);
assert.equal(amount('1000'), 1000);
assert.equal(isoDate('06.09.2026'), '2026-09-06');

const normalized = normalizeEvent({
  document_type: 'dekont', direction: 'outgoing', scope: 'unknown', counterparty: 'EGE ALAYLI',
  amount: '1.000,00', currency: 'TRY', transaction_date: '06.09.2026', confidence: 0.96
}, [{ alias_key: 'ege', canonical_name: 'Ege', relationship: 'oğlu', default_category: 'Harçlık' }]);
assert.equal(normalized.ready, true);
assert.equal(normalized.scope, 'personal');
assert.equal(normalized.counterparty, 'Ege');
assert.equal(normalized.category, 'Harçlık');
assert.equal(normalized.amount, 1000);

assert.deepEqual(detectPersonalFinanceQuery("Bu ay oğluma ne kadar harçlık gönderdim?", new Date(2026, 8, 6)), {
  counterparty: 'Ege', category: 'Harçlık', direction: 'outgoing',
  fromDate: '2026-09-01', toDate: '2026-09-06', periodLabel: 'Bu ay'
});
assert.match(personalFinanceSummaryReply({ count: 1, total: 1000, firstDate: '2026-09-06', lastDate: '2026-09-06', latest: [
  { transaction_date: '2026-09-06', category: 'Harçlık', amount: 1000, currency: 'TRY' }
] }, { counterparty: 'Ege' }), /1\.000,00/);

console.log('financial document v151: OK');
