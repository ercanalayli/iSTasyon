-- =========================================================
-- AperiON v57 — Ücretsiz Gmail/Drive Dosya Giriş Merkezi SQL
-- =========================================================
-- Amaç:
-- Google Apps Script ile Drive'a düşen banka ekstresi dosyalarını
-- AperiON tarafında ham dosya / okuma / onay kuyruğu olarak takip etmek.
--
-- Güvenlik:
-- - Bu SQL BizimHesap'a kayıt göndermez.
-- - Onaysız kesin finans kaydı oluşturmaz.
-- - Veri yoksa hesap uydurmaz.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists bank_statement_files_v57 (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  source_channel text not null default 'gmail_drive',
  drive_file_id text,
  drive_file_url text,
  file_name text not null,
  mime_type text,
  file_extension text,
  file_size_bytes bigint,
  gmail_message_id text,
  gmail_thread_id text,
  gmail_from text,
  gmail_subject text,
  gmail_date timestamptz,
  received_at timestamptz default now(),
  imported_at timestamptz,
  parse_status text not null default 'new'
    check (parse_status in ('new','queued','parsed','control_waiting','approval_waiting','processed','failed','duplicate')),
  parser_name text,
  parser_note text,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bank_statement_files_v57_drive_file_id_uq
on bank_statement_files_v57(company, drive_file_id)
where drive_file_id is not null;

create index if not exists bank_statement_files_v57_company_status_idx
on bank_statement_files_v57(company, parse_status, received_at desc);

create table if not exists bank_statement_file_events_v57 (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  file_id uuid references bank_statement_files_v57(id) on delete cascade,
  event_type text not null,
  event_status text not null default 'ok' check (event_status in ('ok','warning','failed')),
  event_note text,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bank_statement_file_events_v57_file_idx
on bank_statement_file_events_v57(file_id, created_at desc);

create or replace function touch_bank_statement_files_v57()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_bank_statement_files_v57 on bank_statement_files_v57;
create trigger trg_touch_bank_statement_files_v57
before update on bank_statement_files_v57
for each row execute function touch_bank_statement_files_v57();

create or replace function bank_statement_file_register_v57(
  p_company text,
  p_drive_file_id text,
  p_drive_file_url text,
  p_file_name text,
  p_mime_type text default null,
  p_file_size_bytes bigint default null,
  p_gmail_message_id text default null,
  p_gmail_thread_id text default null,
  p_gmail_from text default null,
  p_gmail_subject text default null,
  p_gmail_date timestamptz default null,
  p_raw_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_ext text;
begin
  v_ext := lower(nullif(split_part(reverse(p_file_name), '.', 1), ''));
  if v_ext is not null then
    v_ext := reverse(v_ext);
  end if;

  insert into bank_statement_files_v57 (
    company,
    drive_file_id,
    drive_file_url,
    file_name,
    mime_type,
    file_extension,
    file_size_bytes,
    gmail_message_id,
    gmail_thread_id,
    gmail_from,
    gmail_subject,
    gmail_date,
    raw_metadata,
    parse_status
  ) values (
    coalesce(nullif(p_company,''),'alayli'),
    nullif(p_drive_file_id,''),
    nullif(p_drive_file_url,''),
    p_file_name,
    nullif(p_mime_type,''),
    v_ext,
    p_file_size_bytes,
    nullif(p_gmail_message_id,''),
    nullif(p_gmail_thread_id,''),
    nullif(p_gmail_from,''),
    nullif(p_gmail_subject,''),
    p_gmail_date,
    coalesce(p_raw_metadata,'{}'::jsonb),
    'new'
  )
  on conflict (company, drive_file_id) where drive_file_id is not null
  do update set
    drive_file_url = excluded.drive_file_url,
    file_name = excluded.file_name,
    mime_type = excluded.mime_type,
    file_extension = excluded.file_extension,
    file_size_bytes = excluded.file_size_bytes,
    gmail_message_id = excluded.gmail_message_id,
    gmail_thread_id = excluded.gmail_thread_id,
    gmail_from = excluded.gmail_from,
    gmail_subject = excluded.gmail_subject,
    gmail_date = excluded.gmail_date,
    raw_metadata = bank_statement_files_v57.raw_metadata || excluded.raw_metadata,
    parse_status = case
      when bank_statement_files_v57.parse_status in ('processed','approval_waiting') then bank_statement_files_v57.parse_status
      else 'duplicate'
    end
  returning id into v_id;

  insert into bank_statement_file_events_v57(company, file_id, event_type, event_status, event_note)
  values (coalesce(nullif(p_company,''),'alayli'), v_id, 'register', 'ok', 'Gmail/Drive dosyası kaydedildi veya güncellendi.');

  return v_id;
end;
$$;

create or replace view bank_statement_files_inbox_v57_view as
select
  id,
  company,
  source_channel,
  drive_file_id,
  drive_file_url,
  file_name,
  mime_type,
  file_extension,
  file_size_bytes,
  gmail_from,
  gmail_subject,
  gmail_date,
  received_at,
  imported_at,
  parse_status,
  parser_name,
  parser_note,
  created_at,
  updated_at,
  case
    when parse_status = 'new' then 'Yeni dosya'
    when parse_status = 'queued' then 'Okuma kuyruğunda'
    when parse_status = 'parsed' then 'Okundu'
    when parse_status = 'control_waiting' then 'Kontrol bekliyor'
    when parse_status = 'approval_waiting' then 'Onay bekliyor'
    when parse_status = 'processed' then 'İşlendi'
    when parse_status = 'failed' then 'Hata'
    when parse_status = 'duplicate' then 'Mükerrer'
    else 'Eksik veri'
  end as status_label
from bank_statement_files_v57
order by received_at desc;

create or replace view free_automation_health_v57_view as
select
  company,
  count(*) as total_files,
  count(*) filter (where parse_status='new') as new_files,
  count(*) filter (where parse_status='approval_waiting') as approval_waiting_files,
  count(*) filter (where parse_status='processed') as processed_files,
  count(*) filter (where parse_status='failed') as failed_files,
  max(received_at) as last_received_at,
  case
    when count(*) = 0 then 'eksik veri'
    when count(*) filter (where parse_status='failed') > 0 then 'kontrol gerekli'
    when count(*) filter (where parse_status in ('new','approval_waiting','control_waiting')) > 0 then 'bekleyen var'
    else 'ok'
  end as health_status
from bank_statement_files_v57
group by company;

-- Quick checks:
-- select * from bank_statement_files_inbox_v57_view where company='alayli';
-- select * from free_automation_health_v57_view where company='alayli';
