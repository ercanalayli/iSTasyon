import assert from 'node:assert/strict';
import { formatNotification, normalizeNotification } from '../functions/api/telegram-business-notify.js';

const item = normalizeNotification({
  kind: 'murat_email_sent',
  event_key: 'murat:invoice:M012026000000200:email',
  invoice_no: 'M012026000000200',
  amount: 79069.95,
  subject: 'RE: ALAYLI',
  to: 'harslan@muratticaret.com',
  cc: 'vagbulak@muratticaret.com, ercanalayli@gmail.com',
  attachments: ['M012026000000200.pdf', 'Alaylı Nakliyat Dosyası (12) - Ağustos 2026 Fiyatlı.xlsx'],
  gmail_message_id: '1a071e6acd25d741'
});
const message = formatNotification(item);
assert.match(message, /M012026000000200/);
assert.match(message, /79\.069,95/);
assert.match(message, /RE: ALAYLI/);
assert.match(message, /ercanalayli@gmail\.com/);
assert.match(message, /Alaylı Nakliyat Dosyası/);
assert.throws(() => normalizeNotification({ kind: 'arbitrary', event_key: '12345678' }), /unsupported/);
assert.throws(() => normalizeNotification({ kind: 'test', event_key: '../bad' }), /invalid_event_key/);
console.log('telegram-business-notify=ok');
