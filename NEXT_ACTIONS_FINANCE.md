# AperiON Finans Komuta Merkezi - Sonraki Aksiyonlar

Bu dosya, yeni ana öncelik olan Finans Komuta Merkezi için kalan işlemleri telefondan veya GitHub arayüzünden net şekilde bitirmek için hazırlanmıştır.

## Ana linkler

```text
Başlatıcı:
https://ercanalayli.github.io/iSTasyon/finans-komuta-merkezi.html

Live-ready ekran:
https://ercanalayli.github.io/iSTasyon/finance-command-center-live.html

Demo ekran:
https://ercanalayli.github.io/iSTasyon/finance-command-center.html
```

## 1. index.html içine Finans Komuta Merkezi linkini işle

GitHub ekranında:

1. Repo aç: `ercanalayli/iSTasyon`
2. `Actions` sekmesine gir.
3. `Inject AperiON Finance Command Center Link` workflow'unu seç.
4. `Run workflow` butonuna bas.
5. Workflow bitince son committe `index.html` değişmiş mi kontrol et.

Beklenen sonuç:

- Sidebar içine `Finans Komuta` linki eklenir.
- Link `finans-komuta-merkezi.html` sayfasını açar.
- Eğer sidebar bulunamazsa sağ altta güvenli floating link eklenir.
- Eski Finans Takvimi linki/dosyası silinmez.

## 2. Full Check çalıştır

GitHub Actions içinde `AperiON Finance Full Check` workflow'unu çalıştır veya yerelde:

```bash
npm install
npm test
```

Beklenen ana kontroller:

```text
OK schema files
OK finance command center files
OK sales summary
OK sales dashboard adapter source
OK business calendar source
OK pipeline
OK Moka pipeline
AperiON Finans smoke test başarılı.
AperiON Finans manifest doğrulaması başarılı.
```

## 3. Supabase Komuta Merkezi tablolarını kur

Supabase Dashboard > SQL Editor içine şunu çalıştır:

```text
SUPABASE_COMMAND_CENTER_INSTALL.sql
```

Beklenen yapılar:

- `finance_command_center_records`
- `finance_command_center_action_log`
- `finance_telegram_alarm_queue`
- `finance_command_center_today`
- `finance_command_center_late`
- `finance_command_center_alarm_candidates`

## 4. Live-ready Komuta Merkezi ekranı bağla

1. Siteyi aç.
2. `finans-komuta-merkezi.html` sayfasına gir.
3. `Canlıya Hazır Komuta Merkezini Aç` seç.
4. `Canlı Bağlantı` bölümüne gir.
5. Supabase URL ve anon key gir.
6. `Kaydet ve Bağlan` butonuna bas.

Başarılıysa ekran `CANLI MOD` gösterir. Hata olursa demo moda düşer; bu beklenen güvenli davranıştır.

## 5. Supabase bağlantı testi

Yerelde `.env` içine şunları gir:

```env
SUPABASE_URL=https://PROJE.supabase.co
SUPABASE_ANON_KEY=ANON_KEY
```

Sonra çalıştır:

```bash
npm run finance-test-supabase
```

Bu test hem Finans Takvimi hem Komuta Merkezi tablolarını kontrol eder.

## 6. Telegram alarm altyapısı sonraki aşama

Bu turda tam bot entegrasyonu yapılmadı. Sonraki aşamada kurulacak akış:

1. `finance_telegram_alarm_queue` bekleyen alarm kayıtlarını okur.
2. Kritik alarmı Telegram'a gönderir.
3. Telegram'dan gelen tamamlandı / ertelendi / not işlemleri önce loglanır.
4. İşlem `finance_command_center_action_log` tablosuna düşer.
5. Kullanıcı onayı olmadan kesin kayıt yapılmaz.

## 7. Korunan kurallar

- Ana modül: Finans Komuta Merkezi.
- Çekirdekler: Yapılacaklar, Ödenecekler, Tahsil Edilecekler.
- Grafik kullanılmaz.
- Mevcut sistem silinmez.
- Eski Finans Takvimi korunur ama ana öncelik değildir.
- Firma bazlı izolasyon korunur: `alayli`, `woodlet`, `elit`, `odyoform`, `alkam`, `yenicespor`.
- Doğrulanmamış veri kesin sonuç gibi gösterilmez.
- Her kayıtta tarih, kaynak, durum ve doğrulama bilgisi bulunur.
- Telegram işlemleri doğrudan kesin kayıt oluşturmaz; önce log + onay katmanına düşer.
