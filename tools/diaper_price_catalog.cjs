const fs = require('fs');
const path = require('path');

function foldDiaperText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function loadDiaperPriceCatalog(repoRoot = path.join(__dirname, '..')) {
  const file = path.join(repoRoot, 'hasta-bezi', 'price_compare_data.js');
  const source = fs.readFileSync(file, 'utf8').trim();
  const equalAt = source.indexOf('=');
  const jsonText = source.slice(equalAt + 1).replace(/;\s*$/, '');
  const payload = JSON.parse(jsonText);
  if (!Array.isArray(payload.fields) || !Array.isArray(payload.rows)) throw new Error('Hasta bezi fiyat kataloğu okunamadı.');
  return payload;
}

function resolveDiaperCatalogItem(item, priceListName, catalog) {
  const fields = catalog.fields.map(foldDiaperText);
  const monthToken = foldDiaperText(priceListName).split(' ').find(token => ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'].includes(token));
  const priceIndex = fields.findIndex(field => field === monthToken);
  if (priceIndex < 0) throw new Error(`Fiyat dönemi katalogda bulunamadı: ${priceListName}`);
  const brand = foldDiaperText(item.brand).replace(/\s+/g, '');
  const kind = foldDiaperText(item.product_kind);
  const size = String(item.size || '').toUpperCase();
  const matches = catalog.rows.filter(row => {
    const name = foldDiaperText(row[2]);
    if (!name.replace(/\s+/g, '').includes(brand)) return false;
    if (kind.includes('bel bantli') && !name.includes('bel bantli')) return false;
    if (kind.includes('kulot') && !name.includes('kulot')) return false;
    if (kind.includes('serme') && !name.includes('yatak koruyucu ortu')) return false;
    if (Number(row[3]) !== Number(item.units_per_package)) return false;
    if (size === 'M' && !name.includes('medium')) return false;
    if (size === 'L' && (!name.includes('large') || /x\s*large|xlarge|xxlarge/.test(name))) return false;
    if (size === 'XL' && (!/x\s*large|xlarge/.test(name) || /xx\s*large|xxlarge/.test(name))) return false;
    if (size === 'XXL' && !/xx\s*large|xxlarge/.test(name)) return false;
    if (size === 'S' && (!name.includes('small') || name.includes('xsmall'))) return false;
    if (size === 'XS' && !/x\s*small|xsmall|xs/.test(name)) return false;
    return true;
  });
  if (matches.length !== 1) throw new Error(`Ürün fiyat kataloğunda kesin eşleşmedi (${item.raw_text || JSON.stringify(item)}); bulunan=${matches.length}`);
  const row = matches[0];
  const unitPrice = Number(row[priceIndex]);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error(`${priceListName} fiyatı eksik: ${row[1]} ${row[2]}`);
  return { barcode: String(row[0] || ''), code: String(row[1] || ''), name: String(row[2] || ''), unitPrice, pricePeriod: catalog.fields[priceIndex] };
}

function parseDiscountPercent(discountNote) {
  const note = foldDiaperText(discountNote);
  if (!note || note.includes('iskonto yok') || note.includes('indirim yok')) return 0;
  const match = String(discountNote || '').match(/%\s*(\d+(?:[.,]\d+)?)/);
  if (!match) throw new Error(`İskonto oranı kesin okunamadı: ${discountNote}`);
  const value = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`Geçersiz iskonto oranı: ${discountNote}`);
  return value;
}

module.exports = { loadDiaperPriceCatalog, resolveDiaperCatalogItem, parseDiscountPercent };
