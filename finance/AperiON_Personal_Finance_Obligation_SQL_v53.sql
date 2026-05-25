-- AperiON Personal Finance Obligation Center SQL v53
-- Purpose: life + business finance calendar for personal, company, vehicle, home, office, family obligations.
-- Safe rule: creates tables, indexes, views and helper functions only. No existing data is changed.
-- Data rule: unverified data must not be shown as final.

create table if not exists public.personal_finance_obligations (
  id bigserial primary key,
  owner text not null default 'ercan',
  company text not null default 'ALAYLI',
  firma_id text not null default 'alayli',
  scope text not null default 'ozel',
  expense_group text not null,
  expense_type text not null,
  title text not null,
  vendor_name text,
  account_name text,
  payment_method text,
  card_name text,
  contract_no text,
  start_date date,
  end_date date,
  period text not null default 'monthly',
  due_day integer,
  next_due_date date,
  expected_amount numeric(18,2),
  average_amount numeric(18,2),
  last_paid_amount numeric(18,2),
  currency text not null default 'TRY',
  is_fixed boolean not null default false,
  is_variable boolean not null default true,
  priority text not null default 'normal',
  auto_alarm boolean not null default true,
  alarm_days_before integer[] not null default array[7,3,0],
  status text not null default 'active',
  source_type text not null default 'manual',
  source_ref text,
  document_url text,
  note text,
  verification_status text not null default 'kontrol_bekliyor',
  verified_at timestamptz,
  verified_by text,
  data_date date,
  last_source_update_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pfo_scope_chk check (scope in ('sirket','ozel','arac','ev','isyeri','aile','ortak')),
  constraint pfo_priority_chk check (priority in ('critical','high','normal','low')),
  constraint pfo_status_chk check (status in ('active','paused','done','cancelled','archived')),
  constraint pfo_verify_chk check (verification_status in ('dogrulandi','kontrol_bekliyor','eksik_veri','uyusmazlik_var')),
  constraint pfo_period_chk check (period in ('once','weekly','monthly','quarterly','semiannual','annual','installment','variable')),
  constraint pfo_due_day_chk check (due_day is null or (due_day between 1 and 31))
);

create index if not exists pfo_company_scope_idx on public.personal_finance_obligations(company, scope, status);
create index if not exists pfo_due_idx on public.personal_finance_obligations(company, next_due_date);
create index if not exists pfo_group_idx on public.personal_finance_obligations(company, expense_group, expense_type);
create index if not exists pfo_verify_idx on public.personal_finance_obligations(company, verification_status);

create table if not exists public.personal_finance_payments (
  id bigserial primary key,
  obligation_id bigint references public.personal_finance_obligations(id) on delete set null,
  owner text not null default 'ercan',
  company text not null default 'ALAYLI',
  firma_id text not null default 'alayli',
  scope text not null default 'ozel',
  expense_group text,
  expense_type text,
  title text,
  vendor_name text,
  payment_date date,
  due_date date,
  amount numeric(18,2) not null default 0,
  currency text not null default 'TRY',
  paid_from_account text,
  payment_method text,
  payment_status text not null default 'planned',
  receipt_url text,
  source_type text not null default 'manual',
  source_ref text,
  note text,
  verification_status text not null default 'kontrol_bekliyor',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pfp_status_chk check (payment_status in ('planned','paid','partial','late','cancelled')),
  constraint pfp_verify_chk check (verification_status in ('dogrulandi','kontrol_bekliyor','eksik_veri','uyusmazlik_var'))
);

create index if not exists pfp_company_due_idx on public.personal_finance_payments(company, due_date, payment_status);
create index if not exists pfp_obligation_idx on public.personal_finance_payments(obligation_id);

create table if not exists public.personal_finance_budget_rules (
  id bigserial primary key,
  owner text not null default 'ercan',
  company text not null default 'ALAYLI',
  scope text not null default 'ozel',
  expense_group text not null,
  expense_type text,
  period text not null default 'monthly',
  budget_amount numeric(18,2) not null default 0,
  warning_percent numeric(8,2) not null default 90,
  critical_percent numeric(8,2) not null default 110,
  currency text not null default 'TRY',
  status text not null default 'active',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pfb_status_chk check (status in ('active','paused','archived'))
);

create index if not exists pfb_company_group_idx on public.personal_finance_budget_rules(company, scope, expense_group);

create table if not exists public.personal_finance_alerts (
  id bigserial primary key,
  obligation_id bigint references public.personal_finance_obligations(id) on delete set null,
  payment_id bigint references public.personal_finance_payments(id) on delete set null,
  owner text not null default 'ercan',
  company text not null default 'ALAYLI',
  alert_type text not null,
  alert_level text not null default 'warning',
  alert_date date not null default current_date,
  title text not null,
  message text,
  amount numeric(18,2),
  status text not null default 'open',
  source_type text not null default 'system',
  telegram_sent_at timestamptz,
  resolved_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pfa_level_chk check (alert_level in ('critical','high','warning','info','ok')),
  constraint pfa_status_chk check (status in ('open','sent','snoozed','done','cancelled'))
);

