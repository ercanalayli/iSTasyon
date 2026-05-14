# AperiON Finans Takvimi Kurulum Rehberi

Bu rehber AperiON / ErpaltH iSTasyon projesindeki Finans Takvimi ve Nakit Akışı Merkezi için hazırlanmıştır.

## 1. Ana dosyalar

- `finans-takvimi.html`: Güvenli başlatıcı sayfa.
- `aperion-finans-takvimi-live.html`: Canlıya hazır finans ekranı.
- `aperion-finans-takvimi.html`: Eski/demo finans ekranı.
- `finance_dashboard_embed.html`: Ana dashboard içine gömülebilir iframe section.
- `scripts/inject_finance_into_index.cjs`: index.html içine güvenli Finans Takvimi linki ekler.
- `scripts/verify_finance_index_link.cjs`: index.html içinde finans linki var mı kontrol eder.

## 2. Supabase dosyaları

- `SUPABASE_FINANCE_INSTALL_ALL.sql`: Tek dosyalık hızlı kurulum.
- `supabase_finans_takvimi_schema.sql`: Şema dosyası.
- `supabase_finans_demo_seed.sql`: Demo/test verileri.
- `supabase_finans_validation_safe.sql`: Güvenli constraint / validation kurulumu.
- `supabase_finans_rls_policies.sql`: RLS / policy taslağı.
- `supabase_finans_health_check.sql`: Kurulum sonrası kontrol sorguları.

## 3. En güvenli Supabase kurulum sırası

1. Supabase Dashboard aç.
2. SQL Editor bölümüne gir.
3. Önce `SUPABASE_FINANCE_INSTALL_ALL.sql` dosyasını çalıştır.
4. Sonra `supabase_finans_validation_safe.sql` dosyasını çalıştır.
5. Sonra `supabase_finans_health_check.sql` dosyasını çalıştır ve sonuçları kontrol et.
6. Auth yapısı netleşince `supabase_finans_rls_policies.sql` dosyasını kontrollü uygula.

Not: `supabase_finans_validation.sql` yerine mümkünse `supabase_finans_validation_safe.sql` kullan. Safe sürüm constraint var mı kontrol ederek ekler.

## 4. Alternatif runner

```bash
npm install
cp .env.example .env
node supabase_finance_migration_runner.js
node supabase_finance_migration_runner.js --seed
```

Not: Runner, Supabase tarafında `exec_sql(sql_text text)` RPC fonksiyonu yoksa çalışmaz. Bu durumda SQL Editor kullan.

## 5. Live-ready ekran bağlantısı

`finans-takvimi.html` başlatıcıdır. Buradan `aperion-finans-takvimi-live.html` açılır.

Live-ready ekranda:

1. Canlı Bağlantı sekmesine gir.
2. Supabase URL gir.
3. Supabase anon key gir.
4. Kaydet ve Bağlan butonuna bas.

Bağlantı başarılıysa `finance_calendar_records` tablosundan canlı veri okunur. Bağlantı yoksa demo mod çalışır.

## 6. Ana index.html içine güvenli gömme

Önerilen yol GitHub Actions:

1. GitHub > Actions aç.
2. `Inject AperiON Finance Link` workflow'unu seç.
3. `Run workflow` butonuna bas.
4. Workflow hem linki ekler hem `npm run finance-verify-index` ile doğrular.

Yerel alternatif:

```bash
npm run finance-inject-index
npm run finance-verify-index
```

## 7. Onay Merkezi akışı

Kaynak veri doğrudan kesin kayıt olmaz:

Kaynak veri → normalize → güven puanı → Onay Merkezi → kullanıcı onayı → kesin finans kaydı

Onaylanınca:

- `approval_status = onaylandi`
- `status = bekliyor`

Reddedilince:

- `approval_status = reddedildi`
- `status = iptal`

## 8. Moka United akışı

POS tahsilatı önce Moka United hesabında bekler. Bankaya geçiş tarihi takip edilir. Banka hareketi geldiğinde `moka_united_reconciliation.js` güven puanlı eşleşme önerisi üretir. Onaydan sonra tahsilat kesinleşir.

## 9. Çek / senet / ödeme tarihi

Asıl vade tarihi korunur. Fiili ödeme tarihi hafta sonu veya Türkiye resmi tatiline denk gelirse ilk iş gününe taşınır.

## 10. Test komutları

```bash
npm run finance-smoke
npm run finance-pipeline-demo
npm run finance-verify-index
```

## 11. Korunan kurallar

- ALKAM Mali adı kullanılmaz.
- AperiON / ErpaltH iSTasyon projesidir.
- Şirketler korunur: `alayli`, `woodlet`, `elit`, `odyoform`, `alkam`, `yenicespor`.
- Mevcut index.html özellikleri silinmez.
- Supabase / Chart.js / tek dosya frontend mantığı korunur.
- Kullanıcı onayı olmadan kesin finans kaydı yapılmaz.
