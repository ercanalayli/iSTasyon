-- =========================================================
-- AperiON v59 - Approval Center 2.0 SQL
-- =========================================================
-- Purpose:
-- Convert movement pool records into controlled approval items.
-- AI/system suggests, Ercan approves, then final processing can happen.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists aperion_approval_center_v59 (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  approval_type text not null default 'finance_movement'
    check (approval_type in ('finance_movement','moka_reconciliation','document','task','manual')),
  source_table text not null,
  source_id text not null,
  title text not null,
  summary text,
  proposed_action text not null default 'review'
    check (proposed_action in ('review','approve_record','match','collect','pay','transfer','ignore','request_info','reject')),
  amount numeric(18,2),
  currency text not null default 'TRY',
  counterparty_name text,
  confidence numeric(5,2) not null default 0,
  priority text not null default 'normal'
    check (priority in ('low','normal','high','critical')),
  status text not null default 'pending'
    check (status in ('pending','in_review','approved','rejected','needs_info','processed','ignored','error','archived')),
  decision_by text,
  decision_note text,
  decision_at timestamptz,
  processed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company, source_table, source_id)
);

create index if not exists aperion_approval_center_v59_status_idx
on aperion_approval_center_v59(company, status, priority, created_at desc);

create index if not exists aperion_approval_center_v59_source_idx
on aperion_approval_center_v59(company, source_table, source_id);

create or replace function touch_aperion_approval_center_v59()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status in ('approved','rejected','ignored','needs_info') and old.status is distinct from new.status then
    new.decision_at = now();
  end if;
  if new.status = 'processed' and old.status is distinct from 'processed' then
    new.processed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_touch_aperion_approval_center_v59 on aperion_approval_center_v59;
create trigger trg_touch_aperion_approval_center_v59
before update on aperion_approval_center_v59
for each row execute function touch_aperion_approval_center_v59();

create or replace function approval_priority_from_confidence_v59(p_confidence numeric, p_amount numeric)
returns text
language plpgsql
immutable
as $$
begin
  if abs(coalesce(p_amount,0)) >= 100000 then return 'critical'; end if;
  if abs(coalesce(p_amount,0)) >= 25000 then return 'high'; end if;
  if coalesce(p_confidence,0) < 50 then return 'high'; end if;
  return 'normal';
end;
$$;

create or replace function enqueue_finance_movement_approval_v59(p_movement_id uuid)
returns uuid
language plpgsql
as $$
declare
  m aperion_finance_movement_pool_v59%rowtype;
  v_id uuid;
begin
  select * into m from aperion_finance_movement_pool_v59 where id = p_movement_id;
  if not found then
    raise exception 'finance movement not found';
  end if;

  insert into aperion_approval_center_v59(
    company, approval_type, source_table, source_id, title, summary,
    proposed_action, amount, currency, counterparty_name, confidence, priority,
    status, payload
  ) values (
    m.company, 'finance_movement', 'aperion_finance_movement_pool_v59', m.id::text,
    m.title,
    coalesce(m.description,'') || case when m.note is not null then E'\n' || m.note else '' end,
    case m.suggested_action
      when 'collect' then 'collect'
      when 'pay' then 'pay'
      when 'match' then 'match'
      when 'transfer' then 'transfer'
      when 'ignore' then 'ignore'
      else 'review'
    end,
    m.amount, m.currency, m.counterparty_name, m.confidence,
    approval_priority_from_confidence_v59(m.confidence, m.amount),
    'pending',
    jsonb_build_object('source_type', m.source_type, 'source_id', m.source_id, 'movement_date', m.movement_date, 'raw_payload', m.raw_payload)
  )
  on conflict (company, source_table, source_id)
  do update set updated_at = now(), title = excluded.title, summary = excluded.summary, confidence = excluded.confidence
  returning id into v_id;

  update aperion_finance_movement_pool_v59
  set approval_queue_id = v_id, status = case when status = 'processed' then status else 'review' end
  where id = m.id;

  return v_id;
end;
$$;

create or replace function enqueue_finance_movement_approvals_v59(p_company text default 'alayli')
returns integer
language plpgsql
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select id
    from aperion_finance_movement_pool_v59
    where company = coalesce(nullif(p_company,''),'alayli')
      and status in ('draft','review','error')
      and (approval_queue_id is null or not exists (
        select 1 from aperion_approval_center_v59 a
        where a.id = aperion_finance_movement_pool_v59.approval_queue_id
          and a.status in ('pending','in_review','needs_info','error')
      ))
  loop
    perform enqueue_finance_movement_approval_v59(r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function decide_approval_v59(
  p_approval_id uuid,
  p_status text,
  p_decision_by text default 'ercan',
  p_decision_note text default null
)
returns uuid
language plpgsql
as $$
declare
  a aperion_approval_center_v59%rowtype;
begin
  select * into a from aperion_approval_center_v59 where id = p_approval_id;
  if not found then
    raise exception 'approval not found';
  end if;
  if p_status not in ('approved','rejected','needs_info','ignored') then
    raise exception 'invalid decision status';
  end if;

  update aperion_approval_center_v59
  set status = p_status,
      decision_by = p_decision_by,
      decision_note = p_decision_note
  where id = p_approval_id;

  if a.source_table = 'aperion_finance_movement_pool_v59' then
    update aperion_finance_movement_pool_v59
    set status = case p_status
      when 'approved' then 'approved'
      when 'rejected' then 'rejected'
      when 'ignored' then 'ignored'
      else 'review'
    end,
    note = coalesce(note,'') || case when p_decision_note is not null then E'\nONAY NOTU: ' || p_decision_note else '' end
    where id = a.source_id::uuid;
  end if;

  return p_approval_id;
end;
$$;

create or replace view aperion_approval_pending_v59_view as
select *
from aperion_approval_center_v59
where status in ('pending','in_review','needs_info','error')
order by
  case priority when 'critical' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,
  created_at desc;

create or replace view aperion_approval_status_v59_view as
select
  company,
  approval_type,
  status,
  count(*) as approval_count,
  sum(coalesce(amount,0)) as total_amount
from aperion_approval_center_v59
where status <> 'archived'
group by company, approval_type, status;

-- Quick checks:
-- select enqueue_finance_movement_approvals_v59('alayli');
-- select * from aperion_approval_pending_v59_view;
-- select decide_approval_v59('<approval_id>'::uuid, 'approved', 'ercan', 'kontrol edildi');