create index if not exists pfa_company_date_idx on public.personal_finance_alerts(company, alert_date, status);
create index if not exists pfa_level_idx on public.personal_finance_alerts(company, alert_level, status);

create table if not exists public.personal_finance_documents (
  id bigserial primary key,
  obligation_id bigint references public.personal_finance_obligations(id) on delete set null,
  payment_id bigint references public.personal_finance_payments(id) on delete set null,
  owner text not null default 'ercan',
  company text not null default 'ALAYLI',
  scope text,
  document_type text not null default 'belge',
  file_url text,
  file_name text,
  mime_type text,
  extracted_text text,
  parsed_amount numeric(18,2),
  parsed_date date,
  parsed_vendor text,
  ai_category text,
  ai_confidence numeric(5,2),
  status text not null default 'received',
  source_type text not null default 'telegram',
  telegram_file_id text,
  telegram_message_id text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pfd_status_chk check (status in ('received','parsed','matched','approved','rejected','archived'))
);

create index if not exists pfd_company_status_idx on public.personal_finance_documents(company, status, created_at desc);
create index if not exists pfd_telegram_file_idx on public.personal_finance_documents(telegram_file_id);

create or replace function public.personal_finance_calc_next_due(
  p_start_date date,
  p_period text,
  p_due_day integer default null,
  p_from_date date default current_date
)
returns date
language plpgsql
stable
as $$
declare
  v_due date;
  v_day integer;
begin
  if p_start_date is null then
    return null;
  end if;

  if p_period = 'once' then
    return p_start_date;
  end if;

  if p_period = 'weekly' then
    v_due := p_start_date;
    while v_due < p_from_date loop
      v_due := (v_due + interval '7 days')::date;
    end loop;
    return v_due;
  end if;

  v_day := least(coalesce(p_due_day, extract(day from p_start_date)::integer), 28);
  v_due := make_date(extract(year from p_from_date)::integer, extract(month from p_from_date)::integer, v_day);

  while v_due < p_from_date loop
    v_due := case p_period
      when 'monthly' then (v_due + interval '1 month')::date
      when 'quarterly' then (v_due + interval '3 months')::date
      when 'semiannual' then (v_due + interval '6 months')::date
      when 'annual' then (v_due + interval '1 year')::date
      when 'installment' then (v_due + interval '1 month')::date
      else (v_due + interval '1 month')::date
    end;
  end loop;

  return v_due;
end;
$$;

create or replace view public.personal_finance_obligation_live_v53_view as
select
  o.*,
  coalesce(o.next_due_date, public.personal_finance_calc_next_due(o.start_date, o.period, o.due_day, current_date)) as live_next_due_date,
  coalesce(o.expected_amount, o.average_amount, o.last_paid_amount, 0) as planned_amount,
  case
    when o.verification_status <> 'dogrulandi' then 'kontrol_bekliyor'
    when coalesce(o.next_due_date, public.personal_finance_calc_next_due(o.start_date, o.period, o.due_day, current_date)) < current_date then 'gecikti'
    when coalesce(o.next_due_date, public.personal_finance_calc_next_due(o.start_date, o.period, o.due_day, current_date)) = current_date then 'bugun'
    when coalesce(o.next_due_date, public.personal_finance_calc_next_due(o.start_date, o.period, o.due_day, current_date)) <= current_date + interval '3 days' then 'kritik'
    when coalesce(o.next_due_date, public.personal_finance_calc_next_due(o.start_date, o.period, o.due_day, current_date)) <= current_date + interval '7 days' then 'yaklasiyor'
    else 'planli'
  end as timing_status,
  case
    when o.verification_status <> 'dogrulandi' then 'warning'
    when coalesce(o.next_due_date, public.personal_finance_calc_next_due(o.start_date, o.period, o.due_day, current_date)) < current_date then 'critical'
    when coalesce(o.next_due_date, public.personal_finance_calc_next_due(o.start_date, o.period, o.due_day, current_date)) <= current_date + interval '3 days' then 'high'
    when coalesce(o.next_due_date, public.personal_finance_calc_next_due(o.start_date, o.period, o.due_day, current_date)) <= current_date + interval '7 days' then 'warning'
    else 'ok'
  end as alert_level
from public.personal_finance_obligations o
where o.status = 'active';

create or replace view public.personal_finance_summary_v53_view as
select
  company,
  owner,
  sum(planned_amount) filter (where live_next_due_date = current_date) as today_payable,
  sum(planned_amount) filter (where live_next_due_date between current_date and current_date + interval '7 days') as week_payable,
  sum(planned_amount) filter (where date_trunc('month', live_next_due_date) = date_trunc('month', current_date)) as month_payable,
  sum(planned_amount) filter (where is_fixed and date_trunc('month', live_next_due_date) = date_trunc('month', current_date)) as month_fixed_payable,
  sum(planned_amount) filter (where is_variable and date_trunc('month', live_next_due_date) = date_trunc('month', current_date)) as month_variable_estimate,
  count(*) filter (where timing_status = 'gecikti') as overdue_count,
  sum(planned_amount) filter (where timing_status = 'gecikti') as overdue_amount,
  count(*) filter (where alert_level in ('critical','high')) as critical_or_high_count,
  max(updated_at) as last_update_at
