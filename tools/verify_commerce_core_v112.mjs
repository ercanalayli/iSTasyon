import assert from 'node:assert/strict';
import { analyzePrice, buildSyncDecision, normalizeProductKey } from '../commerce/price-engine.mjs';

assert.equal(normalizeProductKey({ barcode: '869 123' }), 'barcode:869123');
const priced = analyzePrice({ cost: 100, vatRate: 10, targetMargin: 25, minMargin: 15, competitorOffers: [{ price: 150, inStock: true }] });
assert.equal(priced.status, 'review');
assert.equal(priced.requiresApproval, true);
assert.ok(priced.recommendedGross >= priced.floorGross);
assert.equal(analyzePrice({ cost: 0 }).status, 'blocked');
const sync = buildSyncDecision({ local: { barcode: '8691', name: 'Ürün', stock: 4, salePrice: 150 }, remote: { barcode: '8691', name: 'Ürün', stock: 3, salePrice: 140 } });
assert.equal(sync.action, 'queue_update_bizimhesap');
assert.equal(sync.requiresApproval, true);
assert.deepEqual(Object.keys(sync.changes).sort(), ['salePrice', 'stock']);
console.log('Commerce core regression tests passed.');
