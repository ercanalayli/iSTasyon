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
assert.equal(parseMobileCommand('/onemli').code, 'priority_status');
assert.equal(parseMobileCommand('/onaylar').code, 'approvals');
assert.equal(parseMobileCommand('/görevler').code, 'tasks');
assert.equal(parseMobileCommand('/hafıza').code, 'memory');
assert.equal(parseMobileCommand('/komutlar').code, 'command_catalog');
assert.equal(parseMobileCommand('/komutdurum').code, 'command_status');
assert.equal(parseMobileCommand('/cihazdurum').code, 'device_status');
assert.equal(parseMobileCommand('cihaz durumu').code, 'device_status');
assert.equal(parseMobileCommand('/muratdurum').code, 'murat_status');
assert.equal(parseMobileCommand('/sonislem').code, 'murat_status');
assert.equal(parseMobileCommand('/faturakontrol').code, 'murat_status');
assert.equal(parseMobileCommand('/dosyalar').code, 'murat_status');
assert.deepEqual(parseMobileCommand('/gorev Faturaları kontrol et'), { code: 'task_capture', payload: 'Faturaları kontrol et' });
assert.equal(parseMobileCommand('bakiye'), null);
assert.equal(MOBILE_COMMANDS.task_capture.risk, 'low_risk');
assert.equal(MOBILE_COMMANDS.command_catalog.risk, 'read');
assert.equal(MOBILE_COMMANDS.device_status.risk, 'read');
assert.equal(MOBILE_COMMANDS.priority_status.risk, 'read');
assert.equal(MOBILE_COMMANDS.murat_status.risk, 'read');
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

function fakeDeviceDb({ devices = [], commandCounts = {} } = {}) {
  return {
    prepare(sql) {
      return {
        bind() { return this; },
        async all() {
          if (sql.includes('FROM aperion_devices')) return { results: devices };
          throw new Error(`Unexpected all query: ${sql}`);
        },
        async first() {
          if (sql.includes('FROM aperion_device_commands')) return commandCounts;
          throw new Error(`Unexpected first query: ${sql}`);
        }
      };
    }
  };
}

const offlineDeviceText = await __test.buildDeviceStatusText(fakeDeviceDb({
  devices: [{ device_id: 'desktop-1', device_name: 'AperiON Windows', status: 'active', last_seen_at: null }],
  commandCounts: { total: 2, pending: 1, processing: 0, completed: 1, failed: 0 }
}), Date.parse('2026-08-20T09:00:00Z'));
assert.match(offlineDeviceText, /İLK BAĞLANTI BEKLENİYOR/);
assert.match(offlineDeviceText, /Bekleyen komut: 1/);

const onlineDeviceText = await __test.buildDeviceStatusText(fakeDeviceDb({
  devices: [{ device_id: 'desktop-1', device_name: 'AperiON Windows', status: 'active', last_seen_at: '2026-08-20 08:59:30' }],
  commandCounts: { total: 1, pending: 0, processing: 0, completed: 1, failed: 0 }
}), Date.parse('2026-08-20T09:00:00Z'));
assert.match(onlineDeviceText, /ÇEVRİMİÇİ/);

const priorityDb = {
  prepare(sql) {
    return {
      bind() { return this; },
      async all() {
        if (sql.includes('FROM commitment_timeline')) return { results: [
          { commitment_type: 'sales_order', amount: 1500, time_bucket: 'approaching' },
          { commitment_type: 'purchase_order', amount: 900, time_bucket: 'overdue' },
          { commitment_type: 'payable', amount: 700, time_bucket: 'approaching' },
          { commitment_type: 'receivable', amount: 1200, time_bucket: 'overdue' }
        ] };
        throw new Error(`Unexpected all query: ${sql}`);
      },
      async first() {
        if (sql.includes('FROM work_items')) return { count: 6 };
        throw new Error(`Unexpected first query: ${sql}`);
      }
    };
  }
};
const priorityText = await __test.buildPriorityStatusText(priorityDb);
assert.match(priorityText, /Alınan siparişler: 1/);
assert.match(priorityText, /Verilen siparişler: 1/);
assert.match(priorityText, /Ödemeler: 1/);
assert.match(priorityText, /Tahsilatlar: 1/);
assert.match(priorityText, /Yapılacaklar: 6/);

const muratDb = {
  prepare(sql) {
    return {
      bind() { return this; },
      async first() {
        if (sql.includes('FROM telegram_business_notifications')) return {
          event_key: 'murat:invoice:M012026000000200:telegram-smoke-v1',
          kind: 'murat_email_sent',
          status: 'sent',
          telegram_message_id: '12345',
          sent_at: '2026-09-05 15:23:50',
          payload_json: JSON.stringify({
            invoiceNo: 'M012026000000200',
            amount: 79069.95,
            subject: 'RE: ALAYLI',
            to: 'harslan@muratticaret.com',
            cc: 'vagbulak@muratticaret.com, ercanalayli@gmail.com',
            attachments: ['M012026000000200.pdf', 'Alaylı Nakliyat Dosyası (12) - Ağustos 2026 Fiyatlı.xlsx'],
            gmailMessageId: '1a071e6acd25d741'
          })
        };
        throw new Error(`Unexpected first query: ${sql}`);
      }
    };
  }
};
const muratText = await __test.buildMuratStatusText(muratDb);
assert.match(muratText, /M012026000000200/);
assert.match(muratText, /79\.069,95 TL/);
assert.match(muratText, /ercanalayli@gmail\.com/);
assert.match(muratText, /Alaylı Nakliyat Dosyası/);
assert.match(muratText, /Aynı olay yeniden gönderilemez/);

console.log('Telegram mobile command center tests passed.');
