# AperiON Finans Komuta Merkezi Kurulum Rehberi

Bu rehber AperiON / ErpaltH iSTasyon projesinde yeni ana finans modülü olan **Finans Komuta Merkezi** için hazırlanmıştır.

Ana çekirdekler:

```text
1. Yapılacaklar
2. Ödenecekler
3. Tahsil Edilecekler
```

Ek yapı:

```text
Telegram alarm altyapısı + v52 tekrar alarm engeli
```

## 1. Ana linkler

```text
Başlatıcı:
https://ercanalayli.github.io/iSTasyon/finans-komuta-merkezi.html

Canlıya hazır Komuta Merkezi:
https://ercanalayli.github.io/iSTasyon/finance-command-center-live.html

Demo Komuta Merkezi:
https://ercanalayli.github.io/iSTasyon/finance-command-center.html
```

## 2. Ana Komuta Merkezi dosyaları

- `finans-komuta-merkezi.html`: Komuta Merkezi başlatıcı sayfası.
- `finance-command-center-live.html`: Supabase varsa canlı, yoksa demo çalışan ekran.
- `finance-command-center.html`: Demo Komuta Merkezi ekranı.
- `finance_command_center_adapter.js`: Supabase okuma / gruplama / özetleme adapter'ı.
- `scripts/inject_command_center_into_index.cjs`: `index.html` içine Komuta Merkezi linkini güvenli ekler.
- `.github/workflows/command-center-inject-index.yml`: Telefonda GitHub Actions üzerinden link ekleme workflow'u.

## 3. AperiON ana dashboard içine bağlama

Modül dosyaları eklendi. Ana `index.html` içine görünür link eklemek için önerilen yol GitHub Actions'tır:

1. GitHub > `ercanalayli/iSTasyon` reposunu aç.
2. `Actions` sekmesine gir.
3. `Inject AperiON Finance Command Center Link` workflow'unu seç.
4. `Run workflow` butonuna bas.
5. Workflow tamamlanınca `index.html` içinde `finans-komuta-merkezi.html` linki oluşur.

Yerel alternatif:

```bash
npm run command-center-inject-index
npm run command-center-verify-index
```

Bu işlem:

- `index.html` dosyasını önce yedekler.
- Sidebar varsa linki sidebar içine ekler.
- Sidebar bulunamazsa güvenli floating link ekler.
- Eski Finans Takvimi linkini/dosyasını silmez.
- Link eklendikten sonra `command-center-verify-index` ile doğrular.

## 4. Komuta Merkezi Supabase kurulumu

Supabase Dashboard > SQL Editor içinde sırasıyla çalıştırılacak dosyalar:

```text
1. SUPABASE_COMMAND_CENTER_INSTALL.sql
2. supabase_command_center_health_check.sql
```

`SUPABASE_COMMAND_CENTER_INSTALL.sql` şu yapıları kurar:

- `finance_command_center_records`
- `finance_command_center_action_log`
- `finance_telegram_alarm_queue`
- `finance_command_center_today`
- `finance_command_center_late`
- `finance_command_center_alarm_candidates`

`supabase_command_center_health_check.sql` şu kontrolleri yapar:

- Ana tablo / aksiyon logu / Telegram alarm kuyruğu var mı?
- Bugünkü kayıtlar okunuyor mu?
- Geciken kayıtlar okunuyor mu?
- Alarm adayları özetleniyor mu?
- Doğrulanmamış / onay bekleyen kayıtlar ayrışıyor mu?

## 5. Finans Takvimi / Risk Merkezi canlı SQL sırası

Satış Akışı, Finans Takvimi, aksiyon RPC'leri, Risk Merkezi ve v52 tekrar alarm engeli için sıra:

```text
1. finance/AperiON_Sales_Flow_Today_SQL_v46.sql
2. finance/AperiON_Finance_Calendar_Live_SQL_v47.sql
3. finance/AperiON_Finance_Calendar_Seed_v47.sql
4. finance/AperiON_Finance_Calendar_Actions_SQL_v48.sql
5. finance/AperiON_Finance_Risk_Engine_SQL_v49.sql
6. finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql
```

v52'nin kurduğu ana yapılar:

```text
risk_alert_sent_log
risk_alert_can_send_v52
risk_alert_mark_sent_v52
aperion_risk_alert_dedup_status_v52_view
```

v52 güvenlik notu:

- v52 sadece risk alarm gönderim logu yazar.
- Ana finans kayıtlarını, cari kayıtlarını, satış kayıtlarını, ödeme/tahsilat kayıtlarını değiştirmez.
- Mevcut v51 dosyası korunur.
- Canlı scheduler otomatik değiştirilmez; önce test ve onay gerekir.

