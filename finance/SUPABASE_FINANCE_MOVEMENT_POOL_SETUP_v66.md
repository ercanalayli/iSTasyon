# AperiON v66 - Supabase Finance Movement Pool Setup

Bu dosya, Gmail'den gelen Yapı Kredi banka ekstresi satırlarının Onay Merkezi'ne düşmesi için gereken Supabase tablo yapısını tarif eder.

## Amaç

Gmail PDF -> Parser -> Sınıflandırıcı -> Pending Pool -> Onay Merkezi

Kesin kayıt yoktur. Ledger'a direkt yazılmaz.

## Tablo adı

`finance_movement_pool`

## Zorunlu alanlar

- id
- source
- company_code
- bank_row_key
- bank_account_code
- bank_account_name
- iban
- transaction_date
- transaction_time
- amount
- balance
- description
- operation
- channel
- movement_direction
- movement_type
- counterparty_name
- counterparty_cari_id
- counterparty_cari_status
- center_type
- center_name
- gider_yeri_id
- gider_yeri_adi
- gelir_yeri_id
- gelir_yeri_adi
- confidence_score
- suggestion_reason
- approval_status
- status
- raw_payload
- created_at
- updated_at

## Temel tablo kurulumu

Supabase SQL Editor'de uygulanacak sade kurulum:

```sql
create table if not exists finance_movement_pool (
  id uuid primary key default gen_random_uuid(),
  source text,
  company_code text,
  bank_row_key text unique,
  bank_account_code text,
  bank_account_name text,
  iban text,
  transaction_date date,
  transaction_time text,
  amount numeric,
  balance numeric,
  description text,
  operation text,
  channel text,
  movement_direction text,
  movement_type text,
  counterparty_name text,
  counterparty_cari_id text,
  counterparty_cari_status text,
  center_type text,
  center_name text,
  gider_yeri_id text,
  gider_yeri_adi text,
  gelir_yeri_id text,
  gelir_yeri_adi text,
  confidence_score integer,
  suggestion_reason text,
  approval_status text default 'pending',
  status text default 'pending',
  raw_payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## Indexler

```sql
create index if not exists idx_finance_pool_status on finance_movement_pool(status);
create index if not exists idx_finance_pool_approval_status on finance_movement_pool(approval_status);
create index if not exists idx_finance_pool_bank_account on finance_movement_pool(bank_account_code);
create index if not exists idx_finance_pool_date on finance_movement_pool(transaction_date);
create index if not exists idx_finance_pool_movement_type on finance_movement_pool(movement_type);
```

## Kontrol kuralları

### Şirket izolasyonu

Şimdilik aktif şirket yalnızca:

`ALAYLI_MEDIKAL`

### Mükerrer engeli

`bank_row_key` unique olmalıdır.

Örnek:

`26052026092753-01`

Aynı satır ikinci kez gelirse insert/upsert tekrar kayıt oluşturmaz.

### Onay durumları

- pending
- needs_review
- approved
- rejected

### Zorunlu öneri alanları

Onay ekranında her satırda şu alanlar görünmelidir:

- hareket tipi
- gider yeri veya gelir yeri
- cari / karşı taraf
- güven puanı
- öneri sebebi

## Servis bağlantıları

### Parser

`services/yapikredi_statement_parser_v66.cjs`

### Pending writer

`services/finance_pool_pending_writer_v66.cjs`

### Gmail ingest

`services/gmail_yapikredi_statement_ingest_v66.cjs`

### Frontend data adapter

`assets/js/finance-approval-data-v66.js`

### Onay Merkezi ekranı

`finans-onay-merkezi-final.html`

## Test senaryosu

1. Supabase'de tabloyu oluştur.
2. Gmail'den gelen Yapı Kredi PDF metnini parser'a ver.
3. Pending writer çıktısını `finance_movement_pool` tablosuna upsert et.
4. Onay Merkezi ekranını aç.
5. Veri kaynağı `Supabase finance_movement_pool` görünmeli.
6. Her hareket kartında gider yeri, cari, hareket tipi ve güven puanı görünmeli.
7. Öneriyi Onayla status alanını `approved` yapmalı.
8. Reddet status alanını `rejected` yapmalı.
9. Beklet status alanını `needs_review` yapmalı.

## Kapanış

Bu yapı banka ekstresini otomatik onaya düşürmek için zorunlu veritabanı zeminidir.

Butonla mailden yükleme yoktur.

Sistem sinyal verir, önerir, onaya düşürür.
