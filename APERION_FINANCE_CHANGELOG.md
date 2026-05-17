# AperiON Finans Komuta Merkezi - Değişiklik Manifesti

Bu manifest, AperiON / ErpaltH iSTasyon reposunda finans modülleri için yapılan dosya bazlı değişiklikleri somut olarak izlemek için tutulur.

Yeni öncelik:

```text
Ana modül: Finans Komuta Merkezi
Çekirdekler: Yapılacaklar · Ödenecekler · Tahsil Edilecekler
Ek yapı: Telegram alarm altyapısı + v52 tekrar alarm engeli
```

Repo:

```text
ercanalayli/iSTasyon
```

## v52 - Risk Alarm Tekrar Engeli

| Dosya | Amaç | Durum |
|---|---|---|
| `finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql` | Telegram kritik risk alarmı için gönderildi logu, cooldown kontrolü ve RPC katmanı | Eklendi |
| `finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql` | v52 kurulum sonrası tablo/RPC/view/read-only kontrol SQL'i | Eklendi |
| `telegram/aperion_critical_risk_alert_v52.js` | v49 risk feed'i okuyup aynı riski cooldown içinde tekrar göndermeyen Telegram alarm modülü | Eklendi |
| `telegram/aperion_critical_risk_alert_v52_test_runner.js` | v52 risk key, cooldown skip ve loglama testleri | Eklendi |
| `telegram/AperiON_Risk_Alert_Dedup_Scheduler_v52.md` | Windows Task Scheduler / manuel kullanım ve v51'den v52'ye geçiş rehberi | Eklendi |
| `telegram/AperiON_Risk_Alert_Dedup_Rollback_v52.md` | v52 sorununda dosya silmeden sadece scheduler komutunu v51'e alma rehberi | Eklendi |
| `telegram/AperiON_Risk_Alert_Dedup_GoLive_Checklist_v52.md` | SQL, ENV, test, CI, canlı deneme, scheduler ve rollback için tek sayfalık canlıya alma checklist'i | Eklendi |
| `tools/verify_risk_alert_dedup_v52.js` | v52 dosya, SQL, RPC, komut ve bot kontrol script'i | Eklendi |
| `scripts/verify_finance_manifest.cjs` | v52 dosyaları, workflow tetikleyicileri, env örnekleri, health check SQL'i, rollback/go-live rehberleri, kurulum dokümanı ve komutları manifest doğrulamasına eklendi | Güncellendi |
| `.github/workflows/finance-full-check.yml` | v52 test + verify adımları ve `finance/**`, `telegram/**`, `tools/**` tetikleyicileri eklendi | Güncellendi |
| `.env.example` | Telegram bot, chat id, company, risk seviyesi ve v52 cooldown örnekleri eklendi | Güncellendi |
| `FINANCE_SETUP.md` | v52 SQL sırası, health check, ENV, test, CI, scheduler geçişi ve rollback rehberi kurulum rehberine eklendi | Güncellendi |
| `NEXT_ACTIONS_FINANCE.md` | v52 SQL sırası, health check, ENV, test ve canlı scheduler geçişi yazıldı | Güncellendi |
| `package.json` | `telegram:critical-risk-v52`, `telegram:critical-risk-v52:test`, `verify:risk-alert-dedup-v52` komutları eklendi | Güncellendi |

v52 güvenlik notu:

```text
- Mevcut v51 dosyaları korunur.
- Dashboard/UI dosyalarına dokunulmaz.
- v52 sadece risk alarm logu yazar.
- v52 health check varsayılan olarak read-only çalışır.
- Rollback dosya silme değildir; sadece scheduler komutunu geçici olarak v51'e almaktır.
- Rollback sırasında risk_alert_sent_log silinmez.
- Finans ana kayıtları, cari kayıtları, satış kayıtları, ödeme/tahsilat kayıtları değiştirilmez.
- Canlı scheduler otomatik değiştirilmez; önce test ve onay gerekir.
```

## Ana Komuta Merkezi dosyaları

