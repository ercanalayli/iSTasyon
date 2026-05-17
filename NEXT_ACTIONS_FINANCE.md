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

v52 ile eklenen yeni kontroller:

```text
telegram:critical-risk-v52:test
verify:risk-alert-dedup-v52
risk_alert_sent_log
risk_alert_can_send_v52
risk_alert_mark_sent_v52
buildRiskKey
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

## 4. Finans Takvimi canlı SQL sırası

Finans Takvimi / Satış Akışı / Risk Merkezi için SQL sırası:

```text
1. finance/AperiON_Sales_Flow_Today_SQL_v46.sql
2. finance/AperiON_Finance_Calendar_Live_SQL_v47.sql
3. finance/AperiON_Finance_Calendar_Seed_v47.sql
4. finance/AperiON_Finance_Calendar_Actions_SQL_v48.sql
5. finance/AperiON_Finance_Risk_Engine_SQL_v49.sql
6. finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql
```

v52 notu:

- v52 sadece alarm tekrarını engelleyen log katmanıdır.
- Var olan risk feed yapısını bozmaz.
- `aperion_risk_feed_v49_view` okumaya devam eder.
- Aynı risk için cooldown dolmadan tekrar Telegram mesajı göndermez.

## 5. Live-ready Komuta Merkezi ekranı bağla

1. Siteyi aç.
2. `finans-komuta-merkezi.html` sayfasına gir.
3. `Canlıya Hazır Komuta Merkezini Aç` seç.
4. `Canlı Bağlantı` bölümüne gir.
5. Supabase URL ve anon key gir.
6. `Kaydet ve Bağlan` butonuna bas.

Başarılıysa ekran `CANLI MOD` gösterir. Hata olursa demo moda düşer; bu beklenen güvenli davranıştır.

## 6. Supabase bağlantı testi

Yerelde `.env` içine şunları gir:

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

Sonra çalıştır:

```bash
npm run finance-test-supabase
npm run telegram:critical-risk-v52:test
npm run verify:risk-alert-dedup-v52
npm test
```

Bu testler hem Finans Takvimi / Komuta Merkezi dosyalarını hem de v52 tekrar alarm engelini kontrol eder.

## 7. Telegram kritik risk alarmı v52 canlı kullanım

v51 dosyası korunur. Canlı scheduler tarafında eski komut:

```bash
npm run telegram:critical-risk-v51
```

yerine şu komuta geçilecek:

```bash
npm run telegram:critical-risk-v52
```

Windows Task Scheduler rehberi:

```text
telegram/AperiON_Risk_Alert_Dedup_Scheduler_v52.md
```

Önerilen çalışma:

```text
Sıklık: Saatte 1
Cooldown: 360 dakika
```

Bu ayarla aynı risk 6 saat içinde tekrar Telegram'a gönderilmez.

## 8. Telegram alarm altyapısı durumu

Önceki not:

- v51 kritik risk alarmı kurulmuştu.
- v52 ile tekrar alarm engeli eklendi.
- Telegram aksiyon butonları ve risk komutları ayrıca korunuyor.

v52 sonrası güvenli akış:

1. `aperion_risk_feed_v49_view` riskleri üretir.
2. `telegram/aperion_critical_risk_alert_v52.js` riskleri okur.
3. Her risk için `risk_key` üretir.
4. `risk_alert_can_send_v52` RPC ile cooldown kontrolü yapılır.
5. Sadece yeni risk Telegram'a gönderilir.
6. Başarılı gönderimden sonra `risk_alert_mark_sent_v52` RPC ile log yazılır.
7. Gönderilen/engellenen alarmlar `aperion_risk_alert_dedup_status_v52_view` üzerinden izlenir.

## 9. Korunan kurallar

- Ana modül: Finans Komuta Merkezi.
- Çekirdekler: Yapılacaklar, Ödenecekler, Tahsil Edilecekler.
- Grafik kullanılmaz.
- Mevcut sistem silinmez.
- Eski Finans Takvimi korunur ama ana öncelik değildir.
- Firma bazlı izolasyon korunur: `alayli`, `woodlet`, `elit`, `odyoform`, `alkam`, `yenicespor`.
- Doğrulanmamış veri kesin sonuç gibi gösterilmez.
- Her kayıtta tarih, kaynak, durum ve doğrulama bilgisi bulunur.
- Telegram işlemleri doğrudan kesin kayıt oluşturmaz; önce log + onay katmanına düşer.
- v52 sadece risk alarm logu yazar; finans ana kayıtlarını değiştirmez.