## 6. Live-ready ekran bağlantısı

1. `finans-komuta-merkezi.html` sayfasını aç.
2. `Canlıya Hazır Komuta Merkezini Aç` butonuna bas.
3. `Canlı Bağlantı` bölümünü aç.
4. Supabase URL gir.
5. Supabase anon key gir.
6. `Kaydet ve Bağlan` butonuna bas.

Başarılıysa ekran `CANLI MOD` gösterir. Hata olursa ekran bozulmaz, demo moda döner.

## 7. Supabase / Telegram ENV ayarları

Yerelde `.env` içine `.env.example` dosyasına göre şunları gir:

```env
SUPABASE_URL=https://PROJE.supabase.co
SUPABASE_ANON_KEY=ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN=BOT_TOKEN
TELEGRAM_CHAT_ID=CHAT_ID
COMPANY=ALAYLI
RISK_ALERT_LEVEL=high
RISK_ALERT_COOLDOWN_MINUTES=360
```

Not:

- `SUPABASE_ANON_KEY` web canlı ekran için kullanılır.
- `SUPABASE_SERVICE_ROLE_KEY` yerel bot / Telegram risk alarmı için gerekir.
- Gerçek key'ler GitHub'a yazılmaz.

## 8. Supabase bağlantı testi

Sonra çalıştır:

```bash
npm run finance-test-supabase
```

Bu test hem eski Finans Takvimi hem yeni Finans Komuta Merkezi tablolarını kontrol eder.

## 9. Full Check ve v52 testleri

GitHub Actions içinde `AperiON Finance Full Check` workflow'unu çalıştır veya yerelde:

```bash
npm run telegram:critical-risk-v52:test
npm run verify:risk-alert-dedup-v52
npm test
```

Bu testler şunları kontrol eder:

- Finans Komuta Merkezi dosyaları var mı?
- Live-ready ekran Supabase tablosunu okuyor mu?
- Demo fallback var mı?
- Grafik/canvas yok mu?
- Komuta Merkezi SQL installer ana tabloları içeriyor mu?
- Komuta Merkezi health check SQL var mı?
- BizimHesap demo pipeline çalışıyor mu?
- Moka demo pipeline çalışıyor mu?
- Manifest doğrulaması geçiyor mu?
- v52 risk key üretimi çalışıyor mu?
- v52 cooldown skip mantığı çalışıyor mu?
- v52 gönderildi loglama RPC çağrısı kodda var mı?

## 10. Eski Finans Takvimi durumu

Eski Finans Takvimi dosyaları silinmedi. Korunan yardımcı modül olarak kalır:

- `finans-takvimi.html`
- `aperion-finans-takvimi.html`
- `aperion-finans-takvimi-live.html`
- `SUPABASE_FINANCE_INSTALL_ALL.sql`

Ana öncelik artık Finans Komuta Merkezi'dir.

## 11. Telegram kritik risk alarmı v52

Hazır olan v52 dosyaları:

```text
telegram/aperion_critical_risk_alert_v52.js
telegram/aperion_critical_risk_alert_v52_test_runner.js
telegram/AperiON_Risk_Alert_Dedup_Scheduler_v52.md
finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql
```

Canlı tek sefer çalıştırma:

```bash
npm run telegram:critical-risk-v52
```

Eski canlı scheduler komutu:

```bash
npm run telegram:critical-risk-v51
```

testler temizlendikten sonra şu komuta çevrilecek:

```bash
npm run telegram:critical-risk-v52
```

Önerilen ayar:

```text
Çalışma sıklığı: Saatte 1
Cooldown: 360 dakika
```

Bu ayarla aynı risk 6 saat içinde tekrar Telegram'a gönderilmez.

## 12. Korunan kurallar

- Mevcut sistem silinmez.
- Büyük refactor yapılmaz.
- Grafik kullanılmaz.
- Ürün kartı / cari kartı işine bu turda girilmez.
- Firma bazlı izolasyon korunur: `alayli`, `woodlet`, `elit`, `odyoform`, `alkam`, `yenicespor`.
- Doğrulanmamış veri kesin sonuç gibi gösterilmez.
- Her kayıtta tarih, kaynak, durum ve doğrulama bilgisi bulunur.
- Telegram işlemleri doğrudan kesin kayıt oluşturmaz; önce log + onay katmanına düşer.
- v52 sadece risk alarm logu yazar; finans ana kayıtlarını değiştirmez.
