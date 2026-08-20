import assert from 'node:assert/strict';
import {
  MOBILE_COMMANDS,
  normalizeTurkish,
  parseMobileCommand,
  verifyTelegramRequest,
  __test
} from '../functions/telegram/mobile-command-center.js';

assert.equal(normalizeTurkish('  GÜNAYDIN   APERİON '), 'günaydın aperion');
assert.equal(parseMobileCommand('Günaydın AperiON').code, 'morning');
assert.equal(parseMobileCommand('/menu').code, 'menu');
assert.equal(parseMobileCommand('/sistem').code, 'system');
assert.equal(parseMobileCommand('/onaylar').code, 'approvals');
assert.equal(parseMobileCommand('/görevler').code, 'tasks');
assert.equal(parseMobileCommand('/hafıza').code, 'memory');
assert.deepEqual(parseMobileCommand('/gorev Faturaları kontrol et'), { code: 'task_capture', payload: 'Faturaları kontrol et' });
assert.equal(parseMobileCommand('bakiye'), null);
assert.equal(MOBILE_COMMANDS.task_capture.risk, 'low_risk');
assert.equal(await __test.constantTimeEqual(await __test.hashHex('secret'), await __test.hashHex('secret')), true);
assert.equal(await __test.constantTimeEqual(await __test.hashHex('secret'), await __test.hashHex('wrong')), false);

const update = { message: { chat: { id: 42 }, from: { id: 7 } } };
const good = await verifyTelegramRequest(
  new Request('https://example.test', { headers: { 'x-telegram-bot-api-secret-token': 'secret' } }),
  { TELEGRAM_WEBHOOK_SECRET: 'secret', TELEGRAM_ALLOWED_CHAT_IDS: '42', TELEGRAM_ALLOWED_USER_IDS: '7' },
  update
);
assert.equal(good.ok, true);
assert.equal(good.hardened, true);

const wrongSecret = await verifyTelegramRequest(
  new Request('https://example.test', { headers: { 'x-telegram-bot-api-secret-token': 'wrong' } }),
  { TELEGRAM_WEBHOOK_SECRET: 'secret', TELEGRAM_ALLOWED_CHAT_IDS: '42' },
  update
);
assert.equal(wrongSecret.ok, false);
assert.equal(wrongSecret.reason, 'invalid_webhook_secret');

const wrongChat = await verifyTelegramRequest(
  new Request('https://example.test'),
  { TELEGRAM_ALLOWED_CHAT_IDS: '99' },
  update
);
assert.equal(wrongChat.ok, false);
assert.equal(wrongChat.reason, 'chat_not_allowed');

console.log('Telegram mobile command center tests passed.');
