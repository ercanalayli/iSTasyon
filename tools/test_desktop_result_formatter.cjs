'use strict';

const assert = require('node:assert/strict');
const { userSafeDesktopResult } = require('./desktop_result_formatter.cjs');

const raw = 'Fiyat listesi kesin eşleşmedi (Mayıs 2026 listesi); taslak kaydedilmedi. FORM:{"selects":[],"inputs":[]}';
const message = userSafeDesktopResult('bizimhesap_diaper_proforma', { ok: false, output: raw }, { order_reference: 'HB-1' });
assert.equal(message, '⚠️ HB-1: fiyat doğrulaması tamamlanamadı. Sipariş güvende; taslak henüz kaydedilmedi.');
assert.doesNotMatch(message, /FORM|selects|inputs|\{/i);

const generic = userSafeDesktopResult('desktop_open_url', { ok: false, output: 'Açılamadı FORM:{"secret":"x"}' });
assert.equal(generic, '⚠️ Açılamadı');

console.log('desktop_result_formatter: OK');
