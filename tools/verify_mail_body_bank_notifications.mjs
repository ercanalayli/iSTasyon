import assert from 'node:assert/strict';
import { parseBankStatement } from '../automation/parsers/index.js';

function one(text, meta = {}) {
  const rows = parseBankStatement(text, {
    company_id: 'alayli',
    source: 'gmail_bank_notification',
    mailbox: 'alaylimedikal@gmail.com',
    attachment_name: 'mail_body',
    mail_subject: meta.subject || '',
    mail_from: meta.from || '',
    mail_date: meta.date || 'Fri, 26 Jun 2026 13:03:00 +0300',
    bank_hint: meta.bank || ''
  });
  assert.equal(rows.length, 1, text);
  return rows[0];
}

const incoming = one(
  'Yapi Kredi Akilli Asistan-Gelen EFT\n25/06/2026 11:49 tarihinde ERHAN ALAYLI tarafindan hesabınıza 17.500,00 TL para gönderildi.',
  { bank: 'yapikredi', subject: 'Akilli Asistan-Gelen EFT' }
);
assert.equal(incoming.bank_name, 'Yapi Kredi');
assert.equal(incoming.transaction_date, '2026-06-25');
assert.equal(incoming.transaction_time, '11:49');
assert.equal(incoming.amount_in, 17500);
assert.equal(incoming.amount_out, 0);
assert.equal(incoming.detected_type, 'tahsilat');

const outgoing = one(
  'VakifBank Bilgilendirme: Vergi Otomatik Odeme\n26.06.2026 13:03 tarihli vergi otomatik ödeme 1.250,50 TL tahsil edilmiştir. Bakiye 20.000,00 TL',
  { bank: 'vakifbank', subject: 'Bilgilendirme: Vergi Otomatik Odeme' }
);
assert.equal(outgoing.bank_name, 'VakifBank');
assert.equal(outgoing.amount_in, 0);
assert.equal(outgoing.amount_out, 1250.5);
assert.equal(outgoing.balance_after, 20000);
assert.equal(outgoing.detected_type, 'vergi');

const fee = one(
  'FAST Elektronik fon transferi ücreti -15,96 TL 26 Haziran 2026 09:27 tarihinde hesabınızdan alınmıştır.',
  { bank: 'isbank', subject: 'FAST Ücret Bilgilendirme' }
);
assert.equal(fee.bank_name, 'Turkiye Is Bankasi');
assert.equal(fee.amount_out, 15.96);
assert.equal(fee.detected_type, 'banka_masrafi');

const maskedOnly = parseBankStatement(
  'Yapi Kredi Gelen EFT: 95XXX412 TL / TR520006701000000095XX hesabınıza bilgi amaçlıdır.',
  { bank_hint: 'yapikredi', mail_subject: 'Akilli Asistan-Gelen EFT', attachment_name: 'mail_body' }
);
assert.equal(maskedOnly.length, 0);

console.log('OK mail body bank notification parser');
