create table if not exists bizimhesap_queue (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'alayli',
  pending_bank_movement_id uuid references pending_bank_movements(id),
  target_module text not null default 'finance',
  action_type text not null default 'create_payment_or_collection',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'ready_for_bizimhesap',
  error_message text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

create index if not exists idx_bizimhesap_queue_status on bizimhesap_queue(status);
create index if not exists idx_bizimhesap_queue_company on bizimhesap_queue(company_id);
