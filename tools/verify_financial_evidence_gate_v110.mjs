import assert from 'node:assert/strict';
import { parseBankStatement } from '../automation/parsers/index.js';

function parse(text, meta = {}) {
  return parseBankStatement(text, {
    company_id: 'alayli',
    source: 'gmail_bank_notification',
    mailbox: 'alaylimedikal@gmail.com',
    attachment_name: 'mail_body',
    mail_subject: meta.subject || '',
    mail_from: meta.from || '',
    mail_date: meta.date || 'Tue, 07 Jul 2026 12:00:00 +0300',
    bank_hint: meta.bankHint || ''
  });
}

const marketing = parse(
  'Bilgi: Saat & Saat Halka Arz Ediliyor Saat ve Saat Sanayi ve Ticaret A.S. Halka Arz Ediliyor! Talep fiyati 56,00 TL.',
  {
    bankHint: 'yapikredi',
    subject: 'Bilgi: Saat & Saat Halka Arz Ediliyor',
    from: 'bildirim@yapikredi.com.tr'
  }
);
assert.deepEqual(marketing, [], 'Pazarlama/halka arz maili finansal hareket uretmemeli');

const bankMismatch = parse(
  'VAKIFBANK - FAST Anlik Odeme Bilgilendirmesi 07.07.2026 10:34 712,00 TL',
  {
    bankHint: 'isbank Türkiye İş Bankası',
    subject: 'Hesap Hareket Bilgilendirmesi',
    from: 'bilgi@isbank.com.tr'
  }
);
assert.deepEqual(bankMismatch, [], 'Kaynak banka ile govde bankasi uyusmuyorsa hareket uretilmemeli');

const priceOnly = parse(
  'Yeni urunumuzun kampanyali fiyati 1.250,00 TL. Detaylar icin tiklayiniz.',
  {
    bankHint: 'akbank',
    subject: 'Size ozel kampanya',
    from: 'kampanya@akbank.com'
  }
);
assert.deepEqual(priceOnly, [], 'Islem fiili olmayan fiyat metni finansal hareket uretilmemeli');

const incoming = parse(
  '25/06/2026 11:49 tarihinde ERHAN ALAYLI tarafindan hesabiniza 17.500,00 TL para gonderildi.',
  {
    bankHint: 'yapikredi',
    subject: 'Akilli Asistan-Gelen EFT',
    from: 'bildirim@yapikredi.com.tr'
  }
);
assert.equal(incoming.length, 1, 'Gercek gelen EFT bildirimi korunmali');
assert.equal(incoming[0].amount_in, 17500);
assert.equal(incoming[0].amount_out, 0);

const taxPayment = parse(
  '26.06.2026 13:03 tarihli vergi otomatik odeme 1.250,50 TL tahsil edilmistir. Bakiye 20.000,00 TL',
  {
    bankHint: 'vakifbank',
    subject: 'Bilgilendirme: Vergi Otomatik Odeme',
    from: 'bildirim@vakifbank.com.tr'
  }
);
assert.equal(taxPayment.length, 1, 'Gercek vergi odeme bildirimi korunmali');
assert.equal(taxPayment[0].amount_in, 0);
assert.equal(taxPayment[0].amount_out, 1250.5);

console.log('Financial evidence gate regression tests passed.');
