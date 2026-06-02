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
