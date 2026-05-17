-- AperiON Risk Alert Dedup Health Check SQL v52
-- Purpose: verify v52 dedup table, RPC helpers and status view after Supabase install.
-- Safe rule: read-only checks except optional commented manual test insert.

-- 1) Required objects
select
  'risk_alert_sent_log table' as check_name,
  case when to_regclass('public.risk_alert_sent_log') is not null then 'OK' else 'MISSING' end as status
union all
select
  'aperion_risk_alert_dedup_status_v52_view view' as check_name,
  case when to_regclass('public.aperion_risk_alert_dedup_status_v52_view') is not null then 'OK' else 'MISSING' end as status;

-- 2) Required RPC/function names
select
  p.proname as function_name,
  'OK' as status
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('risk_alert_can_send_v52', 'risk_alert_mark_sent_v52')
order by p.proname;

-- 3) Recent sent risk alert logs
select
  company,
  risk_key,
  risk_type,
  risk_level,
  title,
  ref_name,
  sent_at,
  cooldown_until,
  case when cooldown_until > now() then 'IN_COOLDOWN' else 'READY' end as cooldown_status,
  sent_count
from aperion_risk_alert_dedup_status_v52_view
order by last_sent_at desc nulls last
limit 25;

-- 4) Safe function smoke check without writing data
select
  risk_alert_can_send_v52('ALAYLI', 'health-check-readonly-risk-key', 360) as can_send_readonly_check;

-- 5) Optional manual write test. Run only if you want to insert a test log.
-- select risk_alert_mark_sent_v52(
--   'ALAYLI',
--   'health-check-manual-risk-key',
--   'health_check',
--   'warning',
--   'v52 Health Check',
--   null,
--   'Manual SQL health check',
--   0,
--   current_date,
--   5,
--   null,
--   '{"source":"health_check_v52"}'::jsonb
-- );
