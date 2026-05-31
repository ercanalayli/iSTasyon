-- AperiON v62 Finance Movement Pool
-- Purpose: Gmail / Telegram / Bank Parser kaynaklarından gelen kayıtları önce pending havuzuna almak.
-- Critical rule: No direct ledger write before explicit approval.

create extension if not exists pgcrypto;

create table if not exists finance_movement_pool (
  id uuid primary key default gen_random_uuid(),
  source varchar(50) not null check (source in ('bank_parser', 'gmail', 'telegram', 'manual_preview')),
  company_code varchar(50) not null,
  transaction_date date not null,
  amount numeric(14, 2) not null,
  description text,
  document_url text,
  transaction_fingerprint varchar(64) not null unique,
  status varchar(20) not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'duplicate')),
  approval_note text,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint check_active_company_finance_pool check (company_code = 'ALAYLI_MEDIKAL')
);

create index if not exists idx_finance_movement_pool_status
  on finance_movement_pool(status);

create index if not exists idx_finance_movement_pool_company_status
  on finance_movement_pool(company_code, status);

create index if not exists idx_finance_movement_pool_created_at
  on finance_movement_pool(created_at desc);

create or replace function set_finance_pool_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_finance_pool_updated_at on finance_movement_pool;
create trigger trg_finance_pool_updated_at
before update on finance_movement_pool
for each row execute function set_finance_pool_updated_at();

-- Optional ledger table for simulation / future production hardening.
-- Real ledger can later be mapped to existing AperiON ledger table.
create table if not exists finance_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references finance_movement_pool(id),
  company_code varchar(50) not null,
  transaction_date date not null,
  amount numeric(14, 2) not null,
  description text,
  source varchar(50) not null,
  transaction_fingerprint varchar(64) not null unique,
  created_at timestamptz not null default now(),

  constraint check_active_company_finance_ledger check (company_code = 'ALAYLI_MEDIKAL')
);

-- Atomic approval barrier: pending -> approved + ledger insert.
create or replace function approve_and_ledgerize(p_pool_id uuid)
returns jsonb as $$
declare
  v_pool finance_movement_pool%rowtype;
begin
  select * into v_pool
  from finance_movement_pool
  where id = p_pool_id
  for update;

  if not found then
    raise exception 'Pool record not found: %', p_pool_id;
  end if;

  if v_pool.status <> 'pending' then
    raise exception 'Only pending records can be approved. Current status: %', v_pool.status;
  end if;

  insert into finance_ledger_entries (
    pool_id,
    company_code,
    transaction_date,
    amount,
    description,
    source,
    transaction_fingerprint
  ) values (
    v_pool.id,
    v_pool.company_code,
    v_pool.transaction_date,
    v_pool.amount,
    v_pool.description,
    v_pool.source,
    v_pool.transaction_fingerprint
  );

  update finance_movement_pool
  set status = 'approved', approved_at = now()
  where id = p_pool_id;

  return jsonb_build_object('ok', true, 'pool_id', p_pool_id, 'status', 'approved');
end;
$$ language plpgsql;

-- Reject barrier: pending -> rejected.
create or replace function reject_finance_pool_record(p_pool_id uuid, p_note text default null)
returns jsonb as $$
declare
  v_status varchar(20);
begin
  select status into v_status
  from finance_movement_pool
  where id = p_pool_id
  for update;

  if not found then
    raise exception 'Pool record not found: %', p_pool_id;
  end if;

  if v_status <> 'pending' then
    raise exception 'Only pending records can be rejected. Current status: %', v_status;
  end if;

  update finance_movement_pool
  set status = 'rejected', rejected_at = now(), approval_note = p_note
  where id = p_pool_id;

  return jsonb_build_object('ok', true, 'pool_id', p_pool_id, 'status', 'rejected');
end;
$$ language plpgsql;
