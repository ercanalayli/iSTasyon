# AperiON v57 — Supabase SQL Kurulum Sırası

Bu dosya, PR #2 içindeki v57 finans ve ücretsiz Gmail/Drive otomasyon altyapısının Supabase tarafında hangi sırayla kurulacağını netleştirir.

## Kritik güvenlik notu

Bu kurulum:

- BizimHesap’a kayıt göndermez.
- Banka hareketlerini kesin finans kaydına dönüştürmez.
- Onaysız işlem yapmaz.
- Sadece tablo, view, fonksiyon ve kontrol altyapısını hazırlar.

## Kurulum sırası

### 1. Nakit Komuta Merkezi SQL

Önce şu dosya çalıştırılacak:

```text
finance/AperiON_Cash_Command_Center_SQL_v57.sql
```

Bu dosya şu altyapıyı kurar:

- Finans hesap kartları
- Nakit pozisyonu
- Moka/POS kural ve beklenen tahsilat yapısı
- Finans due plan / ödeme-tahsilat planı
- Onay ve mutabakat view’ları
- Cash forecast view’ları

Kontrol view örnekleri:

```sql
select * from finance_account_cards_live_v57_view where company='alayli';
select * from cash_forecast_v57_view where company='alayli';
select * from moka_pos_rules where company='alayli';
```

### 2. Ücretsiz Gmail/Drive Dosya Giriş SQL

Sonra şu dosya çalıştırılacak:

```text
finance/AperiON_Free_Gmail_Drive_Intake_SQL_v57.sql
```

Bu dosya şu altyapıyı kurar:

- `bank_statement_files_v57`
- `bank_statement_file_events_v57`
- `bank_statement_file_register_v57(...)`
- `bank_statement_files_inbox_v57_view`
- `free_automation_health_v57_view`

Kontrol view örnekleri:

```sql
select * from bank_statement_files_inbox_v57_view where company='alayli';
select * from free_automation_health_v57_view where company='alayli';
```

## Kurulumdan sonra yapılacak hızlı kontrol

Supabase SQL Editor’da şu kontroller çalıştırılabilir:

```sql
select 'cash_forecast_v57_view' as check_name, count(*) from cash_forecast_v57_view where company='alayli'
union all
select 'bank_statement_files_inbox_v57_view', count(*) from bank_statement_files_inbox_v57_view where company='alayli'
union all
select 'free_automation_health_v57_view', count(*) from free_automation_health_v57_view where company='alayli';
```

Not: İlk kurulumda bazı sonuçlar 0 dönebilir. Bu hata değildir; gerçek veri henüz gelmemiş olabilir.

## İlk test verisi ekleme örneği

Gmail/Drive dosya giriş ekranını test etmek için aşağıdaki örnek kayıt kullanılabilir:

```sql
select bank_statement_file_register_v57(
  'alayli',
  'demo-drive-file-id-001',
  'https://drive.google.com/file/d/demo-drive-file-id-001/view',
  '2026-05-29_09-15 -- test-banka -- Hesap Hareketleri -- hesap_ekstresi.pdf',
  'application/pdf',
  123456,
  'demo-message-id',
  'demo-thread-id',
  'test-banka@example.com',
  'Hesap Hareketleri',
  now(),
  '{"source":"manual-demo"}'::jsonb
);
```

Sonra şu view kontrol edilir:

```sql
select * from bank_statement_files_inbox_v57_view where company='alayli';
select * from free_automation_health_v57_view where company='alayli';
```

## Kabul kriterleri

Kurulum başarılı sayılması için:

- SQL hatasız çalışmalı.
- `cash_forecast_v57_view` sorgulanabilmeli.
- `bank_statement_files_inbox_v57_view` sorgulanabilmeli.
- `free_automation_health_v57_view` sorgulanabilmeli.
- Demo kayıt eklenirse `gelen-ekstreler-v57.html` ekranında görünmeli.
- Hiçbir kayıt BizimHesap’a gönderilmemeli.

## Yapılanlar

- v57 SQL kurulum sırası belirlendi.
- Nakit Komuta ve Gmail/Drive intake SQL dosyaları ayrıştırıldı.
- İlk demo kayıt SQL’i eklendi.

## Kalanlar

- SQL dosyalarının gerçek Supabase projesinde çalıştırılması.
- Demo kayıt ile `gelen-ekstreler-v57.html` kontrolü.
- Apps Script’in `alaylimedikal@gmail.com` hesabında kurulması.
- Gerçek banka ekstresi ile parser/onay merkezi akışına geçilmesi.
