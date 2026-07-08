# AperiON iSTasyon – Changelog

## 2026-07-08

### Yapılanlar

- AperiON iSTasyon için `/docs` klasörü başlatıldı.
- `VISION.md` oluşturuldu.
- `ARCHITECTURE.md` oluşturuldu.
- `DATABASE.md` oluşturuldu.
- `BANK_RULES.md` oluşturuldu.
- `GMAIL_RULES.md` oluşturuldu.
- `BIZIMHESAP_RULES.md` oluşturuldu.
- `TELEGRAM_RULES.md` oluşturuldu.
- `AUTOMATION_RULES.md` oluşturuldu.
- `UI_STANDARDS.md` oluşturuldu.
- `ROADMAP.md` oluşturuldu.

### Kararlar

- Doğru proje adı: AperiON iSTasyon.
- Operasyon Merkezi tek ana ekran olacak.
- İş Bankası banka mutabakatı pilot iş olarak kabul edildi.
- Kullanıcı onayı olmadan BizimHesap'a finansal kayıt yazılmayacak.
- POS kredi kartı tahsilatlarının ertesi gün bankaya yatması tahsilat değil transfer sayılacak.
- Telegram onay mesajlarında kanıt zorunlu olacak.
- Mükerrer kayıt kontrolü `bank_row_key` ve `duplicate_key` ile zorunlu tutulacak.

### Kalanlar

- Yanlış isimlerin repo içinde taranması ve raporlanması.
- İş Bankası ID 33-35 onay durumunun doğrulanması.
- Onaylı kayıtların BizimHesap'a işlenmesi.
- İşlem sonrası BizimHesap doğrulamasının yapılması.
- Operasyon Merkezi ana ekranının bu kurallara göre revize edilmesi.
