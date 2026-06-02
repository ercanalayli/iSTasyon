create table if not exists pending_bank_movements (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'alayli',
  source text not null default 'gmail_bank_statement',
  mailbox text,
  bank_name text,
  account_name text,
  iban_or_account_no text,
  mail_id text,
  mail_subject text,
  mail_from text,
  mail_date text,
  attachment_name text,
  statement_id text,
  statement_period text,
  transaction_date date,
  transaction_time text,
  value_date date,
  description text,
  amount_in numeric default 0,
  amount_out numeric default 0,
  balance_after numeric,
  raw_text text,
  detected_type text,
  suggested_counterparty text,
  confidence_score numeric,
  status text not null default 'pending',
  approval_note text,
  approved_at timestamptz,
  duplicate_key text not null unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_pending_bank_company_status on pending_bank_movements(company_id,status);
create index if not exists idx_pending_bank_date on pending_bank_movements(transaction_date);
create index if not exists idx_pending_bank_bank on pending_bank_movements(bank_name);
