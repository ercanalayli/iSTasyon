import assert from 'node:assert/strict';
import { detectPersonalFinanceQuery, financialDocumentInternals, personalFinanceSummaryReply } from '../functions/shared/financial-document.js';
import { onRequestPost } from '../functions/api/financial-document-process.js';

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

const sqlOrder = [];
const db = {
  prepare(sql) {
    sqlOrder.push(String(sql));
    const statement = {
      bind() { return statement; },
      async run() { return { success: true }; },
      async first() { return null; }
    };
    return statement;
  }
};
const secret = 's'.repeat(40);
const catchupResponse = await onRequestPost({
  request: new Request('https://example.test/api/financial-document-process', {
    method: 'POST', headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' }, body: '{}'
  }),
  env: { APERION_BRIDGE_SECRET: secret, APERION_DB: db }
});
assert.equal(catchupResponse.status, 200);
assert.equal((await catchupResponse.json()).reason, 'no_pending_capture');
assert.ok(sqlOrder.findIndex((sql) => sql.includes('ALTER TABLE telegram_captures ADD COLUMN extraction_status')) <
  sqlOrder.findIndex((sql) => sql.includes('SELECT * FROM telegram_captures')));

const webhookOnlyResponse = await onRequestPost({
  request: new Request('https://example.test/api/financial-document-process', {
    method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'webhook-test-secret' }, body: '{}'
  }),
  env: { TELEGRAM_WEBHOOK_SECRET: 'webhook-test-secret', APERION_DB: db }
});
assert.equal(webhookOnlyResponse.status, 200);

console.log('financial document v151: OK');
