-- =========================================================
-- AperiON v58 - Life Command Center SQL
-- =========================================================
-- Purpose:
-- Track personal life obligations, tasks, renewals, documents,
-- assets, reminders, projects and decisions in one model.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists aperion_life_assets_v58 (
  id uuid primary key default gen_random_uuid(),
  owner text not null default 'ercan',
  asset_type text not null check (asset_type in ('vehicle','home','person','company','project','other')),
  asset_name text not null,
  asset_code text,
  status text not null default 'active' check (status in ('active','passive','archived')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists aperion_life_records_v58 (
  id uuid primary key default gen_random_uuid(),
  owner text not null default 'ercan',
  record_type text not null check (record_type in ('payment','task','renewal','document','health','family','official','project','decision','habit','idea','other')),
  category text not null default 'general' check (category in ('vehicle','home','finance','official','health','family','project','document','decision','routine','general')),
  title text not null,
  description text,
  asset_id uuid references aperion_life_assets_v58(id) on delete set null,
  due_date date,
  due_time time,
  amount numeric(14,2),
  currency text not null default 'TRY',
  period_type text not null default 'once' check (period_type in ('once','daily','weekly','monthly','quarterly','semiannual','yearly','custom')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  status text not null default 'waiting' check (status in ('waiting','planned','done','paid','postponed','cancelled','missing_info','late','archived')),
  reminder_days_before integer[] not null default '{7,3,1}',
  source text not null default 'manual' check (source in ('manual','telegram','gmail','drive','system','import')),
  document_id uuid,
  tags text[] not null default '{}',
  note text,
  created_by text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aperion_life_records_v58_due_idx
on aperion_life_records_v58(owner, status, due_date, priority);

create index if not exists aperion_life_records_v58_type_idx
on aperion_life_records_v58(record_type, category, status);

create index if not exists aperion_life_records_v58_asset_idx
on aperion_life_records_v58(asset_id);

create or replace function touch_aperion_life_assets_v58()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_aperion_life_assets_v58 on aperion_life_assets_v58;
create trigger trg_touch_aperion_life_assets_v58
before update on aperion_life_assets_v58
for each row execute function touch_aperion_life_assets_v58();

create or replace function touch_aperion_life_records_v58()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status in ('done','paid') and old.status is distinct from new.status then
    new.completed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_touch_aperion_life_records_v58 on aperion_life_records_v58;
create trigger trg_touch_aperion_life_records_v58
before update on aperion_life_records_v58
for each row execute function touch_aperion_life_records_v58();

create or replace view aperion_life_today_v58_view as
select r.*, a.asset_name, a.asset_type
from aperion_life_records_v58 r
left join aperion_life_assets_v58 a on a.id = r.asset_id
where r.status in ('waiting','planned','missing_info','late')
  and r.due_date = current_date
order by
  case r.priority when 'critical' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,
  r.due_time nulls last,
  r.created_at;

create or replace view aperion_life_week_v58_view as
select r.*, a.asset_name, a.asset_type
from aperion_life_records_v58 r
left join aperion_life_assets_v58 a on a.id = r.asset_id
where r.status in ('waiting','planned','missing_info','late')
  and r.due_date between current_date and current_date + interval '7 days'
order by r.due_date,
  case r.priority when 'critical' then 1 when 'high' then 2 when 'normal' then 3 else 4 end;

create or replace view aperion_life_late_v58_view as
select r.*, a.asset_name, a.asset_type
from aperion_life_records_v58 r
left join aperion_life_assets_v58 a on a.id = r.asset_id
where r.status in ('waiting','planned','missing_info','late')
  and r.due_date < current_date
order by r.due_date asc,
  case r.priority when 'critical' then 1 when 'high' then 2 when 'normal' then 3 else 4 end;

create or replace view aperion_life_month_summary_v58_view as
select
  owner,
  count(*) filter (where due_date between current_date and current_date + interval '30 days') as next_30_days_count,
  count(*) filter (where due_date = current_date) as today_count,
  count(*) filter (where due_date < current_date and status in ('waiting','planned','missing_info','late')) as late_count,
  coalesce(sum(amount) filter (where record_type='payment' and due_date between current_date and current_date + interval '30 days' and status in ('waiting','planned','missing_info','late')),0) as next_30_days_payment_total,
  count(*) filter (where priority='critical' and status in ('waiting','planned','missing_info','late')) as critical_open_count
from aperion_life_records_v58
group by owner;

create or replace function create_life_record_v58(
  p_owner text,
  p_record_type text,
  p_category text,
  p_title text,
  p_due_date date default null,
  p_amount numeric default null,
  p_priority text default 'normal',
  p_source text default 'manual',
  p_note text default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  if nullif(trim(p_title), '') is null then
    raise exception 'title is required';
  end if;

  insert into aperion_life_records_v58 (
    owner, record_type, category, title, due_date, amount, priority, source, note
  ) values (
    coalesce(nullif(p_owner,''),'ercan'),
    coalesce(nullif(p_record_type,''),'task'),
    coalesce(nullif(p_category,''),'general'),
    trim(p_title),
    p_due_date,
    p_amount,
    coalesce(nullif(p_priority,''),'normal'),
    coalesce(nullif(p_source,''),'manual'),
    p_note
  ) returning id into v_id;

  return v_id;
end;
$$;

-- Quick checks:
-- select * from aperion_life_today_v58_view;
-- select * from aperion_life_week_v58_view;
-- select * from aperion_life_late_v58_view;
-- select * from aperion_life_month_summary_v58_view;
