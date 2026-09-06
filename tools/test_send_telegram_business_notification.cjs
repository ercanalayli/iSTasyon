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
  let signed;
  await sendBusinessNotification({
    kind: 'diaper_proforma_ready',
    event_key: 'diaper:proforma:HB-1:ready',
    order_reference: 'HB-1',
    customer_name: 'Sercan Medikal',
    line_count: 6,
    package_quantity: 82,
    amount: 30476.77
  }, {
    signingKey: 's'.repeat(40),
    endpoint: 'https://example.test/api/telegram-business-notify',
    fetch: async (url, options) => {
      signed = { url, options };
      return new Response(JSON.stringify({ ok: true, sent: true, telegram_message_id: '43' }), { status: 200 });
    }
  });
  assert.match(signed.options.headers['x-aperion-timestamp'], /^\d{13}$/);
  assert.match(signed.options.headers['x-aperion-signature'], /^[a-f0-9]{64}$/);
  assert.equal(signed.options.headers.authorization, undefined);
  console.log('telegram business notification adapter=ok');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
