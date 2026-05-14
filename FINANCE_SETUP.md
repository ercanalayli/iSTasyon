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
Telegram alarm altyapısı
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

## 5. Live-ready ekran bağlantısı

1. `finans-komuta-merkezi.html` sayfasını aç.
2. `Canlıya Hazır Komuta Merkezini Aç` butonuna bas.
3. `Canlı Bağlantı` bölümünü aç.
4. Supabase URL gir.
5. Supabase anon key gir.
6. `Kaydet ve Bağlan` butonuna bas.

Başarılıysa ekran `CANLI MOD` gösterir. Hata olursa ekran bozulmaz, demo moda döner.

## 6. Supabase bağlantı testi

Yerelde `.env` içine şunları gir:

```env
SUPABASE_URL=https://PROJE.supabase.co
SUPABASE_ANON_KEY=ANON_KEY
```

Sonra çalıştır:

```bash
npm run finance-test-supabase
```

Bu test hem eski Finans Takvimi hem yeni Finans Komuta Merkezi tablolarını kontrol eder.

## 7. Full Check

GitHub Actions içinde `AperiON Finance Full Check` workflow'unu çalıştır veya yerelde:

```bash
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

## 8. Eski Finans Takvimi durumu

Eski Finans Takvimi dosyaları silinmedi. Korunan yardımcı modül olarak kalır:

- `finans-takvimi.html`
- `aperion-finans-takvimi.html`
- `aperion-finans-takvimi-live.html`
- `SUPABASE_FINANCE_INSTALL_ALL.sql`

Ana öncelik artık Finans Komuta Merkezi'dir.

## 9. Telegram alarm altyapısı

Bu aşamada tam bot entegrasyonu yapılmadı. Hazır olan altyapı:

- `finance_telegram_alarm_queue`
- `finance_command_center_action_log`
- Telegram alarm adayı kartları
- Live ekranda Telegram Alarm Merkezi alanı

Sonraki aşamada kurulacak akış:

1. Alarm kuyruğu okunur.
2. Kritik alarm Telegram'a gönderilir.
3. Telegram'dan gelen tamamlandı / ertelendi / not işlemi önce loglanır.
4. İşlem kesin kayıt olmaz; onay katmanına düşer.

## 10. Korunan kurallar

- Mevcut sistem silinmez.
- Büyük refactor yapılmaz.
- Grafik kullanılmaz.
- Ürün kartı / cari kartı işine bu turda girilmez.
- Firma bazlı izolasyon korunur: `alayli`, `woodlet`, `elit`, `odyoform`, `alkam`, `yenicespor`.
- Doğrulanmamış veri kesin sonuç gibi gösterilmez.
- Her kayıtta tarih, kaynak, durum ve doğrulama bilgisi bulunur.
- Telegram işlemleri doğrudan kesin kayıt oluşturmaz; önce log + onay katmanına düşer.
