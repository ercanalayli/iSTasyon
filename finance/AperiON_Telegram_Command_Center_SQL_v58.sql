-- =========================================================
-- AperiON v58.1 - Telegram Command Center SQL
-- =========================================================
-- Purpose:
-- Store every Telegram input in a command inbox before it becomes
-- a finance, life, document, project or decision record.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists aperion_telegram_command_inbox_v58 (
  id uuid primary key default gen_random_uuid(),
  chat_id text,
  user_id text,
  username text,
  message_id text,
  raw_text text,
  command_text text,
  message_type text not null default 'text'
    check (message_type in ('text','photo','document','voice','audio','video','unknown')),
  source text not null default 'telegram',
  intent text not null default 'unknown'
    check (intent in ('query_today','query_week','query_late','query_payments','query_vehicle','query_home','query_document','create_record','update_status','attach_file','idea','decision','project','unknown')),
  target_module text not null default 'unknown'
    check (target_module in ('finance','life','document','project','decision','assistant','unknown')),
  parsed_payload jsonb not null default '{}'::jsonb,
  confidence numeric(5,2) not null default 0,
  status text not null default 'new'
    check (status in ('new','draft','needs_confirmation','confirmed','processed','ignored','error')),
  related_table text,
  related_record_id text,
  response_preview text,
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists aperion_telegram_command_inbox_v58_status_idx
on aperion_telegram_command_inbox_v58(status, created_at desc);

create index if not exists aperion_telegram_command_inbox_v58_intent_idx
on aperion_telegram_command_inbox_v58(intent, target_module, status);

create index if not exists aperion_telegram_command_inbox_v58_chat_idx
on aperion_telegram_command_inbox_v58(chat_id, created_at desc);

create or replace function touch_aperion_telegram_command_inbox_v58()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_aperion_telegram_command_inbox_v58 on aperion_telegram_command_inbox_v58;
create trigger trg_touch_aperion_telegram_command_inbox_v58
before update on aperion_telegram_command_inbox_v58
for each row execute function touch_aperion_telegram_command_inbox_v58();

create or replace view aperion_telegram_new_commands_v58_view as
select *
from aperion_telegram_command_inbox_v58
where status in ('new','draft','needs_confirmation','error')
order by created_at desc;

create or replace view aperion_telegram_pending_confirmation_v58_view as
select *
from aperion_telegram_command_inbox_v58
where status = 'needs_confirmation'
order by created_at desc;

create or replace function create_telegram_command_v58(
  p_chat_id text,
  p_user_id text,
  p_username text,
  p_message_id text,
  p_raw_text text,
  p_message_type text default 'text'
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_text text;
  v_intent text := 'unknown';
  v_target text := 'unknown';
begin
  v_text := lower(coalesce(p_raw_text,''));

  if v_text like '/bugun%' or v_text like '%bugün ne var%' or v_text like '%bugun ne var%' then
    v_intent := 'query_today';
    v_target := 'life';
  elsif v_text like '/hafta%' or v_text like '%bu hafta%' then
    v_intent := 'query_week';
    v_target := 'life';
  elsif v_text like '/geciken%' or v_text like '%geciken%' then
    v_intent := 'query_late';
    v_target := 'life';
  elsif v_text like '/odemeler%' or v_text like '%ne ödeyeceğim%' or v_text like '%ne odeyecegim%' then
    v_intent := 'query_payments';
    v_target := 'life';
  elsif v_text like '/arac%' or v_text like '%peugeot%' or v_text like '%araba%' then
    v_intent := 'query_vehicle';
    v_target := 'life';
  elsif v_text like '/ev%' or v_text like '%aidat%' then
    v_intent := 'query_home';
    v_target := 'life';
  elsif v_text like '/belge%' or v_text like '%belge%' then
    v_intent := 'query_document';
    v_target := 'document';
  elsif v_text like '/ekle%' or v_text like '%kaydet%' or v_text like '%unutma%' then
    v_intent := 'create_record';
    v_target := 'life';
  end if;

  insert into aperion_telegram_command_inbox_v58 (
    chat_id,
    user_id,
    username,
    message_id,
    raw_text,
    command_text,
    message_type,
    intent,
    target_module,
    confidence,
    status,
    parsed_payload
  ) values (
    p_chat_id,
    p_user_id,
    p_username,
    p_message_id,
    p_raw_text,
    p_raw_text,
    coalesce(nullif(p_message_type,''),'text'),
    v_intent,
    v_target,
    case when v_intent = 'unknown' then 0 else 70 end,
    case when v_intent in ('create_record','update_status','attach_file') then 'draft' else 'new' end,
    jsonb_build_object('raw_text', p_raw_text, 'detected_intent', v_intent, 'target_module', v_target)
  ) returning id into v_id;

  return v_id;
end;
$$;

-- Quick checks:
-- select create_telegram_command_v58('chat','user','foto','1','Bugün ne var?');
-- select * from aperion_telegram_new_commands_v58_view;
