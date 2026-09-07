import assert from 'node:assert/strict';
import {
  diaperApprovalButtons,
  diaperOrderCard,
  looksLikeDiaperOrder,
  parseDiaperOrder
} from '../functions/shared/diaper-operations.js';

const sercan = `Sercan Medikal
Coverdry belbantlı L 15 balya
Coverdry külot M 1 balya
Jender belbantlı L 1 balya
Jender belbantlı M 1 balya
Jender külot M 1 balya
Coverdry serme 1 balya`;

assert.equal(looksLikeDiaperOrder(sercan), true);
const order = parseDiaperOrder(sercan, { telegramDate: Date.parse('2026-09-03T08:00:00Z') / 1000 });
assert.equal(order.customerName, 'Sercan Medikal');
assert.equal(order.orderDate, '2026-09-03');
assert.equal(order.priceListName, 'Mayıs 2026');
assert.equal(order.discountNote, 'İskonto yok');
assert.equal(order.specialListNote, 'Standart liste');
assert.equal(order.items.length, 6);
assert.equal(order.items.reduce((sum, item) => sum + item.baleQuantity, 0), 20);
assert.equal(order.items.reduce((sum, item) => sum + item.packageQuantity, 0), 82);
assert.equal(order.items.at(-1).packagesPerBale, 6);
assert.equal(order.items.at(-1).unitsPerPackage, 30);
assert.deepEqual(order.blockers, []);
assert.equal(order.status, 'draft_ready');

const tenPack = parseDiaperOrder('Akın Medikal\nJender serme 60x90 10\'lu 2 balya\nMayıs 2026 listesi iskonto %3', { telegramDate: 0 });
assert.equal(tenPack.items[0].unitsPerPackage, 10);
assert.equal(tenPack.items[0].packageQuantity, 12);
assert.equal(tenPack.items[0].totalUnits, 120);
assert.equal(tenPack.discountNote, 'İskonto %3');

const missing = parseDiaperOrder('Coverdry belbantlı 2 balya');
assert.equal(missing.status, 'needs_information');
assert.ok(missing.blockers.some((item) => item.includes('Müşteri')));
assert.ok(missing.blockers.some((item) => item.includes('beden')));

const card = diaperOrderCard(order, 42, false);
assert.match(card, /HB-42/);
assert.match(card, /Mayıs 2026/);
assert.match(card, /82 paket/);
assert.equal(diaperApprovalButtons(42, true).inline_keyboard[0][0].callback_data, 'dp:a:42');
assert.equal(diaperApprovalButtons(42, false).inline_keyboard[0][0].callback_data, 'dp:i:42');

const webhookSource = await import('node:fs').then(({ readFileSync }) => readFileSync(new URL('../functions/telegram/webhook.js', import.meta.url), 'utf8'));
assert.match(webhookSource, /await queueDiaperProforma\(env, storedOrder, saved\.orderId, chatId\)/);
assert.match(webhookSource, /Faturalaştırma, gönderim ve tahsilat bu yetkiye dahil değildir/);

console.log('Hasta bezi sipariş ayrıştırma, varsayılan paket, liste, iskonto ve onay kartı testleri geçti.');
