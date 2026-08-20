import assert from 'node:assert/strict';
import { onRequestPost, parseCashTransferIntent } from '../functions/telegram/webhook.js';

class FakeD1 {
constructor() {
this.quickNotes = new Map();
this.approvals = new Map();
this.nextQuickNoteId = 1;
}

prepare(sql) {
const db = this;
return {
args: [],
bind(...args) { this.args = args; return this; },
async first() {
if (sql.startsWith('INSERT INTO quick_notes')) {
const [messageId, chatId, rawText, parsedType, paymentMethod, status] = this.args;
const key = `telegram:${messageId}`;
if (!db.quickNotes.has(key)) {
db.quickNotes.set(key, { id: db.nextQuickNoteId++, chatId, rawText, parsedType, paymentMethod, status });
}
return { id: db.quickNotes.get(key).id };
}
if (sql.includes('WHERE idempotency_key=?')) {
const row = [...db.approvals.values()].find(value => value.idempotency_key === this.args[0]);
return row ? { id: row.id, status: row.status } : null;
}
if (sql.includes('FROM approval_queue WHERE id=?')) {
const row = db.approvals.get(this.args[0]);
return row ? { id: row.id, status: row.status, payload_json: row.payload_json } : null;
}
throw new Error('Unsupported first SQL: ' + sql);
},
async run() {
if (sql.startsWith('INSERT INTO approval_queue')) {
const [id, payloadJson, evidenceRef, idempotencyKey] = this.args;
if ([...db.approvals.values()].some(value => value.idempotency_key === idempotencyKey)) {
throw new Error('UNIQUE constraint failed: approval_queue.idempotency_key');
}
db.approvals.set(id, {
id,
status: 'needs_review',
payload_json: payloadJson,
evidence_ref: evidenceRef,
idempotency_key: idempotencyKey
});
return { success: true };
}
if (sql.startsWith('UPDATE approval_queue SET status=')) {
const [status, decidedBy, id] = this.args;
const row = db.approvals.get(id);
if (row?.status === 'needs_review') {
row.status = status;
row.decided_by = decidedBy;
}
return { success: true };
}
throw new Error('Unsupported run SQL: ' + sql);
}
};
}
}

const intent = parseCashTransferIntent('Nakit Kasadan Ercan Nakit Kasaya 3500 TL transfer');
assert.equal(intent.amount, 3500);
assert.equal(intent.sends_to_bizimhesap, false);

const transmissions = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
transmissions.push({ url: String(url), body: options.body ? JSON.parse(options.body) : null });
return new Response(JSON.stringify({ ok: true, result: {} }), {
status: 200,
headers: { 'content-type': 'application/json' }
});
};

try {
const db = new FakeD1();
const env = { APERION_DB: db, TELEGRAM_BOT_TOKEN: 'test-token' };
const messageUpdate = {
update_id: 1,
message: {
message_id: 42,
chat: { id: 1497 },
text: 'Nakit Kasadan Ercan Nakit Kasaya 3500 TL transfer'
}
};
const firstResponse = await onRequestPost({
request: new Request('https://example.test/telegram/webhook', { method: 'POST', body: JSON.stringify(messageUpdate) }),
env
});
const firstJson = await firstResponse.json();
assert.equal(firstJson.intent, 'cash_transfer_test');
assert.equal(firstJson.live_write_enabled, false);
assert.equal(db.approvals.size, 1);

const sendPayload = transmissions.find(item => item.url.endsWith('/sendMessage'))?.body;
assert.match(sendPayload.text, /TEST MODU/);
assert.match(sendPayload.text, /3\.500,00 TL/);
const callbackData = sendPayload.reply_markup.inline_keyboard[0][0].callback_data;

const callbackResponse = await onRequestPost({
request: new Request('https://example.test/telegram/webhook', {
method: 'POST',
body: JSON.stringify({
update_id: 2,
callback_query: { id: 'callback-1', data: callbackData, message: { chat: { id: 1497 } } }
})
}),
env
});
const callbackJson = await callbackResponse.json();
assert.equal(callbackJson.callback_handled, true);
assert.equal([...db.approvals.values()][0].status, 'test_approved');
assert.ok(transmissions.every(item => item.url.startsWith('https://api.telegram.org/')));
assert.ok(transmissions.some(item => item.body?.text?.includes('BizimHesap’a kayıt yapılmadı')));

const duplicateResponse = await onRequestPost({
request: new Request('https://example.test/telegram/webhook', { method: 'POST', body: JSON.stringify(messageUpdate) }),
env
});
const duplicateJson = await duplicateResponse.json();
assert.equal(duplicateJson.duplicate, true);
assert.equal(db.approvals.size, 1);

console.log('RESULT: OK');
console.log('Current webhook transfer intent: OK');
console.log('D1 approval queue: OK');
console.log('Telegram inline callback: OK');
console.log('Duplicate protection: OK');
console.log('BizimHesap live write: DISABLED');
} finally {
globalThis.fetch = originalFetch;
}
