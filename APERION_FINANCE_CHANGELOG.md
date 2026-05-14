# AperiON Finans Takvimi - Değişiklik Manifesti

Bu manifest, AperiON / ErpaltH iSTasyon reposunda Finans Takvimi ve Nakit Akışı Merkezi için yapılan dosya bazlı değişiklikleri somut olarak izlemek için tutulur.

Repo:

```text
ercanalayli/iSTasyon
```

## Ana modül dosyaları

| Dosya | Amaç | Durum |
|---|---|---|
| `finans-takvimi.html` | Finans modülü başlatıcı sayfası | Eklendi / live-ready sayfaya yönlendirildi |
| `aperion-finans-takvimi.html` | İlk demo finans ekranı | Eklendi |
| `aperion-finans-takvimi-live.html` | Supabase varsa canlı, yoksa demo çalışan ekran | Eklendi |
| `finance_dashboard_embed.html` | Ana dashboard içine gömülebilir iframe section | Eklendi |
| `APERION_FINANS_INTEGRATION_NOTES.md` | index.html entegrasyon notları | Eklendi |
| `NEXT_ACTIONS_FINANCE.md` | Telefon/GitHub üzerinden kalan aksiyon rehberi | Eklendi |
| `FINANCE_SETUP.md` | Kurulum rehberi | Eklendi / güncellendi |

## Supabase / veritabanı dosyaları

| Dosya | Amaç | Durum |
|---|---|---|
| `SUPABASE_FINANCE_INSTALL_ALL.sql` | Tek dosyalık Supabase kurulum SQL'i | Eklendi |
| `supabase_finans_takvimi_schema.sql` | Finans tabloları ve view şeması | Eklendi |
| `supabase_finans_demo_seed.sql` | Demo/test finans verisi | Eklendi |
| `supabase_finans_validation.sql` | İlk validation taslağı | Eklendi |
| `supabase_finans_validation_safe.sql` | Daha güvenli validation kurulumu | Eklendi |
| `supabase_finans_rls_policies.sql` | RLS / policy taslağı | Eklendi |
| `supabase_finans_health_check.sql` | Kurulum sonrası kontrol sorguları | Eklendi |
| `supabase_finance_migration_runner.js` | Supabase migration runner taslağı | Eklendi |

## Entegrasyon / pipeline dosyaları

| Dosya | Amaç | Durum |
|---|---|---|
| `finance_import_bridge.js` | BizimHesap/banka/Moka ham hareketlerini finans kaydına normalize eder | Eklendi |
| `finance_approval_center.js` | Onay Merkezi veri modeli | Eklendi |
| `finance_approval_actions.js` | Onay / red aksiyonları | Eklendi |
| `finance_supabase_adapter.js` | Supabase veri erişim katmanı | Eklendi |
| `bizimhesap_finance_pipeline.js` | İlk BizimHesap pipeline dosyası | Eklendi |
| `bizimhesap_finance_pipeline.cjs` | CommonJS uyumlu BizimHesap pipeline | Eklendi |
| `moka_united_reconciliation.js` | Moka United mutabakat öneri motoru | Eklendi |
| `moka_bank_pipeline.cjs` | Banka CSV'den Moka hareketlerini onay kuyruğuna çevirir | Eklendi |
| `sales_report_import_bridge.js` | Satış raporlarını finans kuyruğuna hazırlayan köprü | Eklendi |
| `sales_dashboard_adapter.js` | Satış KPI / müşteri / ürün / kategori adapter'ı | Eklendi |
| `turkiye_business_calendar.js` | Türkiye iş günü / resmi tatil takvimi | Eklendi / 2027 güncellendi |

## Test / örnek veri / workflow dosyaları

| Dosya | Amaç | Durum |
|---|---|---|
| `finance_smoke_test.cjs` | Finans smoke test | Eklendi / genişletildi |
| `test_data/bizimhesap_finance_sample.csv` | BizimHesap örnek export | Eklendi |
| `test_data/moka_bank_sample.csv` | Moka banka örnek export | Eklendi |
| `data/sales_report_summary_2025_2026.json` | Yüklenen satış raporları finans özeti | Eklendi |
| `.github/workflows/finance-smoke.yml` | Finance smoke test workflow | Eklendi / kapsam genişletildi |
| `.github/workflows/finance-inject-index.yml` | index.html içine Finans Takvimi linki ekleme workflow'u | Eklendi / doğrulama eklendi |
| `.github/workflows/finance-full-check.yml` | Tek noktadan full finans kontrol workflow'u | Eklendi |

## Güvenlik / config dosyaları

| Dosya | Amaç | Durum |
|---|---|---|
| `.env.example` | Ortam değişkeni örneği | Eklendi |
| `.gitignore` | Gerçek env/config/export dosyalarını korur | Güncellendi |
| `aperion-finans-config.example.js` | Supabase anon config örneği | Eklendi |

## Özellikle korunmuş dosyalar

| Dosya | Durum |
|---|---|
| `index.html` | Körlemesine değiştirilmedi. Bunun yerine güvenli patch script + workflow hazırlandı. |

## Doğrulama yaklaşımı

Bundan sonra durum raporlarında kanıt şu sırayla verilecek:

1. Repo adı
2. Dosya adı
3. Commit SHA
4. Ne değişti
5. Hangi test/workflow bunu kontrol ediyor

## Kalan kritik canlı adımlar

- GitHub Actions > `Inject AperiON Finance Link` workflow'unu çalıştır.
- GitHub Actions > `AperiON Finance Full Check` workflow'unu çalıştır.
- Supabase SQL Editor'da sırasıyla çalıştır:
  1. `SUPABASE_FINANCE_INSTALL_ALL.sql`
  2. `supabase_finans_validation_safe.sql`
  3. `supabase_finans_health_check.sql`
- Live-ready ekranda gerçek Supabase URL / anon key ile bağlantı testi yap.
