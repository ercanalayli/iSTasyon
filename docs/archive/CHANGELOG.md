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
- `OPERATING_MODEL.md`, `CHATGPT_CONTINUITY_PROTOCOL.md`, `START_HERE.md`, `SESSION_STATE.md`, `NEXT_ACTION.md`, `PERSONAL_FINANCE_RULES.md`, `FINANCIAL_DATA_STANDARDS.md` ve `DASHBOARD_BLUEPRINT.md` eklendi.
- Banka sınıflandırma motorunda POS banka yatışları düzeltildi: `POS tahsilati` yerine `POS banka transferi`, hedef olarak da `BizimHesap hesaplar arasi transfer` kullanılacak.
- POS banka aktarım planına `source_account` ve `target_account` alanları eklendi. Kaynak hesap standardı: `POS POS POS KREDI KARTI`; hedef hesap: paranın yattığı banka hesabı.
- Banka onay aday seçim motoru pilot banka kuralına göre düzeltildi. İş Bankası pilot banka olarak önceliklendirilir; pilot aday varsa Yapı Kredi/Akbank/VakıfBank gibi farklı banka adayları ilk sıraya alınmaz.
- Aday seçim skorunda eski `POS tahsilati` ödülü kaldırıldı; doğru `POS banka transferi / POS banka aktarimi` sınıfı pozitif kriter yapıldı.
- `verify_bank_candidate_pilot_scope_v83.cjs` testi eklendi. Bu test, Yapı Kredi veya VakıfBank daha cazip görünse bile İş Bankası pilot adayı varsa ilk adayın İş Bankası olmasını zorunlu tutar.
- `AperiON Bank Approval Status` workflow'u `BANK_APPROVAL_PILOT_BANK=IS BANKASI` ile çalışacak ve pilot kapsam testi geçmeden banka onay status raporu üretmeyecek şekilde güncellendi.
- BizimHesap worker uyumu için POS banka transferi teknik `kind` değeri `bank_transfer` yoluna alındı. Kullanıcıya görünen `type` yine `POS banka transferi` olarak kalır. Böylece kayıt motoru tahsilat ekranına değil transfer/hesaplar arası işlem yoluna gider.
- POS transfer smoke testi güncellendi: POS banka yatışı worker tarafında `bank_transfer` yoluna gitmeli, kaynak hesap `POS POS POS KREDI KARTI`, hedef hesap paranın yattığı banka hesabı olarak korunmalı.
- `aperion-home-v3.html` Operasyon Merkezi kokpitine çevrildi. Başlık `AperiON iSTasyon – Operasyon Merkezi` yapıldı, `ErpaltH` canlı başlık izi kaldırıldı, ana kartlar eklendi.
- Operasyon kokpitine Bankalar, BizimHesap, Moka/POS, Kredi Kartları, Faturalar/Abonelikler, Şahsi Finans ve Sistem Sağlığı kartları eklendi.
- Operasyon kokpiti `data/aperion_bank_approval_unified_status.json` dosyasını okuyarak safe mode, canlı save, ready queue, eksik kanıt ve seçili banka adayı bilgisini göstermeye başladı.

### Kararlar

- Doğru proje adı: AperiON iSTasyon.
- Operasyon Merkezi tek ana ekran olacak.
- İş Bankası banka mutabakatı pilot iş olarak kabul edildi.
- Kullanıcı onayı olmadan BizimHesap'a finansal kayıt yazılmayacak.
- POS kredi kartı tahsilatlarının ertesi gün bankaya yatması tahsilat değil transfer sayılacak.
- Telegram onay mesajlarında kanıt zorunlu olacak.
- Mükerrer kayıt kontrolü `bank_row_key` ve `duplicate_key` ile zorunlu tutulacak.
- Şahsi finans, ALAYLI şirket mutabakatından ayrı tutulacak.

### Kalanlar

- Yanlış isimlerin repo içinde kontrollü temizliği.
- İş Bankası ID 33-35 onay durumunun gerçek sistem kanıtıyla doğrulanması.
- Onaylı kayıtların BizimHesap'a işlenmeden önce dry-run planının üretilmesi.
- İşlem sonrası BizimHesap doğrulamasının yapılması.
- Yeni pilot banka aday seçimiyle `data/banka_onay_guvenli_adaylar.json` ve `data/aperion_bank_approval_unified_status.json` dosyalarının workflow tarafından yeniden üretilmesi.
- Operasyon kokpiti için gerçek Gmail, kredi kartı, fatura/abonelik ve şahsi finans data JSON kaynakları bağlanmalı.
