-- AperiON Telegram + Quick Control SQL v43
-- Purpose: keep payables, receivables and tasks always under hand in dashboard and Telegram.
-- Safe rule: creates new tables/views only. Existing data is not changed.

create table if not exists aperion_tasks (
  id bigserial primary key,
  company text not null default 'ALAYLI',
  task_date date default current_date,
  due_date date,
  title text not null,
  description text,
  related_cari text,
  related_amount numeric(18,2) default 0,
  priority text default 'normal', -- low, normal, high, critical
  status text default 'open', -- open, waiting, done, postponed, cancelled
  source_type text default 'manual', -- manual, telegram, system, bank, bizimhesap
  telegram_message_id text,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists telegram_action_log (
  id bigserial primary key,
  telegram_user_id text,
  telegram_chat_id text,
  command text,
  action_type text,
  target_table text,
  target_id bigint,
  old_status text,
  new_status text,
  note text,
  created_at timestamptz default now()
);

create table if not exists approval_queue (
  id bigserial primary key,
  company text not null default 'ALAYLI',
  source_type text not null,
  source_table text,
  source_id bigint,
  title text not null,
  description text,
  amount numeric(18,2) default 0,
  confidence_score integer default 0,
  approval_status text default 'waiting', -- waiting, approved, rejected, edited
  priority text default 'normal',
  created_at timestamptz default now(),
  decided_at timestamptz
);

-- Today / week / month quick payables
create or replace view quick_payables_view as
select
  company,
  'payable'::text as item_type,
  id,
  due_date as item_date,
  supplier_name as title,
  description,
  greatest(expected_amount - paid_amount, 0) as remaining_amount,
  case
    when due_date < current_date then 'overdue'
    when due_date = current_date then 'today'
    when due_date < current_date + interval '7 days' then 'this_week'
    when due_date < date_trunc('month', current_date)::date + interval '1 month' then 'this_month'
    else 'future'
  end as period_status,
  status,
  source_type
from finance_payables
where status <> 'closed'
  and greatest(expected_amount - paid_amount, 0) > 0;

-- Today / week / month quick receivables
create or replace view quick_receivables_view as
select
  company,
  'receivable'::text as item_type,
  id,
  due_date as item_date,
  cari_name as title,
  description,
  greatest(expected_amount - collected_amount, 0) as remaining_amount,
  case
    when due_date < current_date then 'overdue'
    when due_date = current_date then 'today'
    when due_date < current_date + interval '7 days' then 'this_week'
    when due_date < date_trunc('month', current_date)::date + interval '1 month' then 'this_month'
    else 'future'
  end as period_status,
  status,
  source_type
from finance_receivables
where status <> 'closed'
  and greatest(expected_amount - collected_amount, 0) > 0;

-- Today / week / month tasks
create or replace view quick_tasks_view as
select
  company,
  'task'::text as item_type,
  id,
  coalesce(due_date, task_date) as item_date,
  title,
  description,
  related_amount as remaining_amount,
  case
    when coalesce(due_date, task_date) < current_date then 'overdue'
    when coalesce(due_date, task_date) = current_date then 'today'
    when coalesce(due_date, task_date) < current_date + interval '7 days' then 'this_week'
    when coalesce(due_date, task_date) < date_trunc('month', current_date)::date + interval '1 month' then 'this_month'
    else 'future'
  end as period_status,
  status,
  source_type
from aperion_tasks
where status not in ('done','cancelled');

-- Approval quick list
create or replace view quick_approval_view as
select
  company,
  'approval'::text as item_type,
  id,
  created_at::date as item_date,
  title,
  description,
  amount as remaining_amount,
  'waiting'::text as period_status,
  approval_status as status,
  source_type
from approval_queue
where approval_status = 'waiting';

-- Unified quick control list for dashboard + Telegram
create or replace view quick_control_center_view as
select * from quick_payables_view
union all
select * from quick_receivables_view
union all
select * from quick_tasks_view
union all
select * from quick_approval_view;

-- Summary cards for dashboard top band and Telegram /bugun
create or replace view quick_control_summary_view as
select
  company,
  sum(case when item_type='payable' and period_status='today' then remaining_amount else 0 end) as today_payable,
  sum(case when item_type='payable' and period_status='this_week' then remaining_amount else 0 end) as week_payable,
  sum(case when item_type='payable' and period_status='this_month' then remaining_amount else 0 end) as month_payable,
  sum(case when item_type='payable' and period_status='overdue' then remaining_amount else 0 end) as overdue_payable,
  sum(case when item_type='receivable' and period_status='today' then remaining_amount else 0 end) as today_receivable,
  sum(case when item_type='receivable' and period_status='this_week' then remaining_amount else 0 end) as week_receivable,
  sum(case when item_type='receivable' and period_status='this_month' then remaining_amount else 0 end) as month_receivable,
  sum(case when item_type='receivable' and period_status='overdue' then remaining_amount else 0 end) as overdue_receivable,
  count(*) filter (where item_type='task' and period_status='today') as today_tasks,
  count(*) filter (where item_type='task' and period_status='overdue') as overdue_tasks,
  count(*) filter (where item_type='approval') as waiting_approvals
from quick_control_center_view
group by company;

-- Telegram /bugun readable rows
create or replace view telegram_today_digest_view as
select
  company,
  item_type,
  id,
  item_date,
  title,
  description,
  remaining_amount,
  period_status,
  status,
  source_type
from quick_control_center_view
where period_status in ('today','overdue','waiting')
   or item_type = 'approval'
order by
  case period_status when 'overdue' then 1 when 'today' then 2 when 'waiting' then 3 else 4 end,
  item_type,
  item_date;

create index if not exists idx_aperion_tasks_company_due on aperion_tasks(company, due_date, status);
create index if not exists idx_telegram_action_log_target on telegram_action_log(target_table, target_id);
create index if not exists idx_approval_queue_status on approval_queue(company, approval_status, priority);
