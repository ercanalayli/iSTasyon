-- AperiON Risk Alert Dedup SQL v52
-- Purpose: prevent repeated Telegram alarms for the same risk within a cooldown window.
-- Safe rule: creates a log table and helper RPCs only. Existing finance data is not changed.
-- Requires: aperion_risk_feed_v49_view for source risks, but this file can be installed independently.

create table if not exists public.risk_alert_sent_log (
  id bigserial primary key,
  company text not null default 'ALAYLI',
  risk_key text not null,
  risk_type text,
  risk_level text,
  title text,
  message text,
  ref_code text,
  ref_name text,
  risk_date date,
  amount numeric,
  first_sent_at timestamptz not null default now(),
  last_sent_at timestamptz not null default now(),
  cooldown_until timestamptz not null default (now() + interval '24 hours'),
  sent_count integer not null default 1,
  last_telegram_message_id text,
  status text not null default 'sent',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint risk_alert_sent_log_status_chk check (status in ('sent','suppressed','resolved','archived'))
);

create unique index if not exists risk_alert_sent_log_company_key_uidx
  on public.risk_alert_sent_log (company, risk_key);

create index if not exists risk_alert_sent_log_company_level_idx
  on public.risk_alert_sent_log (company, risk_level, last_sent_at desc);

create index if not exists risk_alert_sent_log_cooldown_idx
  on public.risk_alert_sent_log (company, cooldown_until);

create or replace function public.risk_alert_make_key(
  p_company text,
  p_risk_type text,
  p_risk_level text,
  p_title text,
  p_ref_code text default null,
  p_ref_name text default null,
  p_risk_date date default null
)
returns text
language sql
stable
as $$
  select lower(
    coalesce(p_company,'ALAYLI') || '|' ||
    coalesce(p_risk_type,'risk') || '|' ||
    coalesce(p_risk_level,'warning') || '|' ||
    coalesce(nullif(p_ref_code,''), nullif(p_ref_name,''), nullif(p_title,''), 'unknown') || '|' ||
    coalesce(p_risk_date::text, current_date::text)
  );
$$;

create or replace function public.risk_alert_is_sendable(
  p_company text,
  p_risk_key text,
  p_cooldown_hours integer default 24
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_log public.risk_alert_sent_log%rowtype;
begin
  select * into v_log
  from public.risk_alert_sent_log
  where company = coalesce(p_company,'ALAYLI')
    and risk_key = p_risk_key
  limit 1;

  if not found then
    return jsonb_build_object('sendable', true, 'reason', 'not_sent_before');
  end if;

  if v_log.cooldown_until <= now() then
    return jsonb_build_object(
      'sendable', true,
      'reason', 'cooldown_expired',
      'last_sent_at', v_log.last_sent_at,
      'sent_count', v_log.sent_count
    );
  end if;

  return jsonb_build_object(
    'sendable', false,
    'reason', 'cooldown_active',
    'last_sent_at', v_log.last_sent_at,
    'cooldown_until', v_log.cooldown_until,
    'sent_count', v_log.sent_count
  );
end;
$$;

create or replace function public.risk_alert_mark_sent(
  p_company text,
  p_risk_key text,
  p_risk_type text default null,
  p_risk_level text default null,
  p_title text default null,
  p_message text default null,
  p_ref_code text default null,
  p_ref_name text default null,
  p_risk_date date default null,
  p_amount numeric default null,
  p_payload jsonb default '{}'::jsonb,
  p_telegram_message_id text default null,
  p_cooldown_hours integer default 24
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_id bigint;
begin
  insert into public.risk_alert_sent_log (
    company, risk_key, risk_type, risk_level, title, message, ref_code, ref_name,
    risk_date, amount, payload, last_telegram_message_id, cooldown_until
  )
  values (
    coalesce(p_company,'ALAYLI'), p_risk_key, p_risk_type, p_risk_level, p_title, p_message,
    p_ref_code, p_ref_name, p_risk_date, p_amount, coalesce(p_payload,'{}'::jsonb),
    p_telegram_message_id, now() + make_interval(hours => coalesce(p_cooldown_hours,24))
  )
  on conflict (company, risk_key)
  do update set
    risk_type = excluded.risk_type,
    risk_level = excluded.risk_level,
    title = excluded.title,
    message = excluded.message,
    ref_code = excluded.ref_code,
    ref_name = excluded.ref_name,
    risk_date = excluded.risk_date,
    amount = excluded.amount,
    payload = excluded.payload,
    last_telegram_message_id = excluded.last_telegram_message_id,
    last_sent_at = now(),
    cooldown_until = now() + make_interval(hours => coalesce(p_cooldown_hours,24)),
    sent_count = public.risk_alert_sent_log.sent_count + 1,
    status = 'sent',
    updated_at = now()
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'risk_key', p_risk_key);
end;
$$;

create or replace view public.risk_alert_sent_log_recent_v52_view as
select
  company,
  risk_key,
  risk_type,
  risk_level,
  title,
  ref_code,
  ref_name,
  risk_date,
  amount,
  first_sent_at,
  last_sent_at,
  cooldown_until,
  sent_count,
  status,
  case when cooldown_until > now() then 'cooldown_active' else 'sendable' end as dedup_status
from public.risk_alert_sent_log
where status in ('sent','suppressed')
order by last_sent_at desc;

-- Quick checks:
-- select public.risk_alert_make_key('ALAYLI','cash','critical','Nakit Akisi',null,null,current_date);
-- select public.risk_alert_is_sendable('ALAYLI','sample-key',24);
