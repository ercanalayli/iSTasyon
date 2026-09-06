#!/usr/bin/env node
const assert = require('node:assert/strict');

process.env.TELEGRAM_EXPECTED_WEBHOOK_URL = 'https://aperion-istasyon.pages.dev/telegram/webhook';
const { evaluateHealth } = require('./ensure_telegram_webhook.cjs');

const telegramHealthy = {
  url: 'https://aperion-istasyon.pages.dev/telegram/webhook',
  last_error_message: null
};
const directHealthy = { ok: true, status: 200, response: { ok: true, service: 'aperion-telegram-webhook' } };

const localOnlyFailure = evaluateHealth({
  preflight: { ok: false, status: 0, response: null, error: 'timeout' },
  webhookEndpoint: directHealthy,
  telegram: telegramHealthy
});
assert.equal(localOnlyFailure.ok, true);
assert.equal(localOnlyFailure.status, 'ok_with_probe_warning');

const webhookDown = evaluateHealth({
  preflight: { ok: false, status: 503, response: null },
  webhookEndpoint: { ok: false, status: 503 },
  telegram: telegramHealthy
});
assert.equal(webhookDown.ok, false);
assert.deepEqual(webhookDown.failures, ['cloudflare_webhook_endpoint_unreachable']);

const d1Down = evaluateHealth({
  preflight: { ok: false, status: 503, response: { checks: { d1: { ok: false } } } },
  webhookEndpoint: directHealthy,
  telegram: telegramHealthy
});
assert.equal(d1Down.ok, false);
assert.deepEqual(d1Down.failures, ['d1_control_plane_unhealthy']);

const telegramDeliveryDown = evaluateHealth({
  preflight: { ok: true, status: 200, response: { checks: { d1: { ok: true } } } },
  webhookEndpoint: directHealthy,
  telegram: { ...telegramHealthy, last_error_message: 'Connection timed out' }
});
assert.equal(telegramDeliveryDown.ok, false);
assert.deepEqual(telegramDeliveryDown.failures, ['telegram_delivery_error']);

console.log('telegram watchdog health classification: OK');