| Dosya | Amaç | Durum |
|---|---|---|
| `finans-komuta-merkezi.html` | Komuta Merkezi başlatıcı sayfası | Eklendi / live-ready ekrana yönlendirildi |
| `finance-command-center.html` | İlk demo Komuta Merkezi ekranı | Eklendi |
| `finance-command-center-live.html` | Supabase varsa canlı, yoksa demo çalışan Komuta Merkezi | Eklendi |
| `finance_command_center_adapter.js` | Komuta Merkezi okuma / gruplama / özetleme adapter'ı | Eklendi |
| `scripts/inject_command_center_into_index.cjs` | index.html içine Komuta Merkezi linki güvenli ekler | Eklendi |
| `.github/workflows/command-center-inject-index.yml` | Komuta Merkezi linkini index'e ekleyen workflow | Eklendi |

## Eski / yardımcı finans takvimi dosyaları

| Dosya | Amaç | Durum |
|---|---|---|
| `finans-takvimi.html` | Finans Takvimi başlatıcı sayfası | Korundu |
| `aperion-finans-takvimi.html` | İlk demo finans ekranı | Korundu |
| `aperion-finans-takvimi-live.html` | Finans Takvimi live-ready ekranı | Korundu |
| `finance_dashboard_embed.html` | Ana dashboard içine gömülebilir iframe section | Korundu |
| `APERION_FINANS_INTEGRATION_NOTES.md` | index.html entegrasyon notları | Korundu |
| `NEXT_ACTIONS_FINANCE.md` | Telefon/GitHub üzerinden kalan aksiyon rehberi | Güncellendi / v52 eklendi |
| `FINANCE_SETUP.md` | Kurulum rehberi | Güncellendi / v52 eklendi |

## Komuta Merkezi Supabase dosyaları

| Dosya | Amaç | Durum |
|---|---|---|
| `SUPABASE_COMMAND_CENTER_INSTALL.sql` | Komuta Merkezi tek dosyalık Supabase kurulumu | Eklendi |
| `supabase_finance_command_center_schema.sql` | Komuta Merkezi tablo / view şeması | Eklendi |
| `supabase_finance_command_center_seed.sql` | Komuta Merkezi demo/test verileri | Eklendi |

## Genel Supabase / veritabanı dosyaları

| Dosya | Amaç | Durum |
|---|---|---|
| `SUPABASE_FINANCE_INSTALL_ALL.sql` | Finans Takvimi tek dosyalık Supabase kurulum SQL'i | Korundu |
| `supabase_finans_takvimi_schema.sql` | Finans Takvimi tabloları ve view şeması | Korundu |
| `supabase_finans_demo_seed.sql` | Finans Takvimi demo/test verileri | Korundu |
| `supabase_finans_validation_safe.sql` | Güvenli validation kurulumu | Korundu |
| `supabase_finans_rls_policies.sql` | RLS / policy taslağı | Korundu |
| `supabase_finans_health_check.sql` | Kurulum sonrası kontrol sorguları | Korundu |
| `supabase_finance_migration_runner.js` | Supabase migration runner taslağı | Korundu |

## Entegrasyon / pipeline dosyaları

| Dosya | Amaç | Durum |
|---|---|---|
| `finance_import_bridge.js` | BizimHesap/banka/Moka ham hareketlerini finans kaydına normalize eder | Korundu |
| `finance_approval_center.js` | Onay Merkezi veri modeli | Korundu |
| `finance_approval_actions.js` | Onay / red aksiyonları | Korundu |
| `finance_supabase_adapter.js` | Supabase veri erişim katmanı | Korundu |
| `bizimhesap_finance_pipeline.cjs` | CommonJS uyumlu BizimHesap pipeline | Korundu |
| `moka_united_reconciliation.js` | Moka United mutabakat öneri motoru | Korundu |
| `moka_bank_pipeline.cjs` | Banka CSV'den Moka hareketlerini onay kuyruğuna çevirir | Korundu |
| `sales_report_import_bridge.js` | Satış raporlarını finans kuyruğuna hazırlayan köprü | Korundu |
| `sales_dashboard_adapter.js` | Satış KPI / müşteri / ürün / kategori adapter'ı | Korundu |
| `turkiye_business_calendar.js` | Türkiye iş günü / resmi tatil takvimi | Korundu / 2027 güncellendi |

