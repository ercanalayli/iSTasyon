import assert from 'node:assert/strict';
import {
  buildProfitSnapshot,
  crossedMilestones,
  detectSalesAnomalies,
  formatMilestoneMessage
} from '../functions/shared/sales-milestone.js';
import { formatNewSalesMessage, saleFingerprint } from '../functions/api/bizimhesap-sales-sync.js';

assert.deepEqual(crossedMilestones(9_900, 10_100), [10_000]);
assert.deepEqual(crossedMilestones(9_900, 30_100), [10_000, 20_000, 30_000]);
assert.deepEqual(crossedMilestones(30_100, 30_500), []);

const complete = buildProfitSnapshot({
  revenue: 10_000,
  fifoCost: 6_000,
  operatingExpense: 1_000,
  estimatedTax: 600,
  recordCount: 4,
  fifoCoveredCount: 4
});
assert.equal(complete.netProfit, 2_400);
assert.equal(complete.netMargin, 24);

const incomplete = buildProfitSnapshot({ revenue: 10_000, recordCount: 4, fifoCoveredCount: 3 });
assert.equal(incomplete.netProfit, null);
const anomalies = detectSalesAnomalies({ recordCount: 4, fifoCoveredCount: 3, negativeStockCount: 1 }, incomplete);
assert.equal(anomalies.length, 2);

const text = formatMilestoneMessage({ milestone: 10_000, daily: { revenue: 10_250 }, snapshot: complete, anomalies: [] });
assert.match(text, /TEBRİKLER/);
assert.match(text, /Net kâr/);
assert.match(text, /<b>/);
assert.match(text, /🟩/);
const sampleSale = {
  firma_id: 'alayli', tarih: '2026-09-05', fatura_no: 'PS-1', urun_kod: 'CD-L', barkod: '',
  unvan: 'Perakende Satışlar', urun: 'Coverdry Külot L', adet: 2, ciro: 450, kaynak_satir: 7
};
assert.equal(saleFingerprint(sampleSale), saleFingerprint({ ...sampleSale, kaynak_satir: 99 }));
const saleMessage = formatNewSalesMessage([sampleSale]);
assert.match(saleMessage, /YENİ BİZİMHESAP SATIŞI/);
assert.match(saleMessage, /450,00/);
console.log('sales milestone v147: OK');
