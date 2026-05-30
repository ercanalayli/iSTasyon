-- =========================================================
-- AperiON v59 - Finance Movement Pool SQL
-- =========================================================
-- Purpose:
-- Create one controlled pool for all financial movements:
-- bank, Moka, card, cash, cheque, note, manual/cari.
-- Final accounting/finance records are produced only after approval.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists aperion_finance_movement_pool_v59 (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  source_type text not null
    check (source_type in ('bank','moka','card','cash','cheque','note','manual','cari','system')),
  source_id text,
  source_batch_id uuid,
  source_document_id uuid,
  movement_fingerprint text not null,
  movement_date date,
  value_date date,
  title text not null,
  description text,
  amount numeric(18,2),
  direction text not null default 'unknown'
    check (direction in ('inflow','outflow','neutral','unknown')),
  currency text not null default 'TRY',
  counterparty_id text,
  counterparty_name text,
  counterparty_type text
    check (counterparty_type in ('customer','supplier','moka','tax','sgk','bank','loan','owner','unknown') or counterparty_type is null),
  category text,
  suggested_action text not null default 'review'
    check (suggested_action in ('review','collect','pay','match','transfer','ignore','create_record')),
  confidence numeric(5,2) not null default 0,
  status text not null default 'draft'
    check (status in ('draft','review','approved','processed','rejected','duplicate','ignored','error','archived')),
  approval_queue_id uuid,
  note text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  processed_at timestamptz,
  unique(company, movement_fingerprint)
);

create index if not exists aperion_finance_movement_pool_v59_status_idx
on aperion_finance_movement_pool_v59(company, status, movement_date desc);

create index if not exists aperion_finance_movement_pool_v59_source_idx
on aperion_finance_movement_pool_v59(company, source_type, source_id);

create index if not exists aperion_finance_movement_pool_v59_counterparty_idx
on aperion_finance_movement_pool_v59(company, counterparty_type, counterparty_name);

create or replace function touch_aperion_finance_movement_pool_v59()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'approved' and old.status is distinct from 'approved' then
    new.approved_at = now();
  end if;
  if new.status = 'processed' and old.status is distinct from 'processed' then
    new.processed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_touch_aperion_finance_movement_pool_v59 on aperion_finance_movement_pool_v59;
create trigger trg_touch_aperion_finance_movement_pool_v59
before update on aperion_finance_movement_pool_v59
for each row execute function touch_aperion_finance_movement_pool_v59();

create or replace function make_finance_movement_fingerprint_v59(
  p_company text,
  p_source_type text,
  p_source_id text,
  p_movement_date date,
  p_title text,
  p_amount numeric
)
returns text
language sql
immutable
as $$
  select encode(digest(
    coalesce(p_company,'') || '|' ||
    coalesce(p_source_type,'') || '|' ||
    coalesce(p_source_id,'') || '|' ||
    coalesce(p_movement_date::text,'') || '|' ||
    lower(trim(coalesce(p_title,''))) || '|' ||
    coalesce(round(p_amount,2)::text,''),
    'sha256'
  ), 'hex');
$$;

create or replace function upsert_finance_movement_from_bank_v59(p_transaction_id uuid)
returns uuid
language plpgsql
as $$
declare
  bt aperion_bank_transactions_raw_v59%rowtype;
  v_id uuid;
  v_fp text;
  v_title text;
  v_action text;
begin
  select * into bt from aperion_bank_transactions_raw_v59 where id = p_transaction_id;
  if not found then
    raise exception 'bank transaction not found';
  end if;

  v_title := coalesce(nullif(bt.matched_cari_name,''), nullif(bt.description,''), 'Banka Hareketi');
  v_action := case
    when bt.matched_type = 'moka' then 'match'
    when bt.amount >= 0 then 'collect'
    when bt.amount < 0 then 'pay'
    else 'review'
  end;
  v_fp := make_finance_movement_fingerprint_v59(bt.company, 'bank', bt.id::text, bt.transaction_date, v_title, bt.amount);

  insert into aperion_finance_movement_pool_v59(
    company, source_type, source_id, source_batch_id, source_document_id,
    movement_fingerprint, movement_date, title, description, amount, direction,
    currency, counterparty_id, counterparty_name, counterparty_type, category,
    suggested_action, confidence, status, raw_payload
  ) values (
    bt.company, 'bank', bt.id::text, bt.batch_id, bt.document_id,
    v_fp, bt.transaction_date, v_title, bt.description, bt.amount, bt.direction,
    bt.currency, bt.matched_cari_id, bt.matched_cari_name,
    case when bt.matched_type = 'moka' then 'moka' else 'unknown' end,
    bt.matched_type, v_action, coalesce(bt.match_score, bt.parse_confidence, 0),
    case when bt.match_status = 'matched' then 'review' else 'draft' end,
    jsonb_build_object('raw_line', bt.raw_line, 'bank_name', bt.bank_name, 'match_reason', bt.match_reason)
  )
  on conflict (company, movement_fingerprint)
  do update set updated_at = now(), status = case when aperion_finance_movement_pool_v59.status = 'processed' then 'processed' else excluded.status end
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function build_finance_movement_pool_from_bank_v59(p_company text default 'alayli')
returns integer
language plpgsql
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select id
    from aperion_bank_transactions_raw_v59
    where company = coalesce(nullif(p_company,''),'alayli')
      and status in ('new','review','approved')
      and match_status in ('auto_suggested','needs_review','matched','unmatched')
  loop
    perform upsert_finance_movement_from_bank_v59(r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace view aperion_finance_movement_review_v59_view as
select *
from aperion_finance_movement_pool_v59
where status in ('draft','review','error')
order by movement_date desc nulls last, created_at desc;

create or replace view aperion_finance_movement_status_v59_view as
select
  company,
  source_type,
  status,
  count(*) as movement_count,
  sum(case when direction = 'inflow' then amount else 0 end) as inflow_total,
  sum(case when direction = 'outflow' then amount else 0 end) as outflow_total,
  sum(coalesce(amount,0)) as net_total
from aperion_finance_movement_pool_v59
where status <> 'archived'
group by company, source_type, status;

-- Quick checks:
-- select build_finance_movement_pool_from_bank_v59('alayli');
-- select * from aperion_finance_movement_review_v59_view;
-- select * from aperion_finance_movement_status_v59_view;