from public.personal_finance_obligation_live_v53_view
group by company, owner;

create or replace view public.personal_finance_alarm_feed_v53_view as
select
  company,
  owner,
  id as obligation_id,
  scope,
  expense_group,
  expense_type,
  title,
  vendor_name,
  live_next_due_date as due_date,
  planned_amount as amount,
  currency,
  timing_status,
  alert_level,
  verification_status,
  source_type,
  ('Odeme: ' || title || ' / ' || coalesce(planned_amount,0)::text || ' ' || currency || ' / Vade: ' || coalesce(live_next_due_date::text,'-')) as alarm_message
from public.personal_finance_obligation_live_v53_view
where auto_alarm = true
  and timing_status in ('gecikti','bugun','kritik','yaklasiyor','kontrol_bekliyor')
order by
  case alert_level when 'critical' then 1 when 'high' then 2 when 'warning' then 3 else 4 end,
  live_next_due_date asc nulls last,
  planned_amount desc nulls last;

create or replace view public.personal_finance_budget_status_v53_view as
select
  b.company,
  b.owner,
  b.scope,
  b.expense_group,
  b.expense_type,
  b.period,
  b.budget_amount,
  coalesce(sum(p.amount) filter (
    where p.payment_status in ('paid','partial')
      and date_trunc('month', p.payment_date) = date_trunc('month', current_date)
  ),0) as month_actual_amount,
  case when b.budget_amount > 0 then
    coalesce(sum(p.amount) filter (
      where p.payment_status in ('paid','partial')
        and date_trunc('month', p.payment_date) = date_trunc('month', current_date)
    ),0) / b.budget_amount * 100
  else null end as budget_usage_percent,
  case
    when b.budget_amount = 0 then 'butce_yok'
    when coalesce(sum(p.amount) filter (where p.payment_status in ('paid','partial') and date_trunc('month', p.payment_date) = date_trunc('month', current_date)),0) >= b.budget_amount * (b.critical_percent/100) then 'kritik_asim'
    when coalesce(sum(p.amount) filter (where p.payment_status in ('paid','partial') and date_trunc('month', p.payment_date) = date_trunc('month', current_date)),0) >= b.budget_amount * (b.warning_percent/100) then 'uyari'
    else 'normal'
  end as budget_status
from public.personal_finance_budget_rules b
left join public.personal_finance_payments p
  on p.company = b.company
 and p.owner = b.owner
 and p.scope = b.scope
 and p.expense_group = b.expense_group
 and (b.expense_type is null or p.expense_type = b.expense_type)
where b.status = 'active'
group by b.company,b.owner,b.scope,b.expense_group,b.expense_type,b.period,b.budget_amount,b.warning_percent,b.critical_percent;

create or replace view public.personal_finance_category_template_v53_view as
select *
from (values
  ('Kredi Kartlari','kart ekstresi / son odeme / asgari odeme'),
  ('Krediler','arac / konut / ihtiyac kredisi taksitleri'),
  ('Faturalar','elektrik / su / dogalgaz / internet / telefon'),
  ('Arac Giderleri','yakit / MTV / sigorta / kasko / bakim / HGS'),
  ('Ev Giderleri','kira / aidat / DASK / konut sigortasi / bakim'),
  ('Isyeri Giderleri','kira / elektrik / su / internet / personel / SGK'),
  ('Sigortalar','trafik / kasko / saglik / hayat / konut'),
  ('Vergi / Resmi Odemeler','MTV / emlak / cevre temizlik / trafik cezasi'),
  ('Aidatlar','site / apartman / oda / birlik aidati'),
  ('Abonelikler','ChatGPT / iCloud / Google Drive / Microsoft 365 / domain / hosting'),
  ('Saglik','ilac / doktor / dis / gozluk / check-up / terapi'),
  ('Egitim','okul / servis / kurs / ozel ders / kitap'),
  ('Aile / Cocuk','harclik / egitim / saglik / ozel ihtiyac'),
  ('Borc / Alacak','aile / arkadas / elden borc / kisisel cari'),
  ('Market / Yasam','market / kasap / manav / restoran / temel gider'),
  ('Sosyal / Kisisel','giyim / tatil / hobi / bakim / hediye'),
  ('Bakim / Onarim','ev / arac / cihaz / ofis bakim onarim'),
  ('Diger / Kontrol Bekleyen','siniflandirilmamis gider veya odeme')
) as t(expense_group, description);

-- Quick checks:
-- select * from personal_finance_category_template_v53_view;
-- select * from personal_finance_summary_v53_view where company='ALAYLI';
-- select * from personal_finance_alarm_feed_v53_view where company='ALAYLI';
