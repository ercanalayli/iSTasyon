-- AperiON / ErpaltH iSTasyon
-- Finans Komuta Merkezi Tek Dosya Supabase Kurulumu
-- Bu dosya SQL Editor içinde çalıştırılmak üzere hazırlanmıştır.
-- Mevcut Finans Takvimi tablolarını silmez.

-- 1) Enumlar
create type if not exists command_center_core as enum (
  'task',
  'payable',
  'receivable'
);

create type if not exists command_center_status as enum (
  'draft',
  'pending',
  'in_progress',
  'completed',
  'postponed',
  'late',
  'cancelled'
);

create type if not exists command_center_verification as enum (
  'unverified',
  'needs_approval',
  'verified',
  'verified_date_shift',
  'telegram_candidate',
  'manual_required'
);

-- 2) Ana kayıt tablosu
create table if not exists finance_command_center_records (
  id uuid primary key default gen_random_uuid(),
  company finance_company not null,
  core command_center_core not null,
  title text not null,
  description text,
  due_date date not null,
  data_date date not null,
  source text not null,
  source_ref text,
  status command_center_status not null default 'pending',
  verification command_center_verification not null default 'unverified',
  amount numeric(14,2) not null default 0,
  currency text not null default 'TRY',
  priority text not null default 'normal',
  alarm_level text not null default 'none',
  assigned_to text,
  telegram_enabled boolean not null default false,
  telegram_last_sent_at timestamptz,
  telegram_chat_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_command_title_not_empty check (length(trim(title)) > 0),
  constraint chk_command_amount_nonnegative check (amount >= 0),
  constraint chk_command_currency_not_empty check (length(trim(currency)) > 0)
);

create index if not exists idx_command_center_company_core_due on finance_command_center_records(company, core, due_date);
create index if not exists idx_command_center_status on finance_command_center_records(status, verification, alarm_level);
create index if not exists idx_command_center_source on finance_command_center_records(source, source_ref);

-- 3) Aksiyon log tablosu
create table if not exists finance_command_center_action_log (
  id uuid primary key default gen_random_uuid(),
  record_id uuid references finance_command_center_records(id) on delete cascade,
  company finance_company not null,
  action_type text not null,
  action_source text not null default 'manual',
  action_payload jsonb not null default '{}'::jsonb,
  verification_before text,
  verification_after text,
  status_before text,
  status_after text,
  performed_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_command_action_record on finance_command_center_action_log(record_id, created_at desc);
create index if not exists idx_command_action_source on finance_command_center_action_log(action_source, action_type);

-- 4) Telegram alarm kuyruğu
create table if not exists finance_telegram_alarm_queue (
  id uuid primary key default gen_random_uuid(),
  record_id uuid references finance_command_center_records(id) on delete cascade,
  company finance_company not null,
  alarm_type text not null,
  alarm_level text not null,
  message text not null,
  chat_id text,
  status text not null default 'pending',
  retry_count int not null default 0,
  last_error text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_telegram_alarm_queue_status on finance_telegram_alarm_queue(status, scheduled_at);
create index if not exists idx_telegram_alarm_queue_company on finance_telegram_alarm_queue(company, alarm_level);

-- 5) Viewlar
create or replace view finance_command_center_today as
select *
from finance_command_center_records
where due_date = current_date
  and status not in ('completed','cancelled');

create or replace view finance_command_center_late as
select *
from finance_command_center_records
where due_date < current_date
  and status not in ('completed','cancelled');

create or replace view finance_command_center_alarm_candidates as
select *
from finance_command_center_records
where status = 'late'
   or alarm_level in ('warning','critical')
   or verification in ('unverified','needs_approval','manual_required','telegram_candidate');

-- 6) Demo seed
insert into finance_command_center_records
(company, core, title, description, due_date, data_date, source, source_ref, status, verification, amount, priority, alarm_level, telegram_enabled, notes)
values
('alayli','payable','Akbank Axess Business kredi kartı','Dönem içi + gelecek dönem taksit ayrımı kontrol edilecek.','2026-05-14','2026-05-14','demo_finance_seed','PAY-001','pending','needs_approval',341263.92,'high','critical',true,'Ödeme onaydan sonra kesinleşecek.'),
('alayli','payable','Tedarikçi çeki','Asıl vade korunacak, fiili ödeme ilk iş günü mantığı uygulanacak.','2026-05-14','2026-05-14','manual_demo','PAY-002','pending','verified_date_shift',220000.00,'normal','warning',true,'Çek/senet vade kontrolü.'),
('alayli','receivable','Medikal SGK alacağı','Tahsilat bekleniyor; doğrulama sonrası kesinleşecek.','2026-05-14','2026-05-14','demo_finance_seed','REC-001','pending','needs_approval',875958.47,'high','critical',true,'Tahsilat kesin değil.'),
('alayli','receivable','Moka United beklenen POS geçişi','Banka geçişi bekleniyor.','2026-05-14','2026-05-14','moka_pipeline_demo','REC-002','pending','telegram_candidate',185000.00,'normal','warning',true,'Moka alarm adayı.'),
('alayli','task','Supabase finance tablolarını kur','SQL Editor sırası: install all, validation safe, health check.','2026-05-14','2026-05-14','NEXT_ACTIONS_FINANCE.md','TASK-001','pending','manual_required',0,'high','warning',false,'Manuel kurulum görevi.'),
('alayli','task','Inject Finance Link workflow çalıştır','Actions üzerinden manuel çalıştırılacak.','2026-05-14','2026-05-14','github_actions','TASK-002','pending','manual_required',0,'normal','warning',false,'Index link workflow.'),
('yenicespor','payable','A Takım değişken ödeme kontrolü','Kalan ödeme kontrol edilmeli.','2026-05-12','2026-05-12','demo_finance_seed','LATE-001','late','needs_approval',35000.00,'high','critical',true,'Geciken ödeme.'),
('woodlet','payable','Levha tedarikçisi ödeme kalanı','Kaynak dosya doğrulanmadan kesin sonuç kabul edilmez.','2026-05-13','2026-05-13','bizimhesap_pipeline_demo','LATE-002','late','unverified',300000.00,'high','critical',true,'Doğrulanmamış geciken ödeme.')
on conflict do nothing;

insert into finance_telegram_alarm_queue
(record_id, company, alarm_type, alarm_level, message, status)
select id, company, 'finance_command_center', alarm_level,
       '[' || company || '] ' || title || ' - ' || amount::text || ' TRY - durum: ' || status,
       'pending'
from finance_command_center_records
where alarm_level in ('warning','critical')
on conflict do nothing;
