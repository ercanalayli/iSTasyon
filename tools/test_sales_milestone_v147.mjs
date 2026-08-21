import assert from 'node:assert/strict';
import {
  buildProfitSnapshot,
  crossedMilestones,
  detectSalesAnomalies,
  formatMilestoneMessage
} from '../functions/shared/sales-milestone.js';

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
console.log('sales milestone v147: OK');
