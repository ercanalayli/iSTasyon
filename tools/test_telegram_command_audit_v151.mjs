import assert from 'node:assert/strict';
import { handleMobileCommand } from '../functions/telegram/mobile-command-center.js';

class FakeD1 {
  constructor() { this.rows = new Map(); }
  prepare(sql) {
    const db = this;
    return {
      args: [],
      bind(...args) { this.args = args; return this; },
      async run() {
        if (!sql.includes('INSERT INTO telegram_command_log')) throw new Error(`Unsupported SQL: ${sql}`);
        const [key, chatId, userId, messageId, code, risk, hash, status, summary] = this.args;
        db.rows.set(key, { key, chatId, userId, messageId, code, risk, hash, status, summary });
        return { success: true };
      }
    };
  }
}

const identity = { chatId: '1497', userId: '1497', hardened: true };
const message = { message_id: 42, chat: { id: 1497 }, text: '/start' };

const successDb = new FakeD1();
const success = await handleMobileCommand({
  env: { APERION_DB: successDb },
  message,
  identity,
  sendMessage: async () => ({ ok: true, result: { message_id: 99 } })
});
assert.equal(success.status, 'completed');
assert.equal(success.delivered, true);
assert.equal(success.receivedRecorded, true);
assert.equal(success.completedRecorded, true);
assert.equal(successDb.rows.get('telegram:1497:42').status, 'completed');

const failedDb = new FakeD1();
const failed = await handleMobileCommand({
  env: { APERION_DB: failedDb },
  message: { ...message, message_id: 43 },
  identity,
  sendMessage: async () => ({ ok: false, description: 'Forbidden' })
});
assert.equal(failed.status, 'failed');
assert.equal(failed.delivered, false);
assert.equal(failed.receivedRecorded, true);
assert.equal(failed.completedRecorded, true);
assert.equal(failedDb.rows.get('telegram:1497:43').status, 'failed');

console.log('Telegram command audit lifecycle: OK');
console.log('Silent send failure detection: OK');

