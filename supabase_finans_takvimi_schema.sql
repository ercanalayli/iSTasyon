-- AperiON / ErpaltH iSTasyon
-- Finans Takvimi ve Nakit Akışı Merkezi
-- İlk canlı tablo taslağı. Bu dosya index.html veya mevcut dashboard özelliklerini değiştirmez.
-- Amaç: demo veri sonrası Supabase canlı kayıt yapısına geçiş.

-- Şirket yapısı korunur:
-- alayli, woodlet, elit, odyoform, alkam, yenicespor

create type if not exists finance_company as enum (
  'alayli',
  'woodlet',
  'elit',
  'odyoform',
  'alkam',
  'yenicespor'
);

create type if not exists finance_record_type as enum (
  'tahsilat',
  'odeme',
  'gider',
  'sabit_odeme',
  'degisken_odeme',
  'cek_senet',
  'kredi_karti',
  'vergi_sgk',
  'moka_united',
  'banka_transferi'
);

create type if not exists finance_record_status as enum (
  'taslak',
  'onay_bekliyor',
  'bekliyor',
  'kismi_odendi',
  'tamamlandi',
  'gecikti',
  'iptal'
);

create table if not exists finance_calendar_records (
  id uuid primary key default gen_random_uuid(),
  company finance_company not null,
  record_type finance_record_type not null,
  status finance_record_status not null default 'bekliyor',
  cari_name text not null,
  cari_code text,
  description text,
  original_due_date date not null,
  actual_payment_date date,
  accrual_month date,
  expected_amount numeric(14,2) not null default 0,
  realized_amount numeric(14,2) not null default 0,
  remaining_amount numeric(14,2) generated always as (greatest(expected_amount - realized_amount, 0)) stored,
  is_paid boolean generated always as (realized_amount >= expected_amount and expected_amount > 0) stored,
  source text not null default 'manual',
  source_ref text,
  approval_status text not null default 'onay_bekliyor',
  confidence_score numeric(5,2),
  match_reason text,
  document_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_records_company_date on finance_calendar_records(company, actual_payment_date, original_due_date);
create index if not exists idx_finance_records_status on finance_calendar_records(status, approval_status);
create index if not exists idx_finance_records_type on finance_calendar_records(record_type);

create table if not exists fixed_payment_contracts (
  id uuid primary key default gen_random_uuid(),
  company finance_company not null,
  cari_name text not null,
  cari_code text,
  contract_name text not null,
  start_date date not null,
  end_date date,
  period text not null default 'monthly',
  payment_day int,
  amount numeric(14,2) not null,
  increase_rule text,
  deposit_amount numeric(14,2),
  document_url text,
  is_active boolean not null default true,
  renewal_warning_days int not null default 30,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists variable_payment_items (
  id uuid primary key default gen_random_uuid(),
  company finance_company not null,
  item_type text not null,
  cari_name text not null,
  original_due_date date not null,
  actual_payment_date date,
  amount numeric(14,2) not null,
  paid_amount numeric(14,2) not null default 0,
  source text not null default 'manual',
  approval_status text not null default 'onay_bekliyor',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists moka_united_movements (
  id uuid primary key default gen_random_uuid(),
  company finance_company not null,
  customer_name text not null,
  pos_collection_date date not null,
  expected_bank_transfer_date date,
  bank_transfer_date date,
  gross_amount numeric(14,2) not null,
  commission_amount numeric(14,2) not null default 0,
  banked_amount numeric(14,2) not null default 0,
  remaining_moka_amount numeric(14,2) generated always as (greatest(gross_amount - commission_amount - banked_amount, 0)) stored,
  status text not null default 'moka_bekliyor',
  bank_account text,
  source_ref text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists turkiye_public_holidays (
  holiday_date date primary key,
  holiday_name text not null,
  year int not null,
  is_half_day boolean not null default false
);

insert into turkiye_public_holidays (holiday_date, holiday_name, year, is_half_day) values
('2026-01-01','Yılbaşı',2026,false),
('2026-03-20','Ramazan Bayramı 1. Gün',2026,false),
('2026-03-21','Ramazan Bayramı 2. Gün',2026,false),
('2026-03-22','Ramazan Bayramı 3. Gün',2026,false),
('2026-04-23','Ulusal Egemenlik ve Çocuk Bayramı',2026,false),
('2026-05-01','Emek ve Dayanışma Günü',2026,false),
('2026-05-19','Atatürk’ü Anma Gençlik ve Spor Bayramı',2026,false),
('2026-05-27','Kurban Bayramı 1. Gün',2026,false),
('2026-05-28','Kurban Bayramı 2. Gün',2026,false),
('2026-05-29','Kurban Bayramı 3. Gün',2026,false),
('2026-05-30','Kurban Bayramı 4. Gün',2026,false),
('2026-07-15','Demokrasi ve Milli Birlik Günü',2026,false),
('2026-08-30','Zafer Bayramı',2026,false),
('2026-10-29','Cumhuriyet Bayramı',2026,false)
on conflict (holiday_date) do nothing;

-- İlk iş günü hesaplama mantığı uygulama tarafında da var.
-- SQL tarafında ileride function olarak yazılacak:
-- original_due_date hafta sonu veya turkiye_public_holidays içinde ise actual_payment_date ilk iş gününe atılır.

create or replace view finance_cashflow_summary as
select
  company,
  coalesce(actual_payment_date, original_due_date) as cashflow_date,
  sum(case when record_type = 'tahsilat' then expected_amount else 0 end) as gelmesi_gereken_tahsilat,
  sum(case when record_type = 'tahsilat' then realized_amount else 0 end) as tahsil_edilen,
  sum(case when record_type = 'tahsilat' then remaining_amount else 0 end) as tahsilat_kalan,
  sum(case when record_type in ('odeme','gider','sabit_odeme','degisken_odeme','cek_senet','kredi_karti','vergi_sgk') then expected_amount else 0 end) as odenmesi_gereken,
  sum(case when record_type in ('odeme','gider','sabit_odeme','degisken_odeme','cek_senet','kredi_karti','vergi_sgk') then realized_amount else 0 end) as odenen,
  sum(case when record_type in ('odeme','gider','sabit_odeme','degisken_odeme','cek_senet','kredi_karti','vergi_sgk') then remaining_amount else 0 end) as odeme_kalan,
  sum(case when record_type = 'gider' then expected_amount else 0 end) as tahakkuk_eden_gider,
  sum(case when record_type = 'gider' then realized_amount else 0 end) as fiilen_odenen_gider,
  sum(case when record_type = 'tahsilat' then expected_amount else 0 end)
    - sum(case when record_type in ('odeme','gider','sabit_odeme','degisken_odeme','cek_senet','kredi_karti','vergi_sgk') then expected_amount else 0 end) as beklenen_net,
  sum(case when record_type = 'tahsilat' then realized_amount else 0 end)
    - sum(case when record_type in ('odeme','gider','sabit_odeme','degisken_odeme','cek_senet','kredi_karti','vergi_sgk') then realized_amount else 0 end) as gerceklesen_net
from finance_calendar_records
group by company, coalesce(actual_payment_date, original_due_date);
