const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildReport } = require('./build_payment_reminder_candidates_v88.cjs');
const { formatDigest, resolveChatId } = require('../telegram/aperion_payment_reminder_digest_v88.cjs');

const root = path.resolve(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'data', 'aperion_payment_obligation_registry.json'), 'utf8'));
const report = buildReport(registry, '2026-07-13');
const aidat = report.candidates.find((item) => item.obligation_id === 'personal-batikent-ercan-ev-aidat');
const sena = report.candidates.find((item) => item.obligation_id === 'business-sena-medikal-promise-20260710');

assert(aidat, 'Batıkent aidat kartı bulunamadı');
assert.strictEqual(aidat.due_date, '2026-07-16');
assert.strictEqual(aidat.level, 'due_in_3');
assert.strictEqual(aidat.notify, true);
assert(sena, 'Sena Medikal kartı bulunamadı');
assert.strictEqual(sena.level, 'overdue');
assert.strictEqual(sena.notify, true);
assert(formatDigest(report).includes('Batıkent Ercan Ev Aidatı'));
assert(formatDigest(report).includes('ödeme emri değildir'));
assert.strictEqual(resolveChatId({ TELEGRAM_CHAT_IDS: '12345,67890' }), '12345');
assert.strictEqual(resolveChatId({ TELEGRAM_ALLOWED_CHAT_ID: '23456', TELEGRAM_CHAT_IDS: '12345' }), '23456');

console.log('RESULT: OK - payment reminder candidates verified.');
