-- =========================================================
-- AperiON v58 - Finance Approval Queue SQL
-- =========================================================
-- Purpose:
-- Convert finance-related document metadata into reviewable
-- approval queue items before any final finance action.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists aperion_finance_approval_queue_v58 (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  document_id uuid references aperion_document_metadata_v58(id) on delete set null,
  queue_type text not null default 'document_review'
    check (queue_type in ('document_review','bank_statement','invoice','receipt','moka','card_statement','other')),
  source text not null default 'document_center'
    check (source in ('document_center','gmail','telegram','manual','system')),
  title text not null,
  description text,
  suggested_action text not null default 'review'
    check (suggested_action in ('review','parse','match','link','ignore','request_info')),
  confidence numeric(5,2) not null default 0,
  priority text not null default 'normal'
    check (priority in ('low','normal','high','critical')),
  status text not null default 'pending'
    check (status in ('pending','in_review','approved','rejected','needs_info','processed','error','archived')),
  assigned_to text,
  review_note text,
  result_payload jsonb not null default '{}'::jsonb,
  approved_by text,
  approved_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aperion_finance_approval_queue_v58_status_idx
on aperion_finance_approval_queue_v58(company, status, priority, created_at desc);

create index if not exists aperion_finance_approval_queue_v58_document_idx
on aperion_finance_approval_queue_v58(document_id);

create or replace function touch_aperion_finance_approval_queue_v58()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'approved' and old.status is distinct from 'approved' then
    new.approved_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_touch_aperion_finance_approval_queue_v58 on aperion_finance_approval_queue_v58;
create trigger trg_touch_aperion_finance_approval_queue_v58
before update on aperion_finance_approval_queue_v58
for each row execute function touch_aperion_finance_approval_queue_v58();

create or replace function guess_finance_queue_type_v58(p_file_name text, p_file_type text, p_note text)
returns text
language plpgsql
as $$
declare
  v text := lower(coalesce(p_file_name,'') || ' ' || coalesce(p_file_type,'') || ' ' || coalesce(p_note,''));
begin
  if v like '%moka%' or v like '%pos%' then
    return 'moka';
  elsif v like '%kredi kart%' or v like '%card%' or v like '%ekstre%' then
    return 'card_statement';
  elsif v like '%banka%' or v like '%hesap%' or v like '%statement%' then
    return 'bank_statement';
  elsif v like '%fatura%' or v like '%invoice%' then
    return 'invoice';
  elsif v like '%dekont%' or v like '%receipt%' then
    return 'receipt';
  end if;
  return 'document_review';
end;
$$;

create or replace function create_finance_approval_from_document_v58(p_document_id uuid)
returns uuid
language plpgsql
as $$
declare
  d aperion_document_metadata_v58%rowtype;
  v_id uuid;
  v_queue_type text;
begin
  select * into d from aperion_document_metadata_v58 where id = p_document_id;
  if not found then
    raise exception 'document not found';
  end if;

  if d.module <> 'finance' then
    raise exception 'document module is not finance';
  end if;

  select id into v_id
  from aperion_finance_approval_queue_v58
  where document_id = p_document_id
    and status <> 'archived'
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  v_queue_type := guess_finance_queue_type_v58(d.file_name, d.file_type, d.note);

  insert into aperion_finance_approval_queue_v58 (
    company,
    document_id,
    queue_type,
    source,
    title,
    description,
    suggested_action,
    confidence,
    priority,
    status,
    result_payload
  ) values (
    d.company,
    d.id,
    v_queue_type,
    d.source,
    d.file_name,
    d.note,
    case when v_queue_type in ('bank_statement','card_statement','moka') then 'parse' else 'review' end,
    case when v_queue_type = 'document_review' then 50 else 75 end,
    case when v_queue_type in ('bank_statement','moka') then 'high' else 'normal' end,
    'pending',
    jsonb_build_object('drive_url', d.drive_url, 'file_type', d.file_type, 'module', d.module)
  ) returning id into v_id;

  update aperion_document_metadata_v58
  set status = 'review', related_table = 'aperion_finance_approval_queue_v58', related_record_id = v_id::text
  where id = d.id;

  return v_id;
end;
$$;

create or replace function enqueue_new_finance_documents_v58()
returns integer
language plpgsql
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select id
    from aperion_document_metadata_v58 d
    where d.module = 'finance'
      and d.status in ('new','draft','review')
      and not exists (
        select 1 from aperion_finance_approval_queue_v58 q
        where q.document_id = d.id and q.status <> 'archived'
      )
  loop
    perform create_finance_approval_from_document_v58(r.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace view aperion_finance_approval_queue_v58_view as
select
  q.*,
  d.drive_url,
  d.file_name,
  d.file_type,
  d.file_size_bytes,
  d.note as document_note,
  d.created_at as document_created_at
from aperion_finance_approval_queue_v58 q
left join aperion_document_metadata_v58 d on d.id = q.document_id
where q.status in ('pending','in_review','needs_info','error')
order by
  case q.priority when 'critical' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,
  q.created_at desc;

-- Quick checks:
-- select enqueue_new_finance_documents_v58();
-- select * from aperion_finance_approval_queue_v58_view;
