-- =========================================================
-- AperiON v59 - Moka Reconciliation SQL
-- =========================================================
-- Purpose:
-- Track Moka United as a controlled intermediate account.
-- Moka collections are entered/imported separately; bank transfers
-- from Moka are matched against expected settlement amounts.
-- No final record is created without review/approval.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists aperion_moka_expected_settlements_v59 (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  moka_reference text,
  customer_name text,
  installment_no integer,
  total_installments integer,
  sale_date date,
  expected_bank_date date,
  gross_amount numeric(18,2),
  commission_amount numeric(18,2) not null default 0,
  net_expected_amount numeric(18,2) not null,
  currency text not null default 'TRY',
  status text not null default 'expected'
    check (status in ('expected','matched','partial','overpaid','cancelled','error')),
  matched_transaction_id uuid references aperion_bank_transactions_raw_v59(id) on delete set null,
  match_score numeric(5,2),
  match_reason text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company, moka_reference, installment_no)
);

create table if not exists aperion_moka_reconciliation_suggestions_v59 (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  bank_transaction_id uuid references aperion_bank_transactions_raw_v59(id) on delete cascade,
  expected_settlement_id uuid references aperion_moka_expected_settlements_v59(id) on delete set null,
  bank_transaction_date date,
  expected_bank_date date,
  bank_amount numeric(18,2),
  expected_amount numeric(18,2),
  amount_diff numeric(18,2),
  match_score numeric(5,2) not null default 0,
  match_reason text,
  status text not null default 'suggested'
    check (status in ('suggested','approved','rejected','processed','archived')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company, bank_transaction_id, expected_settlement_id)
);

create index if not exists aperion_moka_expected_settlements_v59_status_idx
on aperion_moka_expected_settlements_v59(company, status, expected_bank_date);

create index if not exists aperion_moka_reconciliation_suggestions_v59_status_idx
on aperion_moka_reconciliation_suggestions_v59(company, status, match_score desc, created_at desc);

create or replace function touch_aperion_moka_expected_settlements_v59()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_aperion_moka_expected_settlements_v59 on aperion_moka_expected_settlements_v59;
create trigger trg_touch_aperion_moka_expected_settlements_v59
before update on aperion_moka_expected_settlements_v59
for each row execute function touch_aperion_moka_expected_settlements_v59();

create or replace function touch_aperion_moka_reconciliation_suggestions_v59()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'approved' and old.status is distinct from 'approved' then
    new.approved_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_touch_aperion_moka_reconciliation_suggestions_v59 on aperion_moka_reconciliation_suggestions_v59;
create trigger trg_touch_aperion_moka_reconciliation_suggestions_v59
before update on aperion_moka_reconciliation_suggestions_v59
for each row execute function touch_aperion_moka_reconciliation_suggestions_v59();

create or replace function moka_amount_score_v59(p_bank_amount numeric, p_expected_amount numeric)
returns numeric
language plpgsql
immutable
as $$
declare
  v_diff numeric;
begin
  if p_bank_amount is null or p_expected_amount is null or p_expected_amount = 0 then
    return 0;
  end if;
  v_diff := abs(abs(p_bank_amount) - abs(p_expected_amount));
  if v_diff = 0 then return 60; end if;
  if v_diff <= 1 then return 55; end if;
  if v_diff <= 10 then return 45; end if;
  if v_diff <= 50 then return 30; end if;
  return 0;
end;
$$;

create or replace function moka_date_score_v59(p_bank_date date, p_expected_date date)
returns numeric
language plpgsql
immutable
as $$
declare
  v_days integer;
begin
  if p_bank_date is null or p_expected_date is null then
    return 0;
  end if;
  v_days := abs(p_bank_date - p_expected_date);
  if v_days = 0 then return 30; end if;
  if v_days <= 1 then return 25; end if;
  if v_days <= 3 then return 15; end if;
  if v_days <= 7 then return 5; end if;
  return 0;
end;
$$;

create or replace function generate_moka_reconciliation_suggestions_v59(p_company text default 'alayli')
returns integer
language plpgsql
as $$
declare
  r record;
  v_score numeric;
  v_reason text;
  v_count integer := 0;
