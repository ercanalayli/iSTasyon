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
