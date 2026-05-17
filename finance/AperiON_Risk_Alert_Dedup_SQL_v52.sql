-- AperiON Risk Alert Dedup SQL v52
-- Purpose: prevent the same risk alert from being sent repeatedly during a cooldown window.
-- Safe rule: creates only a log table, indexes, helper RPCs and a status view.

create table if not exists risk_alert_sent_log (
  id bigserial primary key,
  company text not null,
  risk_key text not null,
  risk_type text,
  risk_level text,
  title text,
  ref_code text,
  ref_name text,
  amount numeric,
  risk_date date,
  sent_at timestamptz not null default now(),
  cooldown_minutes integer not null default 360,
  cooldown_until timestamptz not null default (now() + interval '360 minutes'),
  telegram_message_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_risk_alert_sent_log_company_key_sent
  on risk_alert_sent_log(company, risk_key, sent_at desc);

create index if not exists idx_risk_alert_sent_log_company_cooldown
  on risk_alert_sent_log(company, cooldown_until desc);

create index if not exists idx_risk_alert_sent_log_risk_level
  on risk_alert_sent_log(risk_level, sent_at desc);

create or replace function risk_alert_can_send_v52(
  p_company text,
  p_risk_key text,
  p_cooldown_minutes integer default 360
)
returns boolean
language plpgsql
stable
as $$
begin
  if p_company is null or btrim(p_company) = '' then
    return false;
  end if;

  if p_risk_key is null or btrim(p_risk_key) = '' then
    return false;
  end if;

  return not exists (
    select 1
    from risk_alert_sent_log l
    where l.company = p_company
      and l.risk_key = p_risk_key
      and l.cooldown_until > now()
  );
end;
$$;

create or replace function risk_alert_mark_sent_v52(
  p_company text,
  p_risk_key text,
  p_risk_type text default null,
  p_risk_level text default null,
  p_title text default null,
  p_ref_code text default null,
  p_ref_name text default null,
  p_amount numeric default null,
  p_risk_date date default null,
  p_cooldown_minutes integer default 360,
  p_telegram_message_id text default null,
  p_payload jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
volatile
as $$
declare
  v_id bigint;
  v_cooldown integer;
begin
  v_cooldown := greatest(coalesce(p_cooldown_minutes, 360), 1);

  insert into risk_alert_sent_log (
    company, risk_key, risk_type, risk_level, title, ref_code, ref_name,
    amount, risk_date, sent_at, cooldown_minutes, cooldown_until,
    telegram_message_id, payload
  ) values (
    p_company, p_risk_key, p_risk_type, p_risk_level, p_title, p_ref_code, p_ref_name,
    p_amount, p_risk_date, now(), v_cooldown, now() + make_interval(mins => v_cooldown),
    p_telegram_message_id, coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace view aperion_risk_alert_dedup_status_v52_view as
select
  company,
  risk_key,
  risk_type,
  risk_level,
  title,
  ref_code,
  ref_name,
  max(sent_at) as last_sent_at,
  max(cooldown_until) as cooldown_until,
  bool_or(cooldown_until > now()) as in_cooldown,
  count(*) as sent_count
from risk_alert_sent_log
group by company, risk_key, risk_type, risk_level, title, ref_code, ref_name;

-- Quick checks:
-- select risk_alert_can_send_v52('ALAYLI', 'test-risk-key', 360);
-- select * from aperion_risk_alert_dedup_status_v52_view where company='ALAYLI';