begin
  for r in
    select
      bt.id as bank_transaction_id,
      bt.transaction_date as bank_transaction_date,
      bt.amount as bank_amount,
      bt.description,
      ms.id as expected_settlement_id,
      ms.expected_bank_date,
      ms.net_expected_amount
    from aperion_bank_transactions_raw_v59 bt
    join aperion_moka_expected_settlements_v59 ms
      on ms.company = bt.company
     and ms.status = 'expected'
     and ms.expected_bank_date between bt.transaction_date - interval '7 days' and bt.transaction_date + interval '7 days'
    where bt.company = coalesce(nullif(p_company,''),'alayli')
      and bt.status in ('new','review','approved')
      and bt.match_status in ('unmatched','auto_suggested','needs_review','matched')
      and (
        lower(coalesce(bt.description,'')) like '%moka%'
        or lower(coalesce(bt.description,'')) like '%pos%'
        or lower(coalesce(bt.description,'')) like '%united%'
        or bt.matched_type = 'moka'
      )
  loop
    v_score := moka_amount_score_v59(r.bank_amount, r.net_expected_amount)
             + moka_date_score_v59(r.bank_transaction_date, r.expected_bank_date);
    v_reason := 'amount/date match; bank=' || coalesce(r.bank_amount::text,'-') ||
                ' expected=' || coalesce(r.net_expected_amount::text,'-') ||
                ' bank_date=' || coalesce(r.bank_transaction_date::text,'-') ||
                ' expected_date=' || coalesce(r.expected_bank_date::text,'-');

    if v_score >= 50 then
      insert into aperion_moka_reconciliation_suggestions_v59(
        company, bank_transaction_id, expected_settlement_id,
        bank_transaction_date, expected_bank_date, bank_amount, expected_amount,
        amount_diff, match_score, match_reason, status
      ) values (
        coalesce(nullif(p_company,''),'alayli'), r.bank_transaction_id, r.expected_settlement_id,
        r.bank_transaction_date, r.expected_bank_date, r.bank_amount, r.net_expected_amount,
        abs(abs(coalesce(r.bank_amount,0)) - abs(coalesce(r.net_expected_amount,0))),
        v_score, v_reason, 'suggested'
      )
      on conflict (company, bank_transaction_id, expected_settlement_id)
      do update set match_score = excluded.match_score, match_reason = excluded.match_reason, updated_at = now();
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

create or replace function approve_moka_reconciliation_v59(p_suggestion_id uuid, p_approved_by text default 'ercan')
returns uuid
language plpgsql
as $$
declare
  s aperion_moka_reconciliation_suggestions_v59%rowtype;
begin
  select * into s from aperion_moka_reconciliation_suggestions_v59 where id = p_suggestion_id;
  if not found then
    raise exception 'moka suggestion not found';
  end if;

  update aperion_moka_reconciliation_suggestions_v59
  set status = 'approved', approved_by = p_approved_by
  where id = p_suggestion_id;

  update aperion_moka_expected_settlements_v59
  set status = case when abs(coalesce(s.amount_diff,0)) <= 1 then 'matched' else 'partial' end,
      matched_transaction_id = s.bank_transaction_id,
      match_score = s.match_score,
      match_reason = s.match_reason
  where id = s.expected_settlement_id;

  update aperion_bank_transactions_raw_v59
  set match_status = 'matched',
      matched_type = 'moka',
      match_score = s.match_score,
      match_reason = s.match_reason,
      status = 'approved'
  where id = s.bank_transaction_id;

  return p_suggestion_id;
end;
$$;

create or replace view aperion_moka_reconciliation_queue_v59_view as
select
  s.*,
  bt.description as bank_description,
  bt.raw_line as bank_raw_line,
  ms.customer_name,
  ms.moka_reference,
  ms.installment_no,
  ms.total_installments
from aperion_moka_reconciliation_suggestions_v59 s
left join aperion_bank_transactions_raw_v59 bt on bt.id = s.bank_transaction_id
left join aperion_moka_expected_settlements_v59 ms on ms.id = s.expected_settlement_id
where s.status = 'suggested'
order by s.match_score desc, s.created_at desc;

create or replace view aperion_moka_status_v59_view as
select
  company,
  status,
  count(*) as count_rows,
  sum(net_expected_amount) as total_net_expected
from aperion_moka_expected_settlements_v59
group by company, status;

-- Quick checks:
-- select generate_moka_reconciliation_suggestions_v59('alayli');
-- select * from aperion_moka_reconciliation_queue_v59_view;
-- select * from aperion_moka_status_v59_view;
