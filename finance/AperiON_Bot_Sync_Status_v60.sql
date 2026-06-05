create table if not exists public.bot_sync_status (
  id bigserial primary key,
  bot_name text not null,
  company text not null default 'alayli',
  status text not null check (status in ('ok','failed','warning','running')),
  started_at timestamptz,
  finished_at timestamptz,
  last_success_at timestamptz,
  rows_pulled integer default 0,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists bot_sync_status_company_finished_idx
  on public.bot_sync_status (company, finished_at desc);

alter table public.bot_sync_status enable row level security;

drop policy if exists bot_sync_status_public_read on public.bot_sync_status;
create policy bot_sync_status_public_read
  on public.bot_sync_status
  for select
  to anon, authenticated
  using (true);

drop policy if exists bot_sync_status_public_insert on public.bot_sync_status;
create policy bot_sync_status_public_insert
  on public.bot_sync_status
  for insert
  to anon, authenticated
  with check (company = 'alayli' and bot_name in ('bizimhesap_klonu','aperion_preflight'));

grant select, insert on public.bot_sync_status to anon, authenticated;
grant usage, select on sequence public.bot_sync_status_id_seq to anon, authenticated;
