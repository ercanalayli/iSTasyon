const assert = require('node:assert/strict');
const { deliveryState } = require('./check_telegram_health.cjs');

const nowMs = 2_000_000_000_000;

assert.deepEqual(deliveryState({
  last_error_message: 'old 503',
  last_error_date: 1_999_990_000,
  pending_update_count: 0
}, nowMs), {
  active: false,
  stale: true,
  age_seconds: 10_000
});

assert.equal(deliveryState({
  last_error_message: 'recent 503',
  last_error_date: 1_999_999_990,
  pending_update_count: 0
}, nowMs).active, true);

assert.equal(deliveryState({
  last_error_message: 'old 503',
  last_error_date: 1_999_990_000,
  pending_update_count: 1
}, nowMs).active, true);

assert.deepEqual(deliveryState({ pending_update_count: 0 }, nowMs), {
  active: false,
  stale: false,
  age_seconds: null
});

console.log('Telegram scheduled health stale-error classification: OK');
