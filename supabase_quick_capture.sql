-- AperiON iSTasyon Quick Capture schema
-- Purpose: Telegram / iPhone Shortcut / Dashboard quick notes.

create table if not exists public.quick_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null default 'unknown',
  raw_text text not null,
  parsed_type text,
  company_class text not null default 'ALAYLI',
  counterparty text,
  amount numeric(14,2),
  currency text not null default 'TRY',
  due_date date,
  payment_method text,
  priority text not null default 'normal',
  status text not null default 'captured',
  confidence integer not null default 50,
  needs_review boolean not null default true,
  created_by text,
  telegram_chat_id text,
  telegram_message_id text,
  parsed_json jsonb not null default '{}'::jsonb,
  alarm_requested boolean not null default false,
  calendar_event_id text,
  dashboard_visible boolean not null default true
);

alter table if exists public.quick_notes add column if not exists payment_method text;

create index if not exists quick_notes_created_at_idx on public.quick_notes(created_at desc);
create index if not exists quick_notes_due_date_idx on public.quick_notes(due_date);
create index if not exists quick_notes_status_idx on public.quick_notes(status);
create index if not exists quick_notes_priority_idx on public.quick_notes(priority);
create index if not exists quick_notes_payment_method_idx on public.quick_notes(payment_method);

create table if not exists public.payment_promises (
  id uuid primary key default gen_random_uuid(),
  quick_note_id uuid references public.quick_notes(id) on delete set null,
  created_at timestamptz not null default now(),
  company_class text not null default 'ALAYLI',
  counterparty text not null,
  amount numeric(14,2) not null,
  currency text not null default 'TRY',
  due_date date not null,
  payment_method text,
  bank_account text,
  approval_status text not null default 'pending_approval',
  paid_status text not null default 'pending_payment',
  evidence_status text not null default 'waiting_proof',
  proof_file text,
  priority text not null default 'critical',
  note text
);

alter table if exists public.payment_promises add column if not exists payment_method text;

create index if not exists payment_promises_due_date_idx on public.payment_promises(due_date);
create index if not exists payment_promises_paid_status_idx on public.payment_promises(paid_status);
create index if not exists payment_promises_payment_method_idx on public.payment_promises(payment_method);

create or replace view public.quick_capture_dashboard_view as
select
  q.id,
  q.created_at,
  q.source,
  q.raw_text,
  q.parsed_type,
  q.company_class,
  q.counterparty,
  q.amount,
  q.currency,
  q.due_date,
  coalesce(p.payment_method, q.payment_method) as payment_method,
  q.priority,
  q.status,
  q.confidence,
  q.needs_review,
  q.alarm_requested,
  q.calendar_event_id,
  p.id as payment_promise_id,
  p.approval_status,
  p.paid_status,
  p.evidence_status
from public.quick_notes q
left join public.payment_promises p on p.quick_note_id = q.id
where q.dashboard_visible = true
order by q.created_at desc;
