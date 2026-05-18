# AperiON v54 Financial Statement Engine Supabase Runbook

## Amaç

Dinamik Gelir Tablosu + Dinamik Bilanço motorunu Supabase üzerinde güvenli şekilde kurmak ve test etmek.

## Kritik güvenlik kuralı

```text
Mevcut sales_raw, masraf_raw, cari, banka, Moka ve dashboard tabloları değiştirilmez.
v54 ayrı tablo/view katmanı olarak kurulur.
İlk test ALAYLI_DEMO_V54 şirketiyle yapılır.
```

## Çalıştırma sırası

Supabase Dashboard > SQL Editor içinde dosyaları şu sırayla çalıştır:

```text
1. finance/AperiON_Financial_Statement_Engine_SQL_v54.sql
2. finance/AperiON_Financial_Statement_Engine_Seed_v54.sql
3. finance/AperiON_Financial_Statement_Engine_Healthcheck_v54.sql
```

## 1. Ana SQL dosyası

Çalıştırılacak dosya:

```text
finance/AperiON_Financial_Statement_Engine_SQL_v54.sql
```

Kurulan yapılar:

```text
finance_events_v54
finance_ledger_v54
finance_event_to_ledger_v54
finance_rebuild_ledger_v54
financial_income_statement_v54_view
financial_balance_sheet_v54_view
financial_kpi_summary_v54_view
financial_reconciliation_alerts_v54_view
```

Beklenen sonuç:

```text
SQL hata vermeden tamamlanmalı.
Tablolar ve view'lar oluşmalı.
```

## 2. Demo seed dosyası

Çalıştırılacak dosya:

```text
finance/AperiON_Financial_Statement_Engine_Seed_v54.sql
```

Bu dosya sadece demo şirket için kayıt üretir:

```text
ALAYLI_DEMO_V54
```

Demo eventler:

```text
sale
cost_of_goods_sold
collection
moka_collection
moka_bank_transfer
expense
payment
pending / düşük güvenli kayıt
```

Beklenen sonuç:

```text
generated_ledger_rows değeri 0'dan büyük olmalı.
```

## 3. Healthcheck dosyası

Çalıştırılacak dosya:

```text
finance/AperiON_Financial_Statement_Engine_Healthcheck_v54.sql
```

Kontrol eder:

```text
finance_events_v54 satır sayısı
finance_ledger_v54 satır sayısı
gelir tablosu satırları
bilanço satırları
KPI satırları
mutabakat alarm satırları
```

## Hızlı manuel kontrol sorguları

Gelir tablosu:

```sql
select *
from financial_income_statement_v54_view
where company = 'ALAYLI_DEMO_V54';
```

Bilanço:

```sql
select *
from financial_balance_sheet_v54_view
where company = 'ALAYLI_DEMO_V54';
```

KPI:

```sql
select *
from financial_kpi_summary_v54_view
where company = 'ALAYLI_DEMO_V54';
```

Alarm:

```sql
select *
from financial_reconciliation_alerts_v54_view
where company = 'ALAYLI_DEMO_V54';
```

## Beklenen demo tablo etkisi

Demo seed sonrası yaklaşık mantık:

```text
Brüt Satışlar: 100.000 TL
Satışların Maliyeti: -62.000 TL
Operasyonel Giderler: -15.000 TL
Net Kar: yaklaşık 23.000 TL
Moka United Bekleyen: pozitif bakiye oluşmalı
Banka: tahsilat ve Moka geçiş etkisi görmeli
Müşteri Alacağı: satıştan artıp tahsilat/Moka ile azalmalı
```

## Olası hata notları

### gen_random_uuid hatası

Supabase genelde `gen_random_uuid()` destekler. Hata olursa pgcrypto extension gerekebilir:

```sql
create extension if not exists pgcrypto;
```

Sonra ana SQL tekrar çalıştırılır.

### View boş gelirse

Önce ledger rebuild çalıştır:

```sql
select finance_rebuild_ledger_v54('ALAYLI_DEMO_V54');
```

Sonra healthcheck tekrar çalıştırılır.

### Düşük güvenli event neden tabloya girmedi?

Bu beklenen davranıştır.

```text
status <> approved veya confidence_score < 70 ise ledger etkisi oluşturulmaz.
```

## Canlıya geçmeden önce

```text
Demo şirket testleri temiz olacak.
ALAYLI gerçek veri bağlantısı ayrıca adapter ile yapılacak.
Düşük güvenli kayıtlar onay merkezine düşecek.
Canlı dashboard'a bağlamadan önce v53 preview ile test yapılacak.
```

## Sonraki adım

```text
v53 preview ekranı financial_income_statement_v54_view ve financial_balance_sheet_v54_view kaynaklarına bağlanacak.
```
