-- AperiON Security Hardening v77
-- Purpose: lock financial write/approval paths after the BizimHesap cookie/API security pass.
-- Run manually in Supabase SQL Editor after testing. This file is intentionally not auto-applied.
--
-- Principle:
-- - Dashboard/frontend reads data.
-- - Bot, Edge Function and GitHub Actions write with service_role.
-- - Public anon role must not approve, mutate bank rows, insert clone rows or spoof logs.

create or replace function public.kullanici_firma_idler()
returns setof text
language sql
security definer
stable
set search_path = public
as $$
  select firma_id
  from public.aperion_users
  where user_id = auth.uid()
$$;

do $$
begin
  -- Approval RPCs must not be callable by unauthenticated clients.
  revoke execute on function public.approve_pending_bank_movement(uuid, text) from anon;
  grant execute on function public.approve_pending_bank_movement(uuid, text) to authenticated, service_role;

  if to_regprocedure('public.reject_pending_bank_movement(uuid,text)') is not null then
    revoke execute on function public.reject_pending_bank_movement(uuid, text) from anon;
    grant execute on function public.reject_pending_bank_movement(uuid, text) to authenticated, service_role;
  end if;

  if to_regprocedure('public.approve_bank_transaction_v58(bigint,text)') is not null then
    revoke execute on function public.approve_bank_transaction_v58(bigint, text) from anon;
    grant execute on function public.approve_bank_transaction_v58(bigint, text) to authenticated, service_role;
  end if;

  if to_regprocedure('public.reject_bank_transaction_v58(bigint,text)') is not null then
    revoke execute on function public.reject_bank_transaction_v58(bigint, text) from anon;
    grant execute on function public.reject_bank_transaction_v58(bigint, text) to authenticated, service_role;
  end if;

  if to_regprocedure('public.finance_calendar_mark_paid(bigint,numeric,text,text)') is not null then
    revoke execute on function public.finance_calendar_mark_paid(bigint, numeric, text, text) from anon;
    grant execute on function public.finance_calendar_mark_paid(bigint, numeric, text, text) to authenticated, service_role;
  end if;

  if to_regprocedure('public.finance_calendar_mark_collected(bigint,numeric,text,text)') is not null then
    revoke execute on function public.finance_calendar_mark_collected(bigint, numeric, text, text) from anon;
    grant execute on function public.finance_calendar_mark_collected(bigint, numeric, text, text) to authenticated, service_role;
  end if;

  if to_regprocedure('public.finance_calendar_approve(bigint,text,text)') is not null then
    revoke execute on function public.finance_calendar_approve(bigint, text, text) from anon;
    grant execute on function public.finance_calendar_approve(bigint, text, text) to authenticated, service_role;
  end if;
end $$;

-- Remove legacy broad anon write/read policies that were useful for early prototypes but unsafe for production.
do $$
begin
  if to_regclass('public.bank_transactions') is not null then
    alter table public.bank_transactions enable row level security;
    drop policy if exists "bank_transactions anon approval read" on public.bank_transactions;
    drop policy if exists "bank_transactions anon approval update" on public.bank_transactions;
    drop policy if exists "bank_transactions authenticated write" on public.bank_transactions;
    revoke insert, update, delete on public.bank_transactions from anon;
    revoke insert, update, delete on public.bank_transactions from authenticated;
  end if;

  if to_regclass('public.banka_raw') is not null then
    alter table public.banka_raw enable row level security;
    drop policy if exists "banka_raw anon all" on public.banka_raw;
    revoke insert, update, delete on public.banka_raw from anon;
    revoke insert, update, delete on public.banka_raw from authenticated;
  end if;

  if to_regclass('public.bizimhesap_events') is not null then
    alter table public.bizimhesap_events enable row level security;
    drop policy if exists "bizimhesap_events anon write" on public.bizimhesap_events;
    drop policy if exists "bizimhesap_events anon update" on public.bizimhesap_events;
    revoke insert, update, delete on public.bizimhesap_events from anon;
    revoke insert, update, delete on public.bizimhesap_events from authenticated;
  end if;

  if to_regclass('public.product_raw') is not null then
    alter table public.product_raw enable row level security;
    drop policy if exists "product_raw anon write" on public.product_raw;
    revoke insert, update, delete on public.product_raw from anon;
    revoke insert, update, delete on public.product_raw from authenticated;
  end if;

  if to_regclass('public.audit_logs') is not null then
    alter table public.audit_logs enable row level security;
    drop policy if exists "audit_logs anon insert" on public.audit_logs;
    drop policy if exists "audit_logs anon read" on public.audit_logs;
    revoke insert, update, delete on public.audit_logs from anon;
    revoke insert, update, delete on public.audit_logs from authenticated;
  end if;
end $$;

-- Recreate authenticated read policies from the AperiON user/firma map.
do $$
begin
  if to_regclass('public.bank_transactions') is not null then
    drop policy if exists "bank_transactions authenticated read" on public.bank_transactions;
    create policy "bank_transactions authenticated read"
      on public.bank_transactions for select
      to authenticated
      using (
        firma_id in (select public.kullanici_firma_idler())
        or 'all' in (select public.kullanici_firma_idler())
      );
  end if;

  if to_regclass('public.banka_raw') is not null then
    drop policy if exists "banka_raw authenticated read" on public.banka_raw;
    create policy "banka_raw authenticated read"
      on public.banka_raw for select
      to authenticated
      using (
        firma_id in (select public.kullanici_firma_idler())
        or 'all' in (select public.kullanici_firma_idler())
      );
  end if;

  if to_regclass('public.bizimhesap_events') is not null then
    drop policy if exists "bizimhesap_events authenticated read" on public.bizimhesap_events;
    create policy "bizimhesap_events authenticated read"
      on public.bizimhesap_events for select
      to authenticated
      using (
        firma_id in (select public.kullanici_firma_idler())
        or 'all' in (select public.kullanici_firma_idler())
      );
  end if;

  if to_regclass('public.product_raw') is not null then
    drop policy if exists "product_raw authenticated read" on public.product_raw;
    create policy "product_raw authenticated read"
      on public.product_raw for select
      to authenticated
      using (
        firma_id in (select public.kullanici_firma_idler())
        or 'all' in (select public.kullanici_firma_idler())
      );
  end if;
end $$;

notify pgrst, 'reload schema';
