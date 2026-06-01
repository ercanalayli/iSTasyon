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

create index if not exists idx_finance_pool_status
  on finance_movement_pool(status);

create index if not exists idx_finance_pool_approval_status
  on finance_movement_pool(approval_status);

create index if not exists idx_finance_pool_bank_account
  on finance_movement_pool(bank_account_code);

create index if not exists idx_finance_pool_date
  on finance_movement_pool(transaction_date);

create index if not exists idx_finance_pool_movement_type
  on finance_movement_pool(movement_type);
