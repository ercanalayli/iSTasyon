-- AperiON Financial Statement Engine Healthcheck v54
-- Purpose: verify that the event -> ledger -> statement pipeline is alive.

select
  'finance_events_v54' as object_name,
  count(*)::numeric as total_rows
from finance_events_v54

union all

select
  'finance_ledger_v54',
  count(*)::numeric
from finance_ledger_v54

union all

select
  'income_statement_lines',
  count(*)::numeric
from financial_income_statement_v54_view

union all

select
  'balance_sheet_lines',
  count(*)::numeric
from financial_balance_sheet_v54_view

union all

select
  'kpi_summary_rows',
  count(*)::numeric
from financial_kpi_summary_v54_view

union all

select
  'reconciliation_alerts',
  count(*)::numeric
from financial_reconciliation_alerts_v54_view
;

-- Trigger verification: approved event inserts/updates must automatically rebuild ledger rows.

select
  'trg_finance_events_v54_after_insert_update' as object_name,
  count(*)::numeric as total_rows
from information_schema.triggers
where event_object_table = 'finance_events_v54'
  and trigger_name = 'trg_finance_events_v54_after_insert_update';

select
  'finance_events_v54_after_write_trigger' as object_name,
  count(*)::numeric as total_rows
from pg_proc
where proname = 'finance_events_v54_after_write_trigger';

select
  'approved_events_without_ledger' as object_name,
  count(*)::numeric as total_rows
from finance_events_v54 e
where e.status = 'approved'
  and e.confidence_score >= 70
  and not exists (
    select 1
    from finance_ledger_v54 l
    where l.event_id = e.event_id
  );

-- Demo verification

select *
from financial_income_statement_v54_view
where company = 'ALAYLI_DEMO_V54'
order by line_name;

select *
from financial_balance_sheet_v54_view
where company = 'ALAYLI_DEMO_V54'
order by line_name;

select *
from financial_kpi_summary_v54_view
where company = 'ALAYLI_DEMO_V54';

select *
from financial_reconciliation_alerts_v54_view
where company = 'ALAYLI_DEMO_V54';