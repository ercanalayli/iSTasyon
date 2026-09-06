import assert from 'node:assert/strict';
import { telegramDeliveryState } from '../functions/api/telegram-preflight.js';

const now = 2_000_000_000;
assert.equal(telegramDeliveryState({
  last_error_message: 'old 503', last_error_date: now - 3600, pending_update_count: 0
}, now).activeDeliveryError, false);
assert.equal(telegramDeliveryState({
  last_error_message: 'new 503', last_error_date: now - 60, pending_update_count: 0
}, now).activeDeliveryError, true);
assert.equal(telegramDeliveryState({
  last_error_message: 'old 503', last_error_date: now - 3600, pending_update_count: 1
}, now).activeDeliveryError, true);
assert.equal(telegramDeliveryState({ pending_update_count: 0 }, now).activeDeliveryError, false);

console.log('Telegram preflight stale error classification: OK');
