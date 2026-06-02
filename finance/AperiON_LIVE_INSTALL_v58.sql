-- AperiON LIVE INSTALL v58
-- Supabase SQL Editor icin tek parca canli kurulum paketidir.
-- Mevcut veriyi silmez. create table if not exists / create or replace view/function / idempotent insert kullanir.
-- Sira: v57 hesap omurgasi, v58 finans takvimi, Haziran 2026 tahakkuklari.
-- Calistirdiktan sonra yerelde: npm run preflight
-- ============================================================
-- Cash command center v57: banka, kasa, cek, senet, kredi karti, onay ve BizimHesap kuyrugu
-- File: AperiON_Cash_Command_Center_SQL_v57.sql
-- ============================================================
-- AperiON Cash Command Center SQL v57
-- ALAYLI Medikal iÃ§in banka, kasa, Moka/POS, onaylÄ± klon finans defteri ve BizimHesap aktarÄ±m omurgasÄ±.
-- Kural: OnaysÄ±z hiÃ§bir hareket kesin finans kaydÄ± veya BizimHesap kaydÄ± olmaz.

create extension if not exists pgcrypto;

-- =========================================================
-- 1) Hesap kartlarÄ±: banka, kasa, Moka/POS, kredi kartÄ±, Ã§ek, senet, kredi vb.
-- =========================================================

create table if not exists finance_account_cards (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  account_type text not null check (account_type in (
    'bank',
    'cash',
    'moka_pos',
    'pos',
    'credit_card',
    'overdraft',
    'check_received',
    'check_issued',
    'promissory_note_received',
    'promissory_note_issued',
    'loan',
    'customer_receivable',
    'supplier_payable',
    'expense_accrual',
    'tax',
    'sgk',
    'pos_commission',
    'transfer',
    'other'
  )),
  account_code text,
  account_name text not null,
  bank_name text,
  branch_name text,
  iban text,
  account_no text,
  currency text not null default 'TRY',
  opening_balance numeric(18,2) not null default 0,
  current_balance numeric(18,2) not null default 0,
  usable_balance numeric(18,2) not null default 0,
  blocked_amount numeric(18,2) not null default 0,
  credit_limit numeric(18,2),
  risk_limit numeric(18,2),
  owner_name text,
  responsible_person text,
  is_active boolean not null default true,
  last_transaction_date date,
  last_reconciliation_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_account_cards_company_type
  on finance_account_cards(company, account_type, is_active);

-- =========================================================
-- 2) Hesap hareketleri
-- =========================================================

