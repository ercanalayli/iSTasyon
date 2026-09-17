import assert from 'node:assert/strict';
import {
  buildProfitSnapshot,
  crossedMilestones,
  detectSalesAnomalies,
  formatMilestoneMessage,
  buildSalesNotificationV2,
  formatV2FifoProof,
  salesMemoryEventCandidate
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
const fifoSale={sale_id:'sale-1',product_id:'product-1',sale_date:'2026-09-17',sale_qty:8,SMM:957.64,SAT:1200,
  fifo_layers:[
    {purchase_document_id:'buy-1',purchase_date:'2026-04-22',supplier:'TUNA DIŞ TİC.',original_qty:10,unit_cost:110.88,qty_consumed_before:7,qty_consumed_this_sale:3,qty_remaining:0},
    {purchase_document_id:'buy-2',purchase_date:'2026-08-18',supplier:'TUNA DIŞ TİC.',original_qty:12,unit_cost:125,qty_consumed_before:2,qty_consumed_this_sale:5,qty_remaining:5}
  ]};
// 3*110.88 + 5*125 = 957.64.
const v2=buildSalesNotificationV2(fifoSale);
assert.equal(v2.fifo_audit.reconciliation_status,'PASS');
assert.equal(v2.profit_locked,true); // SAB/DEĞ deliberately unresolved.
assert.match(formatV2FifoProof(v2),/22.04|2026-04-22/);
assert.match(formatV2FifoProof(v2),/2026-08-18/);
assert.match(formatV2FifoProof(v2),/TUNA DIŞ TİC/);
assert.match(formatV2FifoProof(v2),/FIFO ✓/);
const mismatch=buildSalesNotificationV2({...fifoSale,SMM:957.63});
assert.equal(mismatch.fifo_audit.reconciliation_status,'FAIL');
assert.equal(mismatch.profit_locked,true);
assert.doesNotMatch(formatV2FifoProof(mismatch),/FIFO ✓/);
assert.equal(salesMemoryEventCandidate({kind:'ordinary_sale',product_id:'x',source_ref:'sale:x'}),null);
assert.equal(salesMemoryEventCandidate({kind:'cost_changed',product_id:'x',source_ref:'sale:x',summary:'FIFO cost changed'}).kind,'cost_changed');
console.log('sales milestone v147: OK');
