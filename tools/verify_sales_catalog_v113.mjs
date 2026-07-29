import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const catalog = JSON.parse(await readFile(new URL('../satis/catalog.json', import.meta.url)));
const app = await readFile(new URL('../satis/app.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../satis/index.html', import.meta.url), 'utf8');

assert.equal(catalog.status, 'preparation');
assert.equal(catalog.business.whatsapp, '');
assert.deepEqual(catalog.products, []);
assert.match(app, /publishApproved === true/);
assert.match(app, /priceApproved === true/);
assert.match(html, /WhatsApp'tan sor/);
assert.doesNotMatch(html, /temsili|placeholder-product/i);
console.log('Sales catalog safety tests passed.');