create table if not exists finance_account_movements (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  account_id uuid references finance_account_cards(id) on delete set null,
  movement_date date not null,
  value_date date,
  movement_type text not null,
  direction text not null check (direction in ('in','out','transfer','unknown')),
  debit_amount numeric(18,2) not null default 0,
  credit_amount numeric(18,2) not null default 0,
  amount numeric(18,2) not null default 0,
  currency text not null default 'TRY',
  description text,
  counter_account_id uuid references finance_account_cards(id) on delete set null,
  customer_name text,
  supplier_name text,
  document_id uuid,
  source_type text,
  source_ref text,
  transaction_hash text,
  approval_status text not null default 'raw_data' check (approval_status in (
    'raw_data',
    'suggestion_ready',
    'approval_waiting',
    'approved',
    'rejected',
    'duplicate',
    'control_waiting'
  )),
  posting_status text not null default 'not_required' check (posting_status in (
    'not_required',
    'pending',
    'posted',
    'failed'
  )),
  reconciliation_status text not null default 'not_checked' check (reconciliation_status in (
    'not_checked',
    'matched',
    'partial',
    'difference',
    'failed',
    'control_waiting'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_account_movements_company_date
  on finance_account_movements(company, movement_date desc);

create unique index if not exists uq_finance_account_movements_hash
  on finance_account_movements(company, transaction_hash)
  where transaction_hash is not null;

-- =========================================================
-- 3) Belgeler: satÄ±ÅŸ, alÄ±ÅŸ, gider, banka ekstresi, kart ekstresi, Ã§ek/senet vb.
-- =========================================================

create table if not exists finance_documents (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  document_type text not null check (document_type in (
    'sales_invoice',
    'purchase_invoice',
    'expense_invoice',
    'bank_statement',
    'credit_card_statement',
    'check',
    'promissory_note',
    'loan_installment',
    'tax_accrual',
    'sgk_accrual',
    'moka_pos_collection',
    'other'
  )),
  document_no text,
  document_date date,
  due_date date,
  customer_name text,
  supplier_name text,
  gross_amount numeric(18,2) not null default 0,
  vat_amount numeric(18,2) not null default 0,
  net_amount numeric(18,2) not null default 0,
  currency text not null default 'TRY',
  document_status text not null default 'draft' check (document_status in (
    'draft',
    'approval_waiting',
    'approved',
    'posted',
    'cancelled',
    'failed',
    'control_waiting'
  )),
  payment_status text not null default 'unpaid' check (payment_status in (
    'unpaid',
    'partial',
    'paid',
    'overdue',
    'cancelled',
    'control_waiting'
  )),
  source_type text,
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 4) Vade / tahsilat / Ã¶deme planlarÄ±
-- =========================================================

create table if not exists finance_due_plans (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  account_id uuid references finance_account_cards(id) on delete set null,
  document_id uuid references finance_documents(id) on delete set null,
  plan_type text not null check (plan_type in (
    'customer_receivable',
    'supplier_payment',
    'expense_payment',
    'expense_accrual',
    'loan_payment',
    'credit_card_payment',
    'tax_payment',
    'sgk_payment',
    'check_payment',
    'promissory_note_payment',
    'moka_expected',
    'pos_expected',
    'other'
  )),
  due_date date not null,
  expected_amount numeric(18,2) not null default 0,
  paid_amount numeric(18,2) not null default 0,
  remaining_amount numeric(18,2) generated always as (greatest(expected_amount - paid_amount, 0)) stored,
  direction text not null check (direction in ('in','out')),
  status text not null default 'planned' check (status in (
    'planned',
    'partial',
    'completed',
    'overdue',
    'cancelled',
    'control_waiting'
  )),
  source_type text,
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_due_plans_company_due
  on finance_due_plans(company, due_date, direction, status);

-- =========================================================
-- 5) Moka / POS anlaÅŸma kurallarÄ±
-- VarsayÄ±lan: ilk taksit 40 gÃ¼n sonra, sonraki taksitler +40 gÃ¼n.
-- =========================================================

create table if not exists moka_pos_rules (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  provider_name text not null default 'Moka/POS',
  rule_name text not null,
  first_installment_delay_days integer not null default 40,
  installment_interval_days integer not null default 40,
  valid_from date not null default current_date,
  valid_to date,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_moka_pos_rules_active
  on moka_pos_rules(company, provider_name, rule_name, valid_from);

insert into moka_pos_rules (
  company,
  provider_name,
  rule_name,
  first_installment_delay_days,
  installment_interval_days,
  valid_from,
  valid_to,
  is_active,
  note
)
select
  'alayli',
  'Moka/POS',
  'VarsayÄ±lan 40 GÃ¼nlÃ¼k Taksit PlanÄ±',
  40,
  40,
  current_date,
  null,
  true,
  'Ä°lk taksit tahsilat tarihinden 40 gÃ¼n sonra, sonraki taksitler bir Ã¶nceki taksitten 40 gÃ¼n sonra.'
where not exists (
  select 1
  from moka_pos_rules
  where company='alayli'
    and provider_name='Moka/POS'
    and rule_name='VarsayÄ±lan 40 GÃ¼nlÃ¼k Taksit PlanÄ±'
    and is_active=true
);

-- =========================================================
-- 6) Moka / POS tahsilatlarÄ± ve taksitleri
-- =========================================================

create table if not exists moka_pos_collections (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  rule_id uuid references moka_pos_rules(id) on delete set null,
  customer_name text,
  collection_date date not null,
  gross_amount numeric(18,2) not null default 0,
  commission_amount numeric(18,2) not null default 0,
  net_amount numeric(18,2) not null default 0,
  installment_count integer not null default 1,
  first_due_date date,
  provider_name text not null default 'Moka/POS',
  account_id uuid references finance_account_cards(id) on delete set null,
  status text not null default 'waiting' check (status in (
    'waiting',
    'partial',
    'completed',
    'overdue',
    'unmatched',
    'control_waiting'
  )),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists moka_pos_installments (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  collection_id uuid references moka_pos_collections(id) on delete cascade,
  installment_no integer not null,
  due_date date not null,
  expected_amount numeric(18,2) not null default 0,
  received_amount numeric(18,2) not null default 0,
  bank_transaction_id uuid,
  status text not null default 'waiting' check (status in (
    'waiting',
    'received',
    'partial',
    'overdue',
    'unmatched',
    'control_waiting'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_moka_pos_installments_due
  on moka_pos_installments(company, due_date, status);

-- =========================================================
-- 7) Banka mail / ekstre ham veri akÄ±ÅŸÄ±
-- =========================================================

create table if not exists bank_mail_inbox (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  mail_provider text not null default 'gmail',
  gmail_message_id text,
  sender_email text,
  subject text,
  received_at timestamptz,
  has_attachment boolean not null default false,
  status text not null default 'new' check (status in (
    'new',
    'downloaded',
    'parsed',
    'failed',
    'duplicate',
    'control_waiting'
  )),
  error_message text,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_bank_mail_inbox_gmail_message
  on bank_mail_inbox(company, gmail_message_id)
  where gmail_message_id is not null;

create table if not exists bank_statement_files (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  mail_id uuid references bank_mail_inbox(id) on delete set null,
  file_name text,
  mime_type text,
  file_size integer,
  storage_url text,
  parse_status text not null default 'waiting' check (parse_status in (
    'waiting',
    'parsed',
    'failed',
    'unsupported',
    'control_waiting'
  )),
  parse_error text,
  created_at timestamptz not null default now()
);

create table if not exists bank_transactions_raw (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  account_id uuid references finance_account_cards(id) on delete set null,
  bank_name text,
  transaction_date date,
  value_date date,
  description text,
  debit_amount numeric(18,2) not null default 0,
  credit_amount numeric(18,2) not null default 0,
  amount numeric(18,2) not null default 0,
  currency text not null default 'TRY',
  balance_after numeric(18,2),
  direction text not null default 'unknown' check (direction in ('in','out','transfer','unknown')),
  raw_text text,
  source_type text,
  source_file_name text,
  transaction_hash text,
  duplicate_status text not null default 'unknown' check (duplicate_status in (
    'unknown',
    'unique',
    'duplicate',
    'possible_duplicate'
  )),
  status text not null default 'raw_data' check (status in (
    'raw_data',
    'parsed',
    'suggestion_ready',
    'approval_waiting',
    'approved',
    'rejected',
    'processed',
    'failed',
    'duplicate',
    'control_waiting'
  )),
  created_at timestamptz not null default now()
);

create unique index if not exists uq_bank_transactions_raw_hash
  on bank_transactions_raw(company, transaction_hash)
  where transaction_hash is not null;

-- =========================================================
-- 8) Ã–neri / eÅŸleÅŸtirme merkezi
-- =========================================================

create table if not exists cash_transaction_suggestions (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  raw_transaction_id uuid references bank_transactions_raw(id) on delete cascade,
  suggested_type text not null check (suggested_type in (
    'tahsilat',
    'odeme',
    'virman',
    'moka_tahsilat',
    'moka_banka_gecisi',
    'pos_tahsilat',
    'kredi_karti_odeme',
    'kredi_taksidi',
    'tedarikci_odeme',
    'gider_odeme',
    'vergi',
    'sgk',
    'kontrol_bekliyor'
  )),
  suggested_account_id uuid references finance_account_cards(id) on delete set null,
  suggested_customer_name text,
  suggested_counter_account uuid references finance_account_cards(id) on delete set null,
  confidence_score numeric(5,2) not null default 0,
  match_reason text,
  risk_note text,
  approval_status text not null default 'approval_waiting' check (approval_status in (
    'suggestion_ready',
    'approval_waiting',
    'approved',
    'rejected',
    'duplicate',
    'control_waiting'
  )),
  created_at timestamptz not null default now()
);

-- =========================================================
-- 9) AperiON onaylÄ± klon finans defteri
-- =========================================================

create table if not exists aperion_finance_entries (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  entry_date date not null default current_date,
  entry_type text not null check (entry_type in (
    'tahsilat',
    'odeme',
    'virman',
    'kasa_giris',
    'kasa_cikis',
    'moka_pos_tahsilat',
    'moka_pos_banka_gecisi',
    'kredi_karti_odeme',
    'kredi_taksidi',
    'tedarikci_odeme',
    'gider_odeme',
    'gider_tahakkuk',
    'vergi',
    'sgk',
    'cek_tahsil',
    'cek_odeme',
    'senet_tahsil',
    'senet_odeme',
    'kontrol_bekliyor'
  )),
  title text,
  description text,
  customer_name text,
  supplier_name text,
  total_amount numeric(18,2) not null default 0,
  currency text not null default 'TRY',
  source_type text,
  source_id uuid,
  transaction_hash text,
  approval_status text not null default 'approval_waiting' check (approval_status in (
    'raw_data',
    'suggestion_ready',
    'approval_waiting',
    'approved',
    'rejected',
    'duplicate',
    'control_waiting'
  )),
  aperion_posting_status text not null default 'not_posted' check (aperion_posting_status in (
    'not_posted',
    'posted',
    'failed'
  )),
  bizimhesap_posting_status text not null default 'not_required' check (bizimhesap_posting_status in (
    'not_required',
    'pending',
    'posted',
    'failed',
    'skipped'
  )),
  bizimhesap_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_aperion_finance_entries_hash
  on aperion_finance_entries(company, transaction_hash)
  where transaction_hash is not null;

create table if not exists aperion_finance_entry_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references aperion_finance_entries(id) on delete cascade,
  company text not null default 'alayli',
  account_id uuid references finance_account_cards(id) on delete set null,
  account_type text,
  account_name text,
  debit_amount numeric(18,2) not null default 0,
  credit_amount numeric(18,2) not null default 0,
  currency text not null default 'TRY',
  line_description text,
  created_at timestamptz not null default now()
);

create table if not exists aperion_finance_entry_source_links (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references aperion_finance_entries(id) on delete cascade,
  source_type text,
  source_id uuid,
  source_table text,
  source_ref text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 10) Onay merkezi ve BizimHesap kuyruÄŸu
-- =========================================================

create table if not exists aperion_approval_center (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  source_type text not null,
  source_id uuid,
  approval_title text not null,
  approval_description text,
  suggested_entry_type text,
  suggested_customer_name text,
  suggested_account_id uuid references finance_account_cards(id) on delete set null,
  suggested_counter_account_id uuid references finance_account_cards(id) on delete set null,
  suggested_amount numeric(18,2) not null default 0,
  confidence_score numeric(5,2) not null default 0,
  match_reason text,
  risk_note text,
  status text not null default 'approval_waiting' check (status in (
    'approval_waiting',
    'approved',
    'rejected',
    'processed',
    'failed',
    'duplicate',
    'control_waiting'
  )),
  approved_by text,
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bizimhesap_posting_queue (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  entry_id uuid references aperion_finance_entries(id) on delete cascade,
  posting_type text,
  customer_name text,
  amount numeric(18,2) not null default 0,
  currency text not null default 'TRY',
  transaction_date date,
  description text,
  status text not null default 'pending' check (status in (
    'pending',
    'posted',
    'failed',
    'skipped',
    'cancelled'
  )),
  dry_run boolean not null default true,
  queued_at timestamptz not null default now(),
  posted_at timestamptz,
  retry_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bizimhesap_posting_log (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references bizimhesap_posting_queue(id) on delete cascade,
  entry_id uuid references aperion_finance_entries(id) on delete cascade,
  company text not null default 'alayli',
  status text not null,
  message text,
  screenshot_url text,
  posted_reference text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 11) Onay loglarÄ± ve mutabakat
-- =========================================================

create table if not exists cash_approval_log (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  source_type text not null,
  source_id uuid,
  action text not null,
  old_status text,
  new_status text,
  approved_by text,
  approved_at timestamptz default now(),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists finance_reconciliation_logs (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  account_id uuid references finance_account_cards(id) on delete set null,
  movement_id uuid references finance_account_movements(id) on delete set null,
  reconciliation_type text,
  system_amount numeric(18,2),
  external_amount numeric(18,2),
  difference_amount numeric(18,2),
  status text not null default 'not_checked' check (status in (
    'not_checked',
    'matched',
    'partial',
    'difference',
    'failed',
    'control_waiting'
  )),
  note text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 12) YardÄ±mcÄ± fonksiyon: Moka/POS taksit planÄ± Ã¼retimi
-- =========================================================

create or replace function create_moka_pos_installment_plan(p_collection_id uuid)
returns integer
language plpgsql
as $$
declare
  c record;
  r record;
  i integer;
  installment_amount numeric(18,2);
  due_date_calc date;
  inserted_count integer := 0;
begin
  select * into c
  from moka_pos_collections
  where id = p_collection_id;

  if not found then
    raise exception 'Moka/POS collection not found: %', p_collection_id;
  end if;

  select * into r
  from moka_pos_rules
  where id = c.rule_id;

  if not found then
    select * into r
    from moka_pos_rules
    where company = c.company
      and is_active = true
      and valid_from <= c.collection_date
      and (valid_to is null or valid_to >= c.collection_date)
    order by valid_from desc
    limit 1;
  end if;

  if not found then
    raise exception 'Moka/POS rule not found for company: %', c.company;
  end if;

  delete from moka_pos_installments where collection_id = p_collection_id;

  installment_amount := round(c.net_amount / greatest(c.installment_count, 1), 2);

  for i in 1..greatest(c.installment_count, 1) loop
    due_date_calc := c.collection_date
      + ((r.first_installment_delay_days + ((i - 1) * r.installment_interval_days)) || ' days')::interval;

    insert into moka_pos_installments (
      company,
      collection_id,
      installment_no,
      due_date,
      expected_amount,
      received_amount,
      status
    ) values (
      c.company,
      c.id,
      i,
      due_date_calc,
      case
        when i = c.installment_count then
          c.net_amount - (installment_amount * (c.installment_count - 1))
        else
          installment_amount
      end,
      0,
      'waiting'
    );

    inserted_count := inserted_count + 1;
  end loop;

  update moka_pos_collections
  set first_due_date = (
    select min(due_date)
    from moka_pos_installments
    where collection_id = p_collection_id
  ),
  updated_at = now()
  where id = p_collection_id;

  return inserted_count;
end;
$$;

-- =========================================================
-- 13) Tek tÄ±k onay fonksiyonu
-- =========================================================

create or replace function approve_and_queue_finance_entry(
  p_approval_id uuid,
  p_approved_by text default 'Foto',
  p_dry_run boolean default true
)
returns uuid
language plpgsql
as $$
declare
  a record;
  e_id uuid;
begin
  select * into a
  from aperion_approval_center
  where id = p_approval_id
  for update;

  if not found then
    raise exception 'Approval not found: %', p_approval_id;
  end if;

  if a.status <> 'approval_waiting' then
    raise exception 'Approval status is not approval_waiting: %', a.status;
  end if;

  insert into aperion_finance_entries (
    company,
    entry_date,
    entry_type,
    title,
    description,
    customer_name,
    total_amount,
    currency,
    source_type,
    source_id,
    approval_status,
    aperion_posting_status,
    bizimhesap_posting_status
  ) values (
    a.company,
    current_date,
    coalesce(a.suggested_entry_type, 'kontrol_bekliyor'),
    a.approval_title,
    a.approval_description,
    a.suggested_customer_name,
    a.suggested_amount,
    'TRY',
    a.source_type,
    a.source_id,
    'approved',
    'posted',
    'pending'
  )
  returning id into e_id;

  insert into aperion_finance_entry_source_links (
    entry_id,
    source_type,
    source_id,
    source_table,
    source_ref
  ) values (
    e_id,
    a.source_type,
    a.source_id,
    a.source_type,
    a.source_id::text
  );

  insert into bizimhesap_posting_queue (
    company,
    entry_id,
    posting_type,
    customer_name,
    amount,
    currency,
    transaction_date,
    description,
    status,
    dry_run
  ) values (
    a.company,
    e_id,
    a.suggested_entry_type,
    a.suggested_customer_name,
    a.suggested_amount,
    'TRY',
    current_date,
    a.approval_description,
    'pending',
    p_dry_run
  );

  update aperion_approval_center
  set status = 'approved',
      approved_by = p_approved_by,
      approved_at = now(),
      updated_at = now()
  where id = p_approval_id;

  insert into cash_approval_log (
    company,
    source_type,
    source_id,
    action,
    old_status,
    new_status,
    approved_by,
    note
  ) values (
    a.company,
    a.source_type,
    a.source_id,
    'approve_and_queue_finance_entry',
    'approval_waiting',
    'approved',
    p_approved_by,
    'AperiON klon kaydÄ± oluÅŸturuldu ve BizimHesap kuyruÄŸuna alÄ±ndÄ±.'
  );

  return e_id;
end;
$$;

-- =========================================================
-- 14) View'lar
-- =========================================================

create or replace view finance_account_cards_live_v57_view as
select
  c.*,
  coalesce(m.in_total,0) as movement_in_total,
  coalesce(m.out_total,0) as movement_out_total,
  c.opening_balance + coalesce(m.in_total,0) - coalesce(m.out_total,0) as calculated_balance
from finance_account_cards c
left join (
  select
    account_id,
    sum(case when direction='in' then amount else 0 end) as in_total,
    sum(case when direction='out' then amount else 0 end) as out_total
  from finance_account_movements
  where approval_status='approved'
    and posting_status in ('not_required','posted')
  group by account_id
) m on m.account_id = c.id;

create or replace view finance_account_balance_summary_v57_view as
select
  company,
  account_type,
  count(*) as account_count,
  sum(current_balance) as current_balance_total,
  sum(usable_balance) as usable_balance_total,
  sum(blocked_amount) as blocked_amount_total
from finance_account_cards
where is_active = true
group by company, account_type;

create or replace view moka_pos_expected_v57_view as
select
  i.company,
  i.due_date,
  sum(i.expected_amount - i.received_amount) as expected_remaining_amount,
  count(*) as installment_count
from moka_pos_installments i
where i.status in ('waiting','partial','overdue','control_waiting')
group by i.company, i.due_date;

create or replace view finance_due_today_v57_view as
select *
from finance_due_plans
where due_date = current_date
  and status in ('planned','partial','control_waiting');

create or replace view finance_due_week_v57_view as
select *
from finance_due_plans
where due_date between current_date and current_date + interval '7 days'
  and status in ('planned','partial','control_waiting');

create or replace view finance_due_month_v57_view as
select *
from finance_due_plans
where due_date between current_date and (date_trunc('month', current_date)::date + interval '1 month - 1 day')
  and status in ('planned','partial','control_waiting');

create or replace view finance_cash_position_v57_view as
select
  company,
  sum(case when account_type in ('bank','cash') then usable_balance else 0 end) as available_cash,
  sum(case when account_type in ('moka_pos','pos') then current_balance else 0 end) as moka_pos_pending_balance,
  sum(case when account_type='credit_card' then current_balance else 0 end) as credit_card_balance,
  sum(case when account_type='overdraft' then current_balance else 0 end) as overdraft_balance
from finance_account_cards
where is_active = true
group by company;

create or replace view cash_dashboard_period_metrics_v57_view as
select
  d.company,
  d.period_key,
  d.period_label,
  coalesce(sum(case when p.direction='in' then p.remaining_amount else 0 end),0) as incoming_amount,
  coalesce(sum(case when p.direction='out' then p.remaining_amount else 0 end),0) as outgoing_amount,
  coalesce(sum(case when p.direction='in' then p.remaining_amount else 0 end),0)
    - coalesce(sum(case when p.direction='out' then p.remaining_amount else 0 end),0) as net_cash_amount
from (
  select 'alayli'::text as company, 'today'::text as period_key, 'BugÃ¼n'::text as period_label, current_date as start_date, current_date as end_date
  union all select 'alayli','tomorrow','YarÄ±n', current_date + 1, current_date + 1
  union all select 'alayli','this_week','Bu Hafta', current_date, current_date + 7
  union all select 'alayli','this_month','Bu Ay', date_trunc('month', current_date)::date, (date_trunc('month', current_date)::date + interval '1 month - 1 day')::date
  union all select 'alayli','month_end','Ay Sonuna Kadar', current_date, (date_trunc('month', current_date)::date + interval '1 month - 1 day')::date
) d
left join finance_due_plans p
  on p.company = d.company
 and p.due_date between d.start_date and d.end_date
 and p.status in ('planned','partial','control_waiting')
group by d.company, d.period_key, d.period_label;

create or replace view cash_approval_waiting_v57_view as
select *
from aperion_approval_center
where status in ('approval_waiting','control_waiting','failed','duplicate');

create or replace view finance_reconciliation_status_v57_view as
select
  company,
  status,
  count(*) as log_count,
  sum(coalesce(difference_amount,0)) as difference_total
from finance_reconciliation_logs
group by company, status;

create or replace view cash_forecast_v57_view as
select
  m.company,
  m.period_key,
  m.period_label,
  m.incoming_amount,
  m.outgoing_amount,
  m.net_cash_amount,
  coalesce(cp.available_cash,0) as available_cash,
  coalesce(cp.moka_pos_pending_balance,0) as moka_pos_pending_balance,
  coalesce(cp.available_cash,0) + m.net_cash_amount as forecast_cash_after_period
from cash_dashboard_period_metrics_v57_view m
left join finance_cash_position_v57_view cp
  on cp.company = m.company;

-- =========================================================
-- 15) ALAYLI varsayÄ±lan hesap seed'leri
-- =========================================================

insert into finance_account_cards (company, account_type, account_code, account_name, currency, note)
select 'alayli', 'cash', 'KASA-TRY', 'ALAYLI Kasa TL', 'TRY', 'VarsayÄ±lan kasa hesabÄ±'
where not exists (
  select 1 from finance_account_cards where company='alayli' and account_code='KASA-TRY'
);

insert into finance_account_cards (company, account_type, account_code, account_name, currency, note)
select 'alayli', 'moka_pos', 'MOKA-POS', 'Moka/POS Bekleyen Tahsilatlar', 'TRY', 'Bankaya henÃ¼z geÃ§memiÅŸ Moka/POS taksitleri'
where not exists (
  select 1 from finance_account_cards where company='alayli' and account_code='MOKA-POS'
);

insert into finance_account_cards (company, account_type, account_code, account_name, currency, note)
select 'alayli', 'bank', 'BANKA-GENEL', 'ALAYLI Banka Genel', 'TRY', 'Banka hesaplarÄ± iÃ§in genel baÅŸlangÄ±Ã§ kartÄ±'
where not exists (
  select 1 from finance_account_cards where company='alayli' and account_code='BANKA-GENEL'
);

-- Quick checks:
-- select * from finance_account_cards_live_v57_view where company='alayli';
-- select * from cash_forecast_v57_view where company='alayli';
-- select * from moka_pos_rules where company='alayli';


-- ============================================================
-- Finance calendar v58: tahakkuk, takvim, ana ekran finans drawer ve aksiyon RPC
-- File: AperiON_Finance_Calendar_FULL_INSTALL_v58.sql
-- ============================================================
-- AperiON Finance Calendar FULL INSTALL v58
-- Bu dosya Supabase SQL Editor icin tek parca kurulum paketidir.
-- Kural: Mevcut veriyi silmez. Tablo/view/fonksiyon yoksa olusturur, seed kayitlari ayni baslik+tarih varsa tekrar eklemez.
-- Sira: v47 canli model, v48 aksiyon RPC, v47 seed.
-- ============================================================
-- AperiON_Finance_Calendar_Live_SQL_v47.sql
-- ============================================================
-- AperiON Finance Calendar Live SQL v47
-- Purpose: central live finance calendar for payables, receivables, tasks, approvals, credits, cards, checks, notes, Moka and fixed payments.
-- Safe rule: creates tables/views only. No existing data is changed.

create table if not exists finance_calendar_items (
  id bigserial primary key,
  company text not null default 'ALAYLI',
  item_date date not null,
  original_due_date date,
  effective_due_date date,
  item_type text not null, -- payable, receivable, task, approval, credit, credit_card, check, note, moka, fixed_payment, variable_expense
  direction text not null default 'out', -- in, out, neutral
  title text not null,
  description text,
  cari_name text,
  account_name text,
  category text,
  expected_amount numeric(18,2) default 0,
  paid_amount numeric(18,2) default 0,
  collected_amount numeric(18,2) default 0,
  remaining_amount numeric(18,2) generated always as (
    greatest(coalesce(expected_amount,0) - greatest(coalesce(paid_amount,0), coalesce(collected_amount,0)), 0)
  ) stored,
  status text default 'open', -- open, partial, done, postponed, cancelled, waiting_approval
  priority text default 'normal', -- low, normal, high, critical
  fixed_or_variable text default 'variable', -- fixed, variable
  source_type text default 'manual', -- manual, bizimhesap, telegram, bank, moka, system, excel
  source_table text,
  source_id bigint,
  telegram_message_id text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists finance_calendar_holidays (
  id bigserial primary key,
  holiday_date date not null unique,
  holiday_name text not null,
  country text default 'TR',
  created_at timestamptz default now()
);

create table if not exists fixed_payment_contracts (
  id bigserial primary key,
  company text not null default 'ALAYLI',
  cari_name text,
  contract_name text not null,
  start_date date not null,
  end_date date,
  payment_period text default 'monthly', -- monthly, weekly, yearly, custom
  payment_day integer default 1,
  amount numeric(18,2) not null default 0,
  increase_rule text,
  deposit_amount numeric(18,2) default 0,
  category text,
  active boolean default true,
  document_url text,
  note text,
  created_at timestamptz default now()
);

create table if not exists finance_calendar_action_log (
  id bigserial primary key,
  company text not null default 'ALAYLI',
  item_id bigint,
  action_type text not null, -- paid, collected, done, postponed, note, approved, rejected
  old_status text,
  new_status text,
  old_date date,
  new_date date,
  amount numeric(18,2),
  actor text default 'system',
  source_type text default 'manual',
  note text,
  created_at timestamptz default now()
);

-- Adjust due date to next business day if weekend or holiday.
-- This function is intentionally simple and stable for dashboard use.
create or replace function finance_next_business_day(d date)
returns date
language plpgsql
stable
as $$
declare
  x date := d;
begin
  while extract(isodow from x) in (6,7) or exists(select 1 from finance_calendar_holidays h where h.holiday_date = x) loop
    x := x + interval '1 day';
  end loop;
  return x;
end;
$$;

-- Base view with period buckets.
create or replace view finance_calendar_live_view as
select
  company,
  id,
  coalesce(effective_due_date, finance_next_business_day(coalesce(original_due_date, item_date))) as calendar_date,
  item_date,
  original_due_date,
  item_type,
  direction,
  title,
  description,
  cari_name,
  account_name,
  category,
  expected_amount,
  paid_amount,
  collected_amount,
  remaining_amount,
  status,
  priority,
  fixed_or_variable,
  source_type,
  source_table,
  source_id,
  case
    when status in ('done','cancelled') then 'closed'
    when coalesce(effective_due_date, finance_next_business_day(coalesce(original_due_date, item_date))) < current_date then 'overdue'
    when coalesce(effective_due_date, finance_next_business_day(coalesce(original_due_date, item_date))) = current_date then 'today'
    when coalesce(effective_due_date, finance_next_business_day(coalesce(original_due_date, item_date))) = current_date + interval '1 day' then 'tomorrow'
    when coalesce(effective_due_date, finance_next_business_day(coalesce(original_due_date, item_date))) < current_date + interval '7 days' then 'this_week'
    when coalesce(effective_due_date, finance_next_business_day(coalesce(original_due_date, item_date))) < date_trunc('month', current_date)::date + interval '1 month' then 'until_month_end'
    when coalesce(effective_due_date, finance_next_business_day(coalesce(original_due_date, item_date))) < date_trunc('month', current_date)::date + interval '2 months' then 'next_month'
    else 'future'
  end as period_status,
  case
    when direction='in' then remaining_amount
    when direction='out' then -remaining_amount
    else 0
  end as cash_effect,
  created_at,
  updated_at
from finance_calendar_items
where status not in ('cancelled')
  and (status <> 'done' or remaining_amount > 0);

-- Drawer/list source for AperiON UI.
create or replace view finance_calendar_drawer_view as
select *
from finance_calendar_live_view
where period_status in ('overdue','today','tomorrow','this_week','until_month_end')
order by
  case period_status
    when 'overdue' then 1
    when 'today' then 2
    when 'tomorrow' then 3
    when 'this_week' then 4
    when 'until_month_end' then 5
    else 9
  end,
  calendar_date asc,
  case priority when 'critical' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,
  id desc;

-- KPI summary for sales screen and main dashboard.
create or replace view finance_calendar_summary_view as
select
  company,
  sum(case when direction='out' and period_status='today' then remaining_amount else 0 end) as today_payable,
  sum(case when direction='in' and period_status='today' then remaining_amount else 0 end) as today_receivable,
  sum(case when direction='out' and period_status='overdue' then remaining_amount else 0 end) as overdue_payable,
  sum(case when direction='in' and period_status='overdue' then remaining_amount else 0 end) as overdue_receivable,
  sum(case when direction='out' and period_status in ('today','tomorrow','this_week') then remaining_amount else 0 end) as week_payable,
  sum(case when direction='in' and period_status in ('today','tomorrow','this_week') then remaining_amount else 0 end) as week_receivable,
  sum(case when direction='out' and period_status in ('today','tomorrow','this_week','until_month_end') then remaining_amount else 0 end) as month_end_payable,
  sum(case when direction='in' and period_status in ('today','tomorrow','this_week','until_month_end') then remaining_amount else 0 end) as month_end_receivable,
  count(*) filter (where item_type='task' and period_status in ('overdue','today')) as urgent_tasks,
  count(*) filter (where item_type='approval' and period_status in ('overdue','today','this_week')) as waiting_approvals,
  sum(case when period_status='today' then cash_effect else 0 end) as today_cash_net,
  sum(case when period_status in ('today','tomorrow','this_week') then cash_effect else 0 end) as week_cash_net,
  sum(case when period_status in ('today','tomorrow','this_week','until_month_end') then cash_effect else 0 end) as month_end_cash_net
from finance_calendar_live_view
group by company;

-- Sales screen mini finance summary, v47 replacement.
-- This project may not have the older sales_flow_kpi_today_view, so sales totals are read directly from sales_raw.
create or replace view sales_flow_finance_mini_v47_view as
with sales_today as (
  select
    'ALAYLI'::text as company,
    coalesce(sum(ciro), 0)::numeric(18,2) as today_sales,
    coalesce(sum(adet), 0)::numeric(18,2) as today_qty
  from sales_raw
  where firma_id = 'alayli'
    and tarih = current_date
)
select
  coalesce(s.company, f.company) as company,
  coalesce(s.today_sales, 0) as today_sales,
  coalesce(s.today_qty, 0) as today_qty,
  coalesce(f.today_payable, 0) as today_payable,
  coalesce(f.today_receivable, 0) as today_receivable,
  coalesce(f.overdue_payable, 0) as overdue_payable,
  coalesce(f.overdue_receivable, 0) as overdue_receivable,
  coalesce(f.urgent_tasks, 0) as urgent_tasks,
  coalesce(f.waiting_approvals, 0) as waiting_approvals,
  coalesce(f.today_cash_net, 0) as today_cash_net,
  coalesce(f.week_cash_net, 0) as week_cash_net,
  coalesce(f.month_end_cash_net, 0) as month_end_cash_net
from sales_today s
full join finance_calendar_summary_view f on f.company = s.company;

create index if not exists idx_finance_calendar_items_company_date on finance_calendar_items(company, item_date, status);
create index if not exists idx_finance_calendar_items_type_status on finance_calendar_items(company, item_type, status);
create index if not exists idx_fixed_payment_contracts_company_active on fixed_payment_contracts(company, active, start_date, end_date);
create index if not exists idx_finance_calendar_action_log_item on finance_calendar_action_log(item_id, created_at);


-- ============================================================
-- AperiON_Finance_Calendar_Actions_SQL_v48.sql
-- ============================================================
-- AperiON Finance Calendar Actions SQL v48
-- Purpose: safe RPC functions for Telegram/UI action buttons.
-- Safe rule: every status/date/amount change writes finance_calendar_action_log.
-- Requires: AperiON_Finance_Calendar_Live_SQL_v47.sql

create or replace function finance_calendar_log_action(
  p_company text,
  p_item_id bigint,
  p_action_type text,
  p_old_status text,
  p_new_status text,
  p_old_date date,
  p_new_date date,
  p_amount numeric,
  p_actor text,
  p_source_type text,
  p_note text
)
returns bigint
language plpgsql
security definer
as $$
declare
  v_log_id bigint;
begin
  insert into finance_calendar_action_log (
    company, item_id, action_type, old_status, new_status, old_date, new_date, amount, actor, source_type, note
  ) values (
    coalesce(p_company,'ALAYLI'), p_item_id, p_action_type, p_old_status, p_new_status, p_old_date, p_new_date, p_amount, coalesce(p_actor,'telegram'), coalesce(p_source_type,'telegram'), p_note
  ) returning id into v_log_id;
  return v_log_id;
end;
$$;

create or replace function finance_calendar_mark_paid(
  p_item_id bigint,
  p_amount numeric default null,
  p_actor text default 'telegram',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v finance_calendar_items%rowtype;
  v_amount numeric;
begin
  select * into v from finance_calendar_items where id = p_item_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;
  if v.direction <> 'out' then
    return jsonb_build_object('ok', false, 'error', 'not_payable_item');
  end if;

  v_amount := coalesce(p_amount, v.remaining_amount, v.expected_amount, 0);

  update finance_calendar_items
  set paid_amount = least(coalesce(paid_amount,0) + v_amount, coalesce(expected_amount,0)),
      status = case when least(coalesce(paid_amount,0) + v_amount, coalesce(expected_amount,0)) >= coalesce(expected_amount,0) then 'done' else 'partial' end,
      updated_at = now()
  where id = p_item_id;

  perform finance_calendar_log_action(v.company, v.id, 'paid', v.status,
    case when coalesce(v.paid_amount,0) + v_amount >= coalesce(v.expected_amount,0) then 'done' else 'partial' end,
    v.item_date, v.item_date, v_amount, p_actor, 'telegram', p_note);

  return jsonb_build_object('ok', true, 'action', 'paid', 'item_id', p_item_id, 'amount', v_amount);
end;
$$;

create or replace function finance_calendar_mark_collected(
  p_item_id bigint,
  p_amount numeric default null,
  p_actor text default 'telegram',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v finance_calendar_items%rowtype;
  v_amount numeric;
begin
  select * into v from finance_calendar_items where id = p_item_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;
  if v.direction <> 'in' then
    return jsonb_build_object('ok', false, 'error', 'not_receivable_item');
  end if;

  v_amount := coalesce(p_amount, v.remaining_amount, v.expected_amount, 0);

  update finance_calendar_items
  set collected_amount = least(coalesce(collected_amount,0) + v_amount, coalesce(expected_amount,0)),
      status = case when least(coalesce(collected_amount,0) + v_amount, coalesce(expected_amount,0)) >= coalesce(expected_amount,0) then 'done' else 'partial' end,
      updated_at = now()
  where id = p_item_id;

  perform finance_calendar_log_action(v.company, v.id, 'collected', v.status,
    case when coalesce(v.collected_amount,0) + v_amount >= coalesce(v.expected_amount,0) then 'done' else 'partial' end,
    v.item_date, v.item_date, v_amount, p_actor, 'telegram', p_note);

  return jsonb_build_object('ok', true, 'action', 'collected', 'item_id', p_item_id, 'amount', v_amount);
end;
$$;

create or replace function finance_calendar_mark_done(
  p_item_id bigint,
  p_actor text default 'telegram',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v finance_calendar_items%rowtype;
begin
  select * into v from finance_calendar_items where id = p_item_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;

  update finance_calendar_items
  set status = 'done', updated_at = now()
  where id = p_item_id;

  perform finance_calendar_log_action(v.company, v.id, 'done', v.status, 'done', v.item_date, v.item_date, 0, p_actor, 'telegram', p_note);

  return jsonb_build_object('ok', true, 'action', 'done', 'item_id', p_item_id);
end;
$$;

create or replace function finance_calendar_postpone(
  p_item_id bigint,
  p_new_date date,
  p_actor text default 'telegram',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v finance_calendar_items%rowtype;
  v_effective date;
begin
  select * into v from finance_calendar_items where id = p_item_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;
  if p_new_date is null then
    return jsonb_build_object('ok', false, 'error', 'new_date_required');
  end if;

  v_effective := finance_next_business_day(p_new_date);

  update finance_calendar_items
  set item_date = p_new_date,
      original_due_date = coalesce(original_due_date, v.item_date),
      effective_due_date = v_effective,
      status = 'postponed',
      updated_at = now()
  where id = p_item_id;

  perform finance_calendar_log_action(v.company, v.id, 'postponed', v.status, 'postponed', v.item_date, v_effective, 0, p_actor, 'telegram', p_note);

  return jsonb_build_object('ok', true, 'action', 'postponed', 'item_id', p_item_id, 'new_date', v_effective);
end;
$$;

create or replace function finance_calendar_approve(
  p_item_id bigint,
  p_actor text default 'telegram',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v finance_calendar_items%rowtype;
begin
  select * into v from finance_calendar_items where id = p_item_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;

  update finance_calendar_items
  set status = 'done', updated_at = now()
  where id = p_item_id;

  perform finance_calendar_log_action(v.company, v.id, 'approved', v.status, 'done', v.item_date, v.item_date, 0, p_actor, 'telegram', p_note);

  return jsonb_build_object('ok', true, 'action', 'approved', 'item_id', p_item_id);
end;
$$;

create or replace function finance_calendar_reject(
  p_item_id bigint,
  p_actor text default 'telegram',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v finance_calendar_items%rowtype;
begin
  select * into v from finance_calendar_items where id = p_item_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;

  update finance_calendar_items
  set status = 'cancelled', updated_at = now()
  where id = p_item_id;

  perform finance_calendar_log_action(v.company, v.id, 'rejected', v.status, 'cancelled', v.item_date, v.item_date, 0, p_actor, 'telegram', p_note);

  return jsonb_build_object('ok', true, 'action', 'rejected', 'item_id', p_item_id);
end;
$$;

-- Optional checks:
-- select finance_calendar_mark_paid(1, null, 'telegram', 'test');
-- select * from finance_calendar_action_log order by id desc limit 20;


-- ============================================================
-- AperiON_Finance_Calendar_Seed_v47.sql
-- ============================================================
-- AperiON Finance Calendar Seed v47
-- Purpose: first safe demo/live starter records for finance_calendar_items.
-- Safe rule: inserts only when the same title + date + company does not already exist.

-- Important: run AperiON_Finance_Calendar_Live_SQL_v47.sql first.

insert into finance_calendar_holidays (holiday_date, holiday_name, country)
values
  ('2026-01-01','YÄ±lbaÅŸÄ±','TR'),
  ('2026-04-23','Ulusal Egemenlik ve Ã‡ocuk BayramÄ±','TR'),
  ('2026-05-01','Emek ve DayanÄ±ÅŸma GÃ¼nÃ¼','TR'),
  ('2026-05-19','AtatÃ¼rkâ€™Ã¼ Anma, GenÃ§lik ve Spor BayramÄ±','TR'),
  ('2026-07-15','Demokrasi ve Milli Birlik GÃ¼nÃ¼','TR'),
  ('2026-08-30','Zafer BayramÄ±','TR'),
  ('2026-10-29','Cumhuriyet BayramÄ±','TR')
on conflict (holiday_date) do nothing;

insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, note
)
select * from (values
  ('ALAYLI', current_date, current_date, finance_next_business_day(current_date), 'payable', 'out',
   'BugÃ¼n Ã¶denecek - Ã¶rnek tedarikÃ§i Ã¶demesi', 'Ä°lk canlÄ± finans takvimi kontrol kaydÄ±', 'Demo TedarikÃ§i', 'Banka', 'TedarikÃ§i Ã–demesi',
   125000::numeric, 'open', 'high', 'variable', 'seed', 'CanlÄ± veriye geÃ§ince silinebilir veya kapatÄ±labilir'),

  ('ALAYLI', current_date, current_date, finance_next_business_day(current_date), 'receivable', 'in',
   'BugÃ¼n tahsil edilecek - Ã¶rnek cari tahsilatÄ±', 'Ä°lk canlÄ± tahsilat kontrol kaydÄ±', 'Demo Cari', 'Kasa/Banka', 'Cari Tahsilat',
   155000::numeric, 'open', 'high', 'variable', 'seed', 'CanlÄ± veriye geÃ§ince silinebilir veya kapatÄ±labilir'),

  ('ALAYLI', current_date - interval '2 days', current_date - interval '2 days', finance_next_business_day((current_date - interval '2 days')::date), 'payable', 'out',
   'Geciken Ã¶deme - Ã¶rnek kredi kartÄ±', 'Geciken Ã¶deme uyarÄ± testi', 'Banka/Kart', 'Kredi KartÄ±', 'Kredi KartÄ±',
   48500::numeric, 'open', 'critical', 'variable', 'seed', 'Geciken Ã¶deme KPI testi'),

  ('ALAYLI', current_date - interval '3 days', current_date - interval '3 days', finance_next_business_day((current_date - interval '3 days')::date), 'receivable', 'in',
   'Geciken tahsilat - Ã¶rnek mÃ¼ÅŸteri', 'Geciken tahsilat uyarÄ± testi', 'Demo MÃ¼ÅŸteri', 'Cari', 'Tahsilat',
   72000::numeric, 'open', 'critical', 'variable', 'seed', 'Geciken tahsilat KPI testi'),

  ('ALAYLI', current_date + interval '1 day', current_date + interval '1 day', finance_next_business_day((current_date + interval '1 day')::date), 'credit', 'out',
   'YarÄ±n kredi taksiti - Ã¶rnek', 'Kredi taksiti kontrol kaydÄ±', 'Banka', 'Kredi', 'Kredi Taksiti',
   22650::numeric, 'open', 'normal', 'fixed', 'seed', 'Kredi taksiti Ã¶rnek kaydÄ±'),

  ('ALAYLI', current_date, current_date, finance_next_business_day(current_date), 'task', 'neutral',
   'BugÃ¼n yapÄ±lacak - banka ekstresi kontrolÃ¼', 'Banka hareketleri ve Moka transferleri kontrol edilecek', null, null, 'GÃ¶rev',
   0::numeric, 'open', 'high', 'variable', 'seed', 'GÃ¶rev KPI testi'),

  ('ALAYLI', current_date, current_date, finance_next_business_day(current_date), 'approval', 'neutral',
   'Onay bekleyen - fiyat listesi eÅŸleÅŸmesi', 'Telegram fiyat listesi Ã¼rÃ¼n eÅŸleÅŸmesi kontrol edilecek', 'Demo TedarikÃ§i', null, 'Onay',
   0::numeric, 'waiting_approval', 'normal', 'variable', 'seed', 'Onay merkezi testi')
) as v(company,item_date,original_due_date,effective_due_date,item_type,direction,title,description,cari_name,account_name,category,expected_amount,status,priority,fixed_or_variable,source_type,note)
where not exists (
  select 1 from finance_calendar_items f
  where f.company = v.company
    and f.title = v.title
    and f.item_date = v.item_date::date
);

-- Quick check after seed:
-- select * from finance_calendar_summary_view where company='ALAYLI';
-- select * from finance_calendar_drawer_view where company='ALAYLI';



-- ============================================================
-- June 2026 accruals from live sales_raw and masraf_raw
-- File: AperiON_June_2026_Accruals_FROM_LIVE_v58.sql
-- ============================================================
-- AperiON June 2026 Accruals FROM LIVE v58

-- Kaynak: sales_raw ve masraf_raw. Mevcut veriyi silmez; ayni tarih+baslik+tutar varsa tekrar eklemez.

-- Once finance/AperiON_Finance_Calendar_FULL_INSTALL_v58.sql kurulmus olmalidir.

-- Uretim: 2026-06-02T12:05:30.546Z

-- Kayit: 6, Satis tahakkuk: 154235, Gider tahakkuk: 1735



insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, source_table, source_id, note
)
select
  'ALAYLI', '2026-06-01', '2026-06-01', finance_next_business_day('2026-06-01'::date),
  'receivable', 'in',
  'Haziran satÄ±ÅŸ tahakkuku 2026-06-01', '131 satÄ±ÅŸ satÄ±rÄ±, 1442 adet. Kaynak: sales_raw.', 'SatÄ±ÅŸ mÃ¼ÅŸterileri', 'Cari Alacak', 'SatÄ±ÅŸ Tahakkuku',
  127380::numeric, 'open', 'normal', 'variable', 'sales_raw', 'sales_raw', 117626, 'Otomatik Ã¼retilen Haziran tahakkuk adayÄ±; onaydan Ã¶nce kontrol edilir.'
where not exists (
  select 1 from finance_calendar_items
  where company='ALAYLI'
    and item_date='2026-06-01'
    and title='Haziran satÄ±ÅŸ tahakkuku 2026-06-01'
    and expected_amount=127380::numeric
);

insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, source_table, source_id, note
)
select
  'ALAYLI', '2026-06-02', '2026-06-02', finance_next_business_day('2026-06-02'::date),
  'receivable', 'in',
  'Haziran satÄ±ÅŸ tahakkuku 2026-06-02', '43 satÄ±ÅŸ satÄ±rÄ±, 910 adet. Kaynak: sales_raw.', 'SatÄ±ÅŸ mÃ¼ÅŸterileri', 'Cari Alacak', 'SatÄ±ÅŸ Tahakkuku',
  26855::numeric, 'open', 'normal', 'variable', 'sales_raw', 'sales_raw', 117757, 'Otomatik Ã¼retilen Haziran tahakkuk adayÄ±; onaydan Ã¶nce kontrol edilir.'
where not exists (
  select 1 from finance_calendar_items
  where company='ALAYLI'
    and item_date='2026-06-02'
    and title='Haziran satÄ±ÅŸ tahakkuku 2026-06-02'
    and expected_amount=26855::numeric
);

insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, source_table, source_id, note
)
select
  'ALAYLI', '2026-06-02', '2026-06-02', finance_next_business_day('2026-06-02'::date),
  'variable_expense', 'out',
  'Haziran gider tahakkuku Personel Yemek 2026-06-02', 'Personel Giderleri/Yemek', 'Personel Yemek', 'Gider Tahakkuku', 'Personel Yemek',
  950::numeric, 'open', 'normal', 'variable', 'masraf_raw', 'masraf_raw', 2808, 'BizimHesap masraf ham verisinden Haziran gider tahakkuku.'
where not exists (
  select 1 from finance_calendar_items
  where company='ALAYLI'
    and item_date='2026-06-02'
    and title='Haziran gider tahakkuku Personel Yemek 2026-06-02'
    and expected_amount=950::numeric
);

insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, source_table, source_id, note
)
select
  'ALAYLI', '2026-06-02', '2026-06-02', finance_next_business_day('2026-06-02'::date),
  'variable_expense', 'out',
  'Haziran gider tahakkuku Market/Mutfak 2026-06-02', 'Ä°ÅŸletme Giderleri/MARKET', 'Market/Mutfak', 'Gider Tahakkuku', 'Market/Mutfak',
  175::numeric, 'open', 'normal', 'variable', 'masraf_raw', 'masraf_raw', 2809, 'BizimHesap masraf ham verisinden Haziran gider tahakkuku.'
where not exists (
  select 1 from finance_calendar_items
  where company='ALAYLI'
    and item_date='2026-06-02'
    and title='Haziran gider tahakkuku Market/Mutfak 2026-06-02'
    and expected_amount=175::numeric
);

insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, source_table, source_id, note
)
select
  'ALAYLI', '2026-06-01', '2026-06-01', finance_next_business_day('2026-06-01'::date),
  'variable_expense', 'out',
  'Haziran gider tahakkuku Market/Mutfak 2026-06-01', 'Ä°ÅŸletme Giderleri MARKET', 'Market/Mutfak', 'Gider Tahakkuku', 'Market/Mutfak',
  500::numeric, 'open', 'normal', 'variable', 'masraf_raw', 'masraf_raw', 2810, 'BizimHesap masraf ham verisinden Haziran gider tahakkuku.'
where not exists (
  select 1 from finance_calendar_items
  where company='ALAYLI'
    and item_date='2026-06-01'
    and title='Haziran gider tahakkuku Market/Mutfak 2026-06-01'
    and expected_amount=500::numeric
);

insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, source_table, source_id, note
)
select
  'ALAYLI', '2026-06-01', '2026-06-01', finance_next_business_day('2026-06-01'::date),
  'variable_expense', 'out',
  'Haziran gider tahakkuku Market/Mutfak 2026-06-01', 'Ä°ÅŸletme Giderleri/MARKET', 'Market/Mutfak', 'Gider Tahakkuku', 'Market/Mutfak',
  110::numeric, 'open', 'normal', 'variable', 'masraf_raw', 'masraf_raw', 2811, 'BizimHesap masraf ham verisinden Haziran gider tahakkuku.'
where not exists (
  select 1 from finance_calendar_items
  where company='ALAYLI'
    and item_date='2026-06-01'
    and title='Haziran gider tahakkuku Market/Mutfak 2026-06-01'
    and expected_amount=110::numeric
);



select * from finance_calendar_drawer_view where company='ALAYLI' and calendar_date between '2026-06-01' and '2026-06-30' order by calendar_date, id;



-- ============================================================
-- Telegram bank transaction approval RPC v58
-- File: AperiON_Bank_Transaction_Approval_RPC_v58.sql
-- ============================================================
-- AperiON Bank Transaction Approval RPC v58
-- Purpose: Telegram one-click approval for legacy bank_transactions without requiring a local service role key.

create or replace function approve_bank_transaction_v58(
  p_bank_transaction_id bigint,
  p_approved_by text default 'telegram'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  b record;
  q_id uuid;
begin
  select * into b
  from bank_transactions
  where id = p_bank_transaction_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Banka hareketi bulunamadi');
  end if;

  if coalesce(b.onay_durumu, '') <> 'bekliyor' then
    return jsonb_build_object('ok', true, 'message', 'Zaten ' || coalesce(b.onay_durumu, 'islemde'));
  end if;

  update bank_transactions
  set onay_durumu = 'onaylandi',
      bizimhesap_durumu = 'kuyrukta',
      bizimhesap_mesaj = 'Telegram tek tik onaylandi; BizimHesap posting kuyruguna alindi.',
      updated_at = now()
  where id = p_bank_transaction_id;

  insert into bizimhesap_posting_queue (
    company,
    posting_type,
    customer_name,
    amount,
    currency,
    transaction_date,
    description,
    status,
    dry_run
  ) values (
    coalesce(b.firma_id, 'alayli'),
    coalesce(b.tur, 'bank_transaction'),
    coalesce(b.cari_unvan, b.karsi_taraf),
    abs(coalesce(b.tutar, 0)),
    'TRY',
    b.tarih,
    coalesce(b.aciklama, 'Banka hareketi') || ' | bank_transactions#' || p_bank_transaction_id::text,
    'pending',
    true
  )
  returning id into q_id;

  return jsonb_build_object('ok', true, 'message', 'Onaylandi ve BizimHesap kuyruguna alindi', 'queue_id', q_id);
end;
$$;

create or replace function reject_bank_transaction_v58(
  p_bank_transaction_id bigint,
  p_rejected_by text default 'telegram'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  b record;
begin
  select * into b
  from bank_transactions
  where id = p_bank_transaction_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Banka hareketi bulunamadi');
  end if;

  update bank_transactions
  set onay_durumu = 'reddedildi',
      bizimhesap_durumu = 'iptal',
      bizimhesap_mesaj = 'Telegram tek tik reddedildi.',
      updated_at = now()
  where id = p_bank_transaction_id;

  return jsonb_build_object('ok', true, 'message', 'Reddedildi');
end;
$$;
