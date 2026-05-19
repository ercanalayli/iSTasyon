create table if not exists bot_sync_status (
  id bigserial primary key,
  bot_name text not null,
  company text not null default 'alayli',
  status text not null default 'unknown',
  started_at timestamptz,
  finished_at timestamptz,
  last_success_at timestamptz,
  rows_pulled integer default 0,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_bot_sync_status_latest
on bot_sync_status(company, bot_name, created_at desc);

create or replace view bot_sync_status_latest as
select distinct on (company, bot_name)
  company,
  bot_name,
  status,
  started_at,
  finished_at,
  last_success_at,
  rows_pulled,
  message,
  created_at
from bot_sync_status
order by company, bot_name, created_at desc;
