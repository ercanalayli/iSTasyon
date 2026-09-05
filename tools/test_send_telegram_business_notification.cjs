'use strict';

const assert = require('node:assert/strict');
const { normalize, sendBusinessNotification } = require('./send_telegram_business_notification.cjs');

assert.equal(normalize({ kind: 'test', event_key: 'aperion:test:123' }).kind, 'test');
assert.throws(() => normalize({ kind: 'mail', event_key: 'aperion:test:123' }), /unsupported/);
assert.throws(() => normalize({ kind: 'test', event_key: '../bad' }), /invalid/);

(async () => {
  let captured;
  const result = await sendBusinessNotification({
    kind: 'murat_invoice_ready',
    event_key: 'murat:invoice:M012026000000200:ready',
    invoice_no: 'M012026000000200'
  }, {
    secret: 'x'.repeat(40),
    endpoint: 'https://example.test/api/telegram-business-notify',
    fetch: async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({ ok: true, sent: true, telegram_message_id: '42' }), { status: 200 });
    }
  });
  assert.equal(result.sent, true);
  assert.equal(result.telegram_message_id, '42');
  assert.equal(captured.options.headers.authorization, `Bearer ${'x'.repeat(40)}`);
  assert.doesNotMatch(captured.options.body, /authorization/i);
  console.log('telegram business notification adapter=ok');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
