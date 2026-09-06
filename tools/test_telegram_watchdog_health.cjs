#!/usr/bin/env node
const assert = require('node:assert/strict');

process.env.TELEGRAM_EXPECTED_WEBHOOK_URL = 'https://aperion-istasyon.pages.dev/telegram/webhook';
const { deliveryState, evaluateHealth } = require('./ensure_telegram_webhook.cjs');

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
  telegram: { ...telegramHealthy, last_error_message: 'Connection timed out', last_error_date: 1_999_999_990 },
  nowMs: 2_000_000_000_000
});
assert.equal(telegramDeliveryDown.ok, false);
assert.deepEqual(telegramDeliveryDown.failures, ['telegram_delivery_error']);

const repairedRetainedTelegramError = evaluateHealth({
  preflight: { ok: true, status: 200, response: { checks: { d1: { ok: true } } } },
  webhookEndpoint: directHealthy,
  telegram: { ...telegramHealthy, pending_update_count: 0, last_error_message: 'Connection timed out', last_error_date: 1_999_999_990 },
  repair: { attempted: true, setOk: true, authenticatedPostOk: true, startedAtSec: 1_999_999_995, baselineLastErrorSec: 1_999_999_990 },
  nowMs: 2_000_000_000_000
});
assert.equal(repairedRetainedTelegramError.ok, true);
assert.deepEqual(repairedRetainedTelegramError.warnings, ['telegram_delivery_repaired_old_error_retained']);

const repairDidNotRecoverPendingUpdates = evaluateHealth({
  preflight: { ok: true, status: 200, response: { checks: { d1: { ok: true } } } },
  webhookEndpoint: directHealthy,
  telegram: { ...telegramHealthy, pending_update_count: 2, last_error_message: 'Connection timed out', last_error_date: 1_999_999_990 },
  repair: { attempted: true, setOk: true, authenticatedPostOk: true, startedAtSec: 1_999_999_995, baselineLastErrorSec: 1_999_999_990 },
  nowMs: 2_000_000_000_000
});
assert.equal(repairDidNotRecoverPendingUpdates.ok, false);
assert.deepEqual(repairDidNotRecoverPendingUpdates.failures, ['telegram_delivery_error']);

const errorAdvancedAfterRepair = evaluateHealth({
  preflight: { ok: true, status: 200, response: { checks: { d1: { ok: true } } } },
  webhookEndpoint: directHealthy,
  telegram: { ...telegramHealthy, pending_update_count: 0, last_error_message: 'Bad Gateway', last_error_date: 2_000_000_001 },
  repair: { attempted: true, setOk: true, authenticatedPostOk: true, startedAtSec: 2_000_000_000, baselineLastErrorSec: 1_999_999_990 },
  nowMs: 2_000_000_002_000
});
assert.equal(errorAdvancedAfterRepair.ok, false);
assert.deepEqual(errorAdvancedAfterRepair.failures, ['telegram_delivery_error']);

assert.deepEqual(deliveryState({ last_error_message: 'Old 503', last_error_date: 1_999_990_000 }, 2_000_000_000_000), {
  active: false,
  stale: true,
  pending: false,
  lastErrorSec: 1_999_990_000
});

const staleTelegramDeliveryError = evaluateHealth({
  preflight: { ok: false, status: 503, response: { checks: { d1: { ok: true } } } },
  webhookEndpoint: directHealthy,
  telegram: { ...telegramHealthy, pending_update_count: 0, last_error_message: 'Old 503', last_error_date: 1_999_990_000 },
  nowMs: 2_000_000_000_000
});
assert.equal(staleTelegramDeliveryError.ok, true);
assert.deepEqual(staleTelegramDeliveryError.failures, []);
assert.deepEqual(staleTelegramDeliveryError.warnings, ['stale_telegram_delivery_error', 'preflight_probe_inconclusive']);

const staleButPending = evaluateHealth({
  preflight: { ok: true, status: 200, response: { checks: { d1: { ok: true } } } },
  webhookEndpoint: directHealthy,
  telegram: { ...telegramHealthy, pending_update_count: 2, last_error_message: 'Old 503', last_error_date: 1_999_990_000 },
  nowMs: 2_000_000_000_000
});
assert.equal(staleButPending.ok, false);
assert.deepEqual(staleButPending.failures, ['telegram_delivery_error']);

console.log('telegram watchdog health classification: OK');
