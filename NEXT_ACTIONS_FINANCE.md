# AperiON Finans Takvimi - Sonraki Aksiyonlar

Bu dosya, kalan işlemleri telefondan veya GitHub arayüzünden net şekilde bitirmek için hazırlanmıştır.

## 1. index.html içine Finans Takvimi linkini işle

GitHub ekranında:

1. Repo aç: `ercanalayli/iSTasyon`
2. `Actions` sekmesine gir.
3. `Inject AperiON Finance Link` workflow'unu seç.
4. `Run workflow` butonuna bas.
5. Workflow bitince son committe `index.html` değişmiş mi kontrol et.

Beklenen sonuç:

- Sidebar içine `Finans Takvimi` linki eklenir.
- Link `finans-takvimi.html` sayfasını açar.
- Eğer sidebar bulunamazsa sağ altta güvenli floating link eklenir.

## 2. Smoke test çalıştır

GitHub Actions içinde `AperiON Finance Smoke Test` workflow'unu çalıştır veya yerelde:

```bash
npm install
npm run finance-smoke
```

Beklenen sonuç:

```text
OK schema files
OK sales summary
OK pipeline
AperiON Finans smoke test başarılı.
```

## 3. Supabase tablolarını kur

Supabase Dashboard > SQL Editor içine şunu çalıştır:

```text
SUPABASE_FINANCE_INSTALL_ALL.sql
```

Beklenen tablolar:

- `finance_calendar_records`
- `fixed_payment_contracts`
- `variable_payment_items`
- `moka_united_movements`
- `turkiye_public_holidays`
- `finance_cashflow_summary`

## 4. Live-ready ekranı bağla

1. Siteyi aç.
2. `finans-takvimi.html` sayfasına gir.
3. `Canlıya Hazır Modülü Aç` seç.
4. `Canlı Bağlantı` sekmesine gir.
5. Supabase URL ve anon key gir.
6. `Kaydet ve Bağlan` butonuna bas.

Başarılıysa ekran `CANLI MOD` gösterir.

## 5. BizimHesap export test

Yerelde örnek test:

```bash
npm run finance-pipeline-demo
```

Gerçek dosya ile:

```bash
node bizimhesap_finance_pipeline.cjs ./bizimhesap_exports/banka.csv alayli
```

Çıktı klasörü:

```text
finance_imports/
```

## 6. Moka United gerçek test

Gerçek banka ekstresi geldikten sonra:

1. Banka hareketleri içinden Moka/United açıklamaları alınır.
2. Bekleyen `moka_united_movements` kayıtlarıyla karşılaştırılır.
3. `moka_united_reconciliation.js` güven puanlı öneri üretir.
4. Kullanıcı onayından sonra finans kaydı kesinleşir.

## 7. Korunan kurallar

- ALKAM Mali adı kullanılmaz.
- AperiON / ErpaltH iSTasyon adı kullanılır.
- Mevcut şirketler korunur: `alayli`, `woodlet`, `elit`, `odyoform`, `alkam`, `yenicespor`.
- index.html körlemesine ezilmez.
- Kesin kayıt kullanıcı onayı olmadan yapılmaz.
- Moka United ayrı hesap gibi çalışır.
- Çek/senet asıl vadesi korunur, fiili ödeme tarihi ilk iş gününe taşınır.
