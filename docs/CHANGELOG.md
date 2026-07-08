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
- `REPO_AUDIT_2026-07-08.md` oluşturuldu.
- Banka sınıflandırma motorunda POS banka yatışları düzeltildi: `POS tahsilati` yerine `POS banka transferi`, hedef olarak da `BizimHesap hesaplar arasi transfer` kullanılacak.
- POS banka aktarım planına `source_account` ve `target_account` alanları eklendi. Kaynak hesap standardı: `POS POS POS KREDI KARTI`; hedef hesap: paranın yattığı banka hesabı.

### Kararlar

- Doğru proje adı: AperiON iSTasyon.
- Operasyon Merkezi tek ana ekran olacak.
- İş Bankası banka mutabakatı pilot iş olarak kabul edildi.
- Kullanıcı onayı olmadan BizimHesap'a finansal kayıt yazılmayacak.
- POS kredi kartı tahsilatlarının ertesi gün bankaya yatması tahsilat değil transfer sayılacak.
- Telegram onay mesajlarında kanıt zorunlu olacak.
- Mükerrer kayıt kontrolü `bank_row_key` ve `duplicate_key` ile zorunlu tutulacak.

### Kalanlar

- Yanlış isimlerin repo içinde kontrollü temizliği.
- İş Bankası ID 33-35 onay durumunun gerçek sistem kanıtıyla doğrulanması.
- Onaylı kayıtların BizimHesap'a işlenmeden önce dry-run planının üretilmesi.
- İşlem sonrası BizimHesap doğrulamasının yapılması.
- Operasyon Merkezi ana ekranının bu kurallara göre revize edilmesi.
- `data/banka_onay_guvenli_adaylar.json`, `data/banka_onay_kuyruk_kaniti.json`, `data/banka_onay_aday_kanit_durumu.json` dosyalarının workflow çıktısı olarak gerçekten üretildiğinin kanıtlanması.