## Test / örnek veri / workflow dosyaları

| Dosya | Amaç | Durum |
|---|---|---|
| `finance_smoke_test.cjs` | Finans ve Komuta Merkezi smoke test | Güncellendi |
| `scripts/verify_finance_manifest.cjs` | Manifest doğrulama script'i | Güncellendi / v52 eklendi |
| `test_data/bizimhesap_finance_sample.csv` | BizimHesap örnek export | Korundu |
| `test_data/moka_bank_sample.csv` | Moka banka örnek export | Korundu |
| `data/sales_report_summary_2025_2026.json` | Yüklenen satış raporları finans özeti | Korundu |
| `.github/workflows/finance-smoke.yml` | Finance smoke test workflow | Korundu |
| `.github/workflows/finance-inject-index.yml` | Finans Takvimi link workflow'u | Korundu |
| `.github/workflows/finance-full-check.yml` | Tek noktadan full finans kontrol workflow'u | Güncellendi / v52 eklendi |

## Güvenlik / config dosyaları

| Dosya | Amaç | Durum |
|---|---|---|
| `.env.example` | Ortam değişkeni örneği | Güncellendi / Telegram + v52 cooldown eklendi |
| `.gitignore` | Gerçek env/config/export dosyalarını korur | Korundu |
| `aperion-finans-config.example.js` | Supabase anon config örneği | Korundu |

## Özellikle korunmuş dosyalar

| Dosya | Durum |
|---|---|
| `index.html` | Körlemesine değiştirilmedi. Komuta Merkezi için güvenli patch script + workflow hazırlandı. |
| `telegram/aperion_critical_risk_alert_v51.js` | Korundu. v52 ayrı modül olarak eklendi. |
| Dashboard/UI dosyaları | v52 kapsamında değiştirilmedi. |

## Doğrulama yaklaşımı

Bundan sonra durum raporlarında kanıt şu sırayla verilecek:

1. Repo adı
2. Dosya adı
3. Commit SHA
4. Ne değişti
5. Hangi test/workflow bunu kontrol ediyor

## Kalan kritik canlı adımlar

- GitHub Actions > `AperiON Finance Full Check` workflow'unu çalıştır.
- Supabase SQL Editor'da çalıştır:
  1. `SUPABASE_COMMAND_CENTER_INSTALL.sql`
  2. `finance/AperiON_Sales_Flow_Today_SQL_v46.sql`
  3. `finance/AperiON_Finance_Calendar_Live_SQL_v47.sql`
  4. `finance/AperiON_Finance_Calendar_Seed_v47.sql`
  5. `finance/AperiON_Finance_Calendar_Actions_SQL_v48.sql`
  6. `finance/AperiON_Finance_Risk_Engine_SQL_v49.sql`
  7. `finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql`
  8. `finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql`
- Yerelde çalıştır:
  1. `npm run telegram:critical-risk-v52:test`
  2. `npm run verify:risk-alert-dedup-v52`
  3. `npm test`
- `.env` dosyasını `.env.example` dosyasındaki Telegram + v52 alanlarına göre güncelle.
- Live-ready Komuta Merkezi ekranında gerçek Supabase URL / anon key ile bağlantı testi yap.
- `telegram/AperiON_Risk_Alert_Dedup_GoLive_Checklist_v52.md` checklist'i tamamla.
- Testler temizse canlı scheduler tarafında `telegram:critical-risk-v51` komutunu `telegram:critical-risk-v52` komutuna çevir.
- Sorun çıkarsa `telegram/AperiON_Risk_Alert_Dedup_Rollback_v52.md` rehberine göre sadece scheduler komutunu geçici olarak v51'e al.
