const assert = require('assert/strict');
const { loadDiaperPriceCatalog, resolveDiaperCatalogItem, parseDiscountPercent } = require('./diaper_price_catalog.cjs');

const catalog = loadDiaperPriceCatalog();
const cases = [
  [{ brand: 'Cover dry', product_kind: 'bel bantlı', size: 'L', units_per_package: 30 }, 'MAM.01128', 378.9504],
  [{ brand: 'Cover dry', product_kind: 'külot', size: 'M', units_per_package: 30 }, 'MAM.01240', 360.8731],
  [{ brand: 'Jender', product_kind: 'bel bantlı', size: 'L', units_per_package: 30 }, 'MAM.00389', 474.0307],
  [{ brand: 'Jender', product_kind: 'bel bantlı', size: 'M', units_per_package: 30 }, 'MAM.00390', 402.696],
  [{ brand: 'Jender', product_kind: 'külot', size: 'M', units_per_package: 30 }, 'MAM.01007', 461.6928],
  [{ brand: 'Cover dry', product_kind: 'serme', size: null, units_per_package: 30 }, 'MAM.01135', 157.0957]
];

for (const [item, code, price] of cases) {
  const resolved = resolveDiaperCatalogItem(item, 'Mayıs 2026 listesi', catalog);
  assert.equal(resolved.code, code);
  assert.equal(resolved.unitPrice, price);
}
assert.equal(parseDiscountPercent('İskonto yok'), 0);
assert.equal(parseDiscountPercent('İskonto %7'), 7);
console.log('Mayıs 2026 fiyat kataloğu: 6/6 ürün ve iskonto kuralları doğrulandı.');
