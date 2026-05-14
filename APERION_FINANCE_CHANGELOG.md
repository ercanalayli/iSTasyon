# AperiON Finans Komuta Merkezi - Değişiklik Manifesti

Bu manifest, AperiON / ErpaltH iSTasyon reposunda finans modülleri için yapılan dosya bazlı değişiklikleri somut olarak izlemek için tutulur.

Yeni öncelik:

```text
Ana modül: Finans Komuta Merkezi
Çekirdekler: Yapılacaklar · Ödenecekler · Tahsil Edilecekler
Ek yapı: Telegram alarm altyapısı
```

Repo:

```text
ercanalayli/iSTasyon
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
| `NEXT_ACTIONS_FINANCE.md` | Telefon/GitHub üzerinden kalan aksiyon rehberi | Güncellenecek |
| `FINANCE_SETUP.md` | Kurulum rehberi | Güncellenecek |

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
| `scripts/verify_finance_manifest.cjs` | Manifest doğrulama script'i | Güncellendi |
| `test_data/bizimhesap_finance_sample.csv` | BizimHesap örnek export | Korundu |
| `test_data/moka_bank_sample.csv` | Moka banka örnek export | Korundu |
| `data/sales_report_summary_2025_2026.json` | Yüklenen satış raporları finans özeti | Korundu |
| `.github/workflows/finance-smoke.yml` | Finance smoke test workflow | Korundu |
| `.github/workflows/finance-inject-index.yml` | Finans Takvimi link workflow'u | Korundu |
| `.github/workflows/finance-full-check.yml` | Tek noktadan full finans kontrol workflow'u | Güncellendi |

## Güvenlik / config dosyaları

| Dosya | Amaç | Durum |
|---|---|---|
| `.env.example` | Ortam değişkeni örneği | Korundu |
| `.gitignore` | Gerçek env/config/export dosyalarını korur | Korundu |
| `aperion-finans-config.example.js` | Supabase anon config örneği | Korundu |

## Özellikle korunmuş dosyalar

| Dosya | Durum |
|---|---|
| `index.html` | Körlemesine değiştirilmedi. Komuta Merkezi için güvenli patch script + workflow hazırlandı. |

## Doğrulama yaklaşımı

Bundan sonra durum raporlarında kanıt şu sırayla verilecek:

1. Repo adı
2. Dosya adı
3. Commit SHA
4. Ne değişti
5. Hangi test/workflow bunu kontrol ediyor

## Kalan kritik canlı adımlar

- GitHub Actions > `Inject AperiON Finance Command Center Link` workflow'unu çalıştır.
- GitHub Actions > `AperiON Finance Full Check` workflow'unu çalıştır.
- Supabase SQL Editor'da çalıştır:
  1. `SUPABASE_COMMAND_CENTER_INSTALL.sql`
- Live-ready Komuta Merkezi ekranında gerçek Supabase URL / anon key ile bağlantı testi yap.
- Telegram bot backend / webhook / chat id yapısını sonraki aşamada bağla.
