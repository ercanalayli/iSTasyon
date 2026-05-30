-- =========================================================
-- AperiON v59 - Processing Ledger / Idempotency SQL
-- =========================================================
-- Purpose:
-- Track every imported file, parsed row and generated transaction
-- with stable IDs and fingerprints so AperiON knows what has
-- already been processed. No date guessing from the user.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists aperion_processing_batches_v59 (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  source_channel text not null check (source_channel in ('gmail','telegram','drive','manual','system')),
  source_account text,
  document_id uuid references aperion_document_metadata_v58(id) on delete set null,
  drive_file_id text,
  file_name text,
  file_fingerprint text not null,
  statement_start_date date,
  statement_end_date date,
  detected_bank text,
  parser_version text not null default 'v59',
  status text not null default 'new'
    check (status in ('new','parsing','parsed','matched','queued','approved','processed','duplicate','error','archived')),
  row_count integer not null default 0,
  parsed_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(company, file_fingerprint)
);

create table if not exists aperion_bank_transactions_raw_v59 (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  batch_id uuid references aperion_processing_batches_v59(id) on delete cascade,
  document_id uuid references aperion_document_metadata_v58(id) on delete set null,
  row_index integer,
  transaction_fingerprint text not null,
  transaction_date date,
  value_date date,
  bank_name text,
  account_name text,
  iban text,
  description text,
  raw_line text,
  amount numeric(18,2),
  balance numeric(18,2),
  direction text check (direction in ('inflow','outflow','neutral','unknown')),
  currency text not null default 'TRY',
  parse_confidence numeric(5,2) not null default 0,
  match_status text not null default 'unmatched'
    check (match_status in ('unmatched','auto_suggested','needs_review','matched','ignored','duplicate','error')),
  matched_cari_id text,
  matched_cari_name text,
  matched_type text,
  match_score numeric(5,2),
  match_reason text,
  status text not null default 'new'
    check (status in ('new','review','approved','processed','duplicate','ignored','error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company, transaction_fingerprint)
);

create index if not exists aperion_processing_batches_v59_status_idx
on aperion_processing_batches_v59(company, source_channel, status, created_at desc);

create index if not exists aperion_bank_transactions_raw_v59_date_idx
on aperion_bank_transactions_raw_v59(company, transaction_date desc, status);

create index if not exists aperion_bank_transactions_raw_v59_match_idx
on aperion_bank_transactions_raw_v59(company, match_status, status, created_at desc);

create or replace function touch_aperion_processing_batches_v59()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_aperion_processing_batches_v59 on aperion_processing_batches_v59;
create trigger trg_touch_aperion_processing_batches_v59
before update on aperion_processing_batches_v59
for each row execute function touch_aperion_processing_batches_v59();

create or replace function touch_aperion_bank_transactions_raw_v59()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_aperion_bank_transactions_raw_v59 on aperion_bank_transactions_raw_v59;
create trigger trg_touch_aperion_bank_transactions_raw_v59
before update on aperion_bank_transactions_raw_v59
for each row execute function touch_aperion_bank_transactions_raw_v59();

create or replace function make_transaction_fingerprint_v59(
  p_company text,
  p_bank_name text,
  p_transaction_date date,
  p_description text,
  p_amount numeric,
  p_balance numeric default null
)
returns text
language sql
immutable
as $$
  select encode(digest(
    coalesce(p_company,'') || '|' ||
    coalesce(p_bank_name,'') || '|' ||
    coalesce(p_transaction_date::text,'') || '|' ||
    lower(trim(coalesce(p_description,''))) || '|' ||
    coalesce(round(p_amount,2)::text,'') || '|' ||
    coalesce(round(p_balance,2)::text,''),
    'sha256'
  ), 'hex');
$$;

create or replace function create_processing_batch_v59(
  p_company text,
  p_source_channel text,
  p_source_account text,
  p_document_id uuid,
  p_drive_file_id text,
  p_file_name text,
  p_file_fingerprint text,
  p_detected_bank text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  if nullif(trim(p_file_fingerprint), '') is null then
    raise exception 'file_fingerprint is required';
  end if;

  insert into aperion_processing_batches_v59(
    company, source_channel, source_account, document_id, drive_file_id,
    file_name, file_fingerprint, detected_bank, metadata, status
  ) values (
    coalesce(nullif(p_company,''),'alayli'),
    coalesce(nullif(p_source_channel,''),'manual'),
    p_source_account,
    p_document_id,
    p_drive_file_id,
    p_file_name,
    p_file_fingerprint,
    p_detected_bank,
    coalesce(p_metadata,'{}'::jsonb),
    'new'
  )
  on conflict (company, file_fingerprint)
  do update set status = 'duplicate', updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function upsert_bank_transaction_raw_v59(
  p_company text,
  p_batch_id uuid,
  p_document_id uuid,
  p_row_index integer,
  p_transaction_date date,
  p_bank_name text,
  p_description text,
  p_raw_line text,
  p_amount numeric,
  p_balance numeric,
  p_direction text,
  p_currency text default 'TRY',
  p_parse_confidence numeric default 0
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_fp text;
begin
  v_fp := make_transaction_fingerprint_v59(p_company, p_bank_name, p_transaction_date, p_description, p_amount, p_balance);

  insert into aperion_bank_transactions_raw_v59(
    company, batch_id, document_id, row_index, transaction_fingerprint,
    transaction_date, bank_name, description, raw_line, amount, balance,
    direction, currency, parse_confidence, status
  ) values (
    coalesce(nullif(p_company,''),'alayli'), p_batch_id, p_document_id, p_row_index, v_fp,
    p_transaction_date, p_bank_name, p_description, p_raw_line, p_amount, p_balance,
    coalesce(nullif(p_direction,''),'unknown'), coalesce(nullif(p_currency,''),'TRY'),
    coalesce(p_parse_confidence,0), 'new'
  )
  on conflict (company, transaction_fingerprint)
  do update set status = 'duplicate', updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace view aperion_processing_status_v59_view as
select
  company,
  source_channel,
  detected_bank,
  max(statement_end_date) as last_statement_end_date,
  max(created_at) as last_import_at,
  count(*) as batch_count,
  sum(parsed_count) as parsed_transactions,
  sum(duplicate_count) as duplicate_transactions
from aperion_processing_batches_v59
where status <> 'archived'
group by company, source_channel, detected_bank;

create or replace view aperion_bank_transactions_review_v59_view as
select *
from aperion_bank_transactions_raw_v59
where status in ('new','review','error')
  and match_status in ('unmatched','needs_review','auto_suggested','error')
order by transaction_date desc nulls last, created_at desc;

-- Quick checks:
-- select * from aperion_processing_status_v59_view;
-- select * from aperion_bank_transactions_review_v59_view;
