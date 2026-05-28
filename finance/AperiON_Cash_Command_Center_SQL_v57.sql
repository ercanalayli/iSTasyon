-- AperiON Cash Command Center SQL v57
-- ALAYLI Medikal için banka, kasa, Moka/POS, onaylı klon finans defteri ve BizimHesap aktarım omurgası.
-- Kural: Onaysız hiçbir hareket kesin finans kaydı veya BizimHesap kaydı olmaz.

create extension if not exists pgcrypto;

-- =========================================================
-- 1) Hesap kartları: banka, kasa, Moka/POS, kredi kartı, çek, senet, kredi vb.
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
-- 3) Belgeler: satış, alış, gider, banka ekstresi, kart ekstresi, çek/senet vb.
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
-- 4) Vade / tahsilat / ödeme planları
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
-- 5) Moka / POS anlaşma kuralları
-- Varsayılan: ilk taksit 40 gün sonra, sonraki taksitler +40 gün.
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
  'Varsayılan 40 Günlük Taksit Planı',
  40,
  40,
  current_date,
  null,
  true,
  'İlk taksit tahsilat tarihinden 40 gün sonra, sonraki taksitler bir önceki taksitten 40 gün sonra.'
where not exists (
  select 1
  from moka_pos_rules
  where company='alayli'
    and provider_name='Moka/POS'
    and rule_name='Varsayılan 40 Günlük Taksit Planı'
    and is_active=true
);

-- =========================================================
-- 6) Moka / POS tahsilatları ve taksitleri
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
-- 7) Banka mail / ekstre ham veri akışı
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
-- 8) Öneri / eşleştirme merkezi
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
-- 9) AperiON onaylı klon finans defteri
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
-- 10) Onay merkezi ve BizimHesap kuyruğu
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
-- 11) Onay logları ve mutabakat
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
-- 12) Yardımcı fonksiyon: Moka/POS taksit planı üretimi
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
-- 13) Tek tık onay fonksiyonu
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
    'AperiON klon kaydı oluşturuldu ve BizimHesap kuyruğuna alındı.'
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
  select 'alayli'::text as company, 'today'::text as period_key, 'Bugün'::text as period_label, current_date as start_date, current_date as end_date
  union all select 'alayli','tomorrow','Yarın', current_date + 1, current_date + 1
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
-- 15) ALAYLI varsayılan hesap seed'leri
-- =========================================================

insert into finance_account_cards (company, account_type, account_code, account_name, currency, note)
select 'alayli', 'cash', 'KASA-TRY', 'ALAYLI Kasa TL', 'TRY', 'Varsayılan kasa hesabı'
where not exists (
  select 1 from finance_account_cards where company='alayli' and account_code='KASA-TRY'
);

insert into finance_account_cards (company, account_type, account_code, account_name, currency, note)
select 'alayli', 'moka_pos', 'MOKA-POS', 'Moka/POS Bekleyen Tahsilatlar', 'TRY', 'Bankaya henüz geçmemiş Moka/POS taksitleri'
where not exists (
  select 1 from finance_account_cards where company='alayli' and account_code='MOKA-POS'
);

insert into finance_account_cards (company, account_type, account_code, account_name, currency, note)
select 'alayli', 'bank', 'BANKA-GENEL', 'ALAYLI Banka Genel', 'TRY', 'Banka hesapları için genel başlangıç kartı'
where not exists (
  select 1 from finance_account_cards where company='alayli' and account_code='BANKA-GENEL'
);

-- Quick checks:
-- select * from finance_account_cards_live_v57_view where company='alayli';
-- select * from cash_forecast_v57_view where company='alayli';
-- select * from moka_pos_rules where company='alayli';
