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
