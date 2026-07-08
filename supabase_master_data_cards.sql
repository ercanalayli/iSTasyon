-- AperiON iSTasyon master data card schema
-- Public repo note: do not store real tokens, full card numbers, full account numbers or secrets here.
-- Sensitive values must be stored only inside Supabase tables with proper access control.

create table if not exists master_data_cards (
  id bigserial primary key,
  card_type text not null,
  owner_class text not null default 'BELIRSIZ',
  title text not null,
  status text not null default 'active',
  source_type text,
  source_summary text,
  evidence_ref text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create index if not exists idx_master_data_cards_type on master_data_cards(card_type);
create index if not exists idx_master_data_cards_owner on master_data_cards(owner_class);
create index if not exists idx_master_data_cards_status on master_data_cards(status);
create index if not exists idx_master_data_cards_data_gin on master_data_cards using gin(data);

create table if not exists auto_payment_instructions (
  id bigserial primary key,
  owner_class text not null default 'BELIRSIZ',
  institution text not null,
  bill_type text,
  usage_place text,
  subscriber_no_masked text,
  payment_source_type text,
  payment_source_ref text,
  auto_payment_status text not null default 'active',
  start_date date,
  end_date date,
  last_invoice_period text,
  last_invoice_amount numeric(14,2),
  last_due_date date,
  risk_note text,
  evidence_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auto_payment_owner on auto_payment_instructions(owner_class);
create index if not exists idx_auto_payment_institution on auto_payment_instructions(institution);
create index if not exists idx_auto_payment_due on auto_payment_instructions(last_due_date);

create table if not exists utility_invoice_watch (
  id bigserial primary key,
  owner_class text not null default 'BELIRSIZ',
  institution text not null,
  usage_place text,
  invoice_period text,
  invoice_date date,
  due_date date,
  amount numeric(14,2),
  currency text not null default 'TRY',
  payment_status text not null default 'waiting_auto_payment',
  auto_payment_instruction_id bigint references auto_payment_instructions(id),
  bank_account_ref text,
  evidence_ref text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_utility_invoice_owner on utility_invoice_watch(owner_class);
create index if not exists idx_utility_invoice_due on utility_invoice_watch(due_date);
create index if not exists idx_utility_invoice_status on utility_invoice_watch(payment_status);

-- ALAYLI Uludag Elektrik sample rows are intentionally masked.
-- Full subscriber/account numbers must be entered only inside private Supabase environment.
