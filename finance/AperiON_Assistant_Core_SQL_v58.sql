-- =========================================================
-- AperiON v58.2 - Assistant Core SQL
-- =========================================================
-- Purpose:
-- Store assistant requests, generated answers, action suggestions
-- and the data sources used for each answer.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists aperion_assistant_sessions_v58 (
  id uuid primary key default gen_random_uuid(),
  owner text not null default 'ercan',
  channel text not null default 'web' check (channel in ('web','telegram','system')),
  title text,
  status text not null default 'active' check (status in ('active','closed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists aperion_assistant_messages_v58 (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references aperion_assistant_sessions_v58(id) on delete cascade,
  owner text not null default 'ercan',
  channel text not null default 'web' check (channel in ('web','telegram','system')),
  role text not null check (role in ('user','assistant','system')),
  raw_text text not null,
  intent text not null default 'unknown'
    check (intent in ('focus_today','week_summary','risk_check','payment_summary','document_search','vehicle_query','home_query','profit_query','cash_query','create_record','unknown')),
  target_modules text[] not null default '{}',
  data_sources text[] not null default '{}',
  answer_text text,
  confidence numeric(5,2) not null default 0,
  status text not null default 'new' check (status in ('new','draft','answered','needs_data','needs_confirmation','error','archived')),
  error_message text,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create table if not exists aperion_assistant_suggestions_v58 (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references aperion_assistant_messages_v58(id) on delete cascade,
  owner text not null default 'ercan',
  suggestion_type text not null default 'action'
    check (suggestion_type in ('action','risk','question','record','document','report')),
  title text not null,
  description text,
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  target_module text not null default 'unknown',
  target_table text,
  target_record_id text,
  status text not null default 'open' check (status in ('open','accepted','rejected','done','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aperion_assistant_messages_v58_owner_idx
on aperion_assistant_messages_v58(owner, status, created_at desc);

create index if not exists aperion_assistant_suggestions_v58_owner_idx
on aperion_assistant_suggestions_v58(owner, status, priority, created_at desc);

create or replace function touch_aperion_assistant_sessions_v58()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_aperion_assistant_sessions_v58 on aperion_assistant_sessions_v58;
create trigger trg_touch_aperion_assistant_sessions_v58
before update on aperion_assistant_sessions_v58
for each row execute function touch_aperion_assistant_sessions_v58();

create or replace function touch_aperion_assistant_suggestions_v58()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_aperion_assistant_suggestions_v58 on aperion_assistant_suggestions_v58;
create trigger trg_touch_aperion_assistant_suggestions_v58
before update on aperion_assistant_suggestions_v58
for each row execute function touch_aperion_assistant_suggestions_v58();

create or replace function detect_assistant_intent_v58(p_text text)
returns text
language plpgsql
as $$
declare
  v text := lower(coalesce(p_text,''));
begin
  if v like '%odaklan%' or v like '%bugün neye%' or v like '%bugun neye%' then
    return 'focus_today';
  elsif v like '%bu hafta%' or v like '%hafta%' then
    return 'week_summary';
  elsif v like '%risk%' or v like '%kritik%' then
    return 'risk_check';
  elsif v like '%ödeme%' or v like '%odeme%' or v like '%ödeyeceğim%' or v like '%odeyecegim%' then
    return 'payment_summary';
  elsif v like '%belge%' or v like '%dosya%' then
    return 'document_search';
  elsif v like '%peugeot%' or v like '%araba%' or v like '%araç%' or v like '%arac%' then
    return 'vehicle_query';
  elsif v like '%ev%' or v like '%aidat%' then
    return 'home_query';
  elsif v like '%kâr%' or v like '%kar%' then
    return 'profit_query';
  elsif v like '%nakit%' or v like '%banka%' then
    return 'cash_query';
  elsif v like '%kaydet%' or v like '%unutma%' then
    return 'create_record';
  end if;
  return 'unknown';
end;
$$;

create or replace function create_assistant_message_v58(
  p_owner text,
  p_channel text,
  p_raw_text text,
  p_session_id uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_session uuid;
  v_intent text;
  v_modules text[] := '{}';
begin
  if nullif(trim(p_raw_text), '') is null then
    raise exception 'raw_text is required';
  end if;

  v_session := p_session_id;
  if v_session is null then
    insert into aperion_assistant_sessions_v58(owner, channel, title)
    values (coalesce(nullif(p_owner,''),'ercan'), coalesce(nullif(p_channel,''),'web'), left(trim(p_raw_text),80))
    returning id into v_session;
  end if;

  v_intent := detect_assistant_intent_v58(p_raw_text);

  if v_intent in ('focus_today','week_summary','risk_check','payment_summary','vehicle_query','home_query','create_record') then
    v_modules := array['life'];
  elsif v_intent = 'document_search' then
    v_modules := array['document'];
  elsif v_intent = 'profit_query' then
    v_modules := array['profit','finance'];
  elsif v_intent = 'cash_query' then
    v_modules := array['finance'];
  end if;

  insert into aperion_assistant_messages_v58(
    session_id, owner, channel, role, raw_text, intent, target_modules, data_sources, confidence, status
  ) values (
    v_session,
    coalesce(nullif(p_owner,''),'ercan'),
    coalesce(nullif(p_channel,''),'web'),
    'user',
    trim(p_raw_text),
    v_intent,
    v_modules,
    v_modules,
    case when v_intent='unknown' then 0 else 70 end,
    'new'
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace view aperion_assistant_inbox_v58_view as
select *
from aperion_assistant_messages_v58
where status in ('new','draft','needs_data','needs_confirmation','error')
order by created_at desc;

create or replace view aperion_assistant_open_suggestions_v58_view as
select *
from aperion_assistant_suggestions_v58
where status = 'open'
order by
  case priority when 'critical' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,
  created_at desc;

-- Quick checks:
-- select create_assistant_message_v58('ercan','web','Bugün neye odaklanmalıyım?');
-- select * from aperion_assistant_inbox_v58_view;
