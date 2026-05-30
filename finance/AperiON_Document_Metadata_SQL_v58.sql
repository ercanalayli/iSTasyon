-- =========================================================
-- AperiON v58 - Document Metadata SQL
-- =========================================================
-- Purpose:
-- Large files stay in Google Drive.
-- AperiON stores only references, status and relation fields.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists aperion_document_metadata_v58 (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  module text not null default 'general'
    check (module in ('finance','company','life','project','decision','general')),
  source text not null default 'manual'
    check (source in ('gmail','telegram','manual','apps_script','system')),
  drive_file_id text,
  drive_url text,
  file_name text not null,
  file_type text,
  file_size_bytes bigint,
  related_table text,
  related_record_id text,
  record_title text,
  status text not null default 'new'
    check (status in ('new','draft','review','linked','processed','error','archived')),
  tags text[] not null default '{}',
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists aperion_document_metadata_v58_company_idx
on aperion_document_metadata_v58(company, module, status, created_at desc);

create index if not exists aperion_document_metadata_v58_relation_idx
on aperion_document_metadata_v58(related_table, related_record_id);

create index if not exists aperion_document_metadata_v58_drive_idx
on aperion_document_metadata_v58(drive_file_id);

create or replace function touch_aperion_document_metadata_v58()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_aperion_document_metadata_v58 on aperion_document_metadata_v58;
create trigger trg_touch_aperion_document_metadata_v58
before update on aperion_document_metadata_v58
for each row execute function touch_aperion_document_metadata_v58();

create or replace view aperion_document_inbox_v58_view as
select *
from aperion_document_metadata_v58
where status in ('new','draft','review','error')
order by created_at desc;

create or replace view aperion_unlinked_documents_v58_view as
select *
from aperion_document_metadata_v58
where related_record_id is null
  and status <> 'archived'
order by created_at desc;

create or replace function create_document_metadata_v58(
  p_company text,
  p_module text,
  p_source text,
  p_drive_file_id text,
  p_drive_url text,
  p_file_name text,
  p_file_type text default null,
  p_file_size_bytes bigint default null,
  p_note text default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  if nullif(trim(p_file_name), '') is null then
    raise exception 'file_name is required';
  end if;

  insert into aperion_document_metadata_v58 (
    company,
    module,
    source,
    drive_file_id,
    drive_url,
    file_name,
    file_type,
    file_size_bytes,
    note
  ) values (
    coalesce(nullif(p_company,''),'alayli'),
    coalesce(nullif(p_module,''),'general'),
    coalesce(nullif(p_source,''),'manual'),
    p_drive_file_id,
    p_drive_url,
    trim(p_file_name),
    p_file_type,
    p_file_size_bytes,
    p_note
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Quick checks:
-- select * from aperion_document_inbox_v58_view;
-- select * from aperion_unlinked_documents_v58_view;
