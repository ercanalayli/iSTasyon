-- AperiON / ErpaltH iSTasyon
-- Finans Komuta Merkezi Health Check SQL
-- SUPABASE_COMMAND_CENTER_INSTALL.sql sonrasında çalıştırılır.

-- 1) Obje varlık kontrolü
select 'finance_command_center_records' as object_name, to_regclass('public.finance_command_center_records') is not null as exists
union all select 'finance_command_center_action_log', to_regclass('public.finance_command_center_action_log') is not null
union all select 'finance_telegram_alarm_queue', to_regclass('public.finance_telegram_alarm_queue') is not null
union all select 'finance_command_center_today', to_regclass('public.finance_command_center_today') is not null
union all select 'finance_command_center_late', to_regclass('public.finance_command_center_late') is not null
union all select 'finance_command_center_alarm_candidates', to_regclass('public.finance_command_center_alarm_candidates') is not null;

-- 2) Firma / çekirdek / durum özeti
select
  company,
  core,
  status,
  verification,
  count(*) as record_count,
  sum(amount) as total_amount
from finance_command_center_records
group by company, core, status, verification
order by company, core, status, verification;

-- 3) Bugünkü kayıtlar
select
  company,
  core,
  title,
  due_date,
  amount,
  status,
  verification,
  source
from finance_command_center_today
order by company, core, due_date, title;

-- 4) Geciken kayıtlar
select
  company,
  core,
  title,
  due_date,
  amount,
  status,
  verification,
  source
from finance_command_center_late
order by due_date, company, core, title;

-- 5) Alarm adayları özet
select
  company,
  core,
  alarm_level,
  status,
  verification,
  count(*) as record_count,
  sum(amount) as total_amount
from finance_command_center_alarm_candidates
group by company, core, alarm_level, status, verification
order by company, core, alarm_level, status;

-- 6) Alarm kuyruğu özet
select
  company,
  alarm_type,
  alarm_level,
  status,
  count(*) as alarm_count,
  max(scheduled_at) as last_scheduled_at
from finance_telegram_alarm_queue
group by company, alarm_type, alarm_level, status
order by company, alarm_level, status;

-- 7) Doğrulanmamış / onay bekleyen kayıtlar
select
  id,
  company,
  core,
  title,
  due_date,
  amount,
  source,
  status,
  verification
from finance_command_center_records
where verification in ('unverified','needs_approval','manual_required','telegram_candidate')
order by due_date, company, core;
