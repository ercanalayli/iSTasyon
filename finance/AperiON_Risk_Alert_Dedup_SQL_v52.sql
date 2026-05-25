-- AperiON Risk Alert Dedup SQL v52
-- Purpose: prevent sending the same Telegram risk alert repeatedly.
-- Safe rule: creates a new log table, helper functions and views only. Existing finance data is not changed.
-- Requires: v49 risk feed view (aperion_risk_feed_v49_view).

create table if not exists risk_alert_sent_log (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  risk_key text not null,
  risk_type text,
  risk_level text,
  title text,
  ref_code text,
  ref_name text,
  amount numeric(18,2),
  risk_date date,
  alert_channel text not null default 'telegram',
  alert_level text,
  sent_at timestamptz not null default now(),
  cooldown_hours integer not null default 24,
  message_preview text,
  created_at timestamptz not null default now()
);

create index if not exists idx_risk_alert_sent_log_company_key_sent
  on risk_alert_sent_log(company, risk_key, sent_at desc);

create index if not exists idx_risk_alert_sent_log_channel_sent
  on risk_alert_sent_log(alert_channel, sent_at desc);

create or replace function aperion_make_risk_key(
  p_company text,
  p_risk_type text,
  p_risk_level text,
  p_title text,
  p_ref_code text,
  p_ref_name text,
  p_risk_date date
)
returns text
language sql
stable
as $$
  select lower(
    coalesce(p_company,'') || '|' ||
    coalesce(p_risk_type,'') || '|' ||
    coalesce(p_risk_level,'') || '|' ||
    coalesce(p_title,'') || '|' ||
    coalesce(p_ref_code,'') || '|' ||
    coalesce(p_ref_name,'') || '|' ||
    coalesce(p_risk_date::text, current_date::text)
  );
$$;

create or replace function aperion_risk_alert_was_sent(
  p_company text,
  p_risk_key text,
  p_alert_channel text default 'telegram',
  p_cooldown_hours integer default 24
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from risk_alert_sent_log l
    where l.company = p_company
      and l.risk_key = p_risk_key
      and l.alert_channel = p_alert_channel
      and l.sent_at >= now() - make_interval(hours => greatest(coalesce(p_cooldown_hours,24), 1))
  );
$$;

create or replace view aperion_risk_feed_v52_view as
select
  r.*,
  aperion_make_risk_key(r.company, r.risk_type, r.risk_level, r.title, r.ref_code, r.ref_name, r.risk_date) as risk_key
from aperion_risk_feed_v49_view r;

create or replace view aperion_risk_alert_candidates_v52_view as
select
  r.*,
  not aperion_risk_alert_was_sent(r.company, r.risk_key, 'telegram', 24) as should_send_telegram_alert
from aperion_risk_feed_v52_view r;

create or replace function aperion_log_risk_alert_sent(
  p_company text,
  p_risk_key text,
  p_risk_type text default null,
  p_risk_level text default null,
  p_title text default null,
  p_ref_code text default null,
  p_ref_name text default null,
  p_amount numeric default null,
  p_risk_date date default null,
  p_alert_channel text default 'telegram',
  p_alert_level text default null,
  p_cooldown_hours integer default 24,
  p_message_preview text default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into risk_alert_sent_log(
    company, risk_key, risk_type, risk_level, title, ref_code, ref_name,
    amount, risk_date, alert_channel, alert_level, cooldown_hours, message_preview
  ) values (
    p_company, p_risk_key, p_risk_type, p_risk_level, p_title, p_ref_code, p_ref_name,
    p_amount, p_risk_date, coalesce(p_alert_channel,'telegram'), p_alert_level,
    greatest(coalesce(p_cooldown_hours,24),1), left(coalesce(p_message_preview,''), 500)
  ) returning id into v_id;

  return v_id;
end;
$$;

-- Quick checks:
-- select * from aperion_risk_feed_v52_view where company='ALAYLI';
-- select * from aperion_risk_alert_candidates_v52_view where company='ALAYLI' and should_send_telegram_alert=true;
-- select aperion_log_risk_alert_sent('ALAYLI','test|risk','cash','critical','Test Risk',null,null,100,current_date,'telegram','high',24,'test');
