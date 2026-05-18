-- AperiON Financial Statement Engine SQL v54
-- Purpose: create a safe event -> ledger -> financial statements model for dynamic income statement and balance sheet.
-- Safety: does not alter existing raw tables. Creates new v54 tables/views only.

create table if not exists finance_events_v54 (
  event_id uuid primary key default gen_random_uuid(),
  company text not null default 'ALAYLI',
  event_type text not null,
  source_table text,
  source_id text,
  event_date date not null default current_date,
  accounting_date date not null default current_date,
  amount numeric not null default 0,
  currency text not null default 'TRY',
  customer_name text,
  vendor_name text,
  product_name text,
  account_name text,
  status text not null default 'approved',
  confidence_score numeric not null default 100,
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_events_v54_company_date
  on finance_events_v54(company, accounting_date desc);

create index if not exists idx_finance_events_v54_type
  on finance_events_v54(event_type, accounting_date desc);

create index if not exists idx_finance_events_v54_status
  on finance_events_v54(status, confidence_score);

create table if not exists finance_ledger_v54 (
  ledger_id uuid primary key default gen_random_uuid(),
  event_id uuid references finance_events_v54(event_id) on delete cascade,
  company text not null default 'ALAYLI',
  statement_type text not null,
  line_code text not null,
  line_name text not null,
  side text not null default 'net',
  debit_amount numeric not null default 0,
  credit_amount numeric not null default 0,
  net_amount numeric not null default 0,
  period_date date not null default current_date,
  source text,
  confidence_score numeric not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_ledger_v54_company_period
  on finance_ledger_v54(company, period_date desc);

create index if not exists idx_finance_ledger_v54_statement_line
  on finance_ledger_v54(statement_type, line_code);

create or replace function finance_event_to_ledger_v54(p_event_id uuid)
returns integer
language plpgsql
volatile
as $$
declare
  e finance_events_v54%rowtype;
  v_count integer := 0;
begin
  select * into e from finance_events_v54 where event_id = p_event_id;

  if not found then
    raise exception 'finance_event_to_ledger_v54: event not found: %', p_event_id;
  end if;

  delete from finance_ledger_v54 where event_id = p_event_id;

  if e.status <> 'approved' or e.confidence_score < 70 then
    return 0;
  end if;

  if e.event_type = 'sale' then
    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, credit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'income_statement', 'gross_sales', 'Brüt Satışlar', 'credit', e.amount, e.amount, e.accounting_date, e.source_table, e.confidence_score);

    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, debit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'balance_sheet', 'customer_receivables', 'Müşteri Alacakları', 'debit', e.amount, e.amount, e.accounting_date, e.source_table, e.confidence_score);

    v_count := v_count + 2;

  elsif e.event_type = 'sales_return' then
    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, debit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'income_statement', 'sales_returns', 'Satış İadeleri', 'debit', e.amount, -e.amount, e.accounting_date, e.source_table, e.confidence_score);
    v_count := v_count + 1;

  elsif e.event_type = 'discount' then
    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, debit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'income_statement', 'sales_discounts', 'Satış İskontoları', 'debit', e.amount, -e.amount, e.accounting_date, e.source_table, e.confidence_score);
    v_count := v_count + 1;

  elsif e.event_type = 'cost_of_goods_sold' then
    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, debit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'income_statement', 'cogs', 'Satışların Maliyeti', 'debit', e.amount, -e.amount, e.accounting_date, e.source_table, e.confidence_score);

    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, credit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'balance_sheet', 'inventory', 'Stoklar', 'credit', e.amount, -e.amount, e.accounting_date, e.source_table, e.confidence_score);
    v_count := v_count + 2;

  elsif e.event_type in ('expense', 'accrued_expense') then
    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, debit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'income_statement', 'operating_expenses', 'Operasyonel Giderler', 'debit', e.amount, -e.amount, e.accounting_date, e.source_table, e.confidence_score);

    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, credit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'balance_sheet', 'vendor_payables', 'Tedarikçi Borçları', 'credit', e.amount, -e.amount, e.accounting_date, e.source_table, e.confidence_score);
    v_count := v_count + 2;

  elsif e.event_type = 'collection' then
    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, credit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'balance_sheet', 'customer_receivables', 'Müşteri Alacakları', 'credit', e.amount, -e.amount, e.accounting_date, e.source_table, e.confidence_score);

    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, debit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'balance_sheet', coalesce(nullif(e.account_name, ''), 'bank_cash'), 'Kasa / Banka', 'debit', e.amount, e.amount, e.accounting_date, e.source_table, e.confidence_score);
    v_count := v_count + 2;

  elsif e.event_type = 'payment' then
    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, debit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'balance_sheet', 'vendor_payables', 'Tedarikçi Borçları', 'debit', e.amount, e.amount, e.accounting_date, e.source_table, e.confidence_score);

    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, credit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'balance_sheet', coalesce(nullif(e.account_name, ''), 'bank_cash'), 'Kasa / Banka', 'credit', e.amount, -e.amount, e.accounting_date, e.source_table, e.confidence_score);
    v_count := v_count + 2;

  elsif e.event_type = 'moka_collection' then
    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, credit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'balance_sheet', 'customer_receivables', 'Müşteri Alacakları', 'credit', e.amount, -e.amount, e.accounting_date, e.source_table, e.confidence_score);

    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, debit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'balance_sheet', 'moka_united', 'Moka United Bekleyen', 'debit', e.amount, e.amount, e.accounting_date, e.source_table, e.confidence_score);
    v_count := v_count + 2;

  elsif e.event_type = 'moka_bank_transfer' then
    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, credit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'balance_sheet', 'moka_united', 'Moka United Bekleyen', 'credit', e.amount, -e.amount, e.accounting_date, e.source_table, e.confidence_score);

    insert into finance_ledger_v54(event_id, company, statement_type, line_code, line_name, side, debit_amount, net_amount, period_date, source, confidence_score)
    values (e.event_id, e.company, 'balance_sheet', 'bank', 'Banka', 'debit', e.amount, e.amount, e.accounting_date, e.source_table, e.confidence_score);
    v_count := v_count + 2;
  end if;

  return v_count;
end;
$$;

create or replace function finance_rebuild_ledger_v54(p_company text default 'ALAYLI')
returns integer
language plpgsql
volatile
as $$
declare
  r record;
  v_total integer := 0;
begin
  delete from finance_ledger_v54 where company = p_company;

  for r in
    select event_id from finance_events_v54 where company = p_company order by accounting_date, created_at
  loop
    v_total := v_total + finance_event_to_ledger_v54(r.event_id);
  end loop;

  return v_total;
end;
$$;

create or replace function finance_events_v54_after_write_trigger()
returns trigger
language plpgsql
volatile
as $$
begin
  new.updated_at := now();
  perform finance_event_to_ledger_v54(new.event_id);
  return new;
end;
$$;

drop trigger if exists trg_finance_events_v54_after_insert_update on finance_events_v54;

create trigger trg_finance_events_v54_after_insert_update
after insert or update of
  company,
  event_type,
  source_table,
  source_id,
  accounting_date,
  amount,
  customer_name,
  vendor_name,
  product_name,
  account_name,
  status,
  confidence_score,
  note,
  payload
on finance_events_v54
for each row
execute function finance_events_v54_after_write_trigger();

create or replace view financial_income_statement_v54_view as
with base as (
  select company, line_code, line_name, sum(net_amount) amount
  from finance_ledger_v54
  where statement_type = 'income_statement'
  group by company, line_code, line_name
), calc as (
  select company, 'gross_sales' line_code, 'Brüt Satışlar' line_name, coalesce(sum(amount) filter (where line_code='gross_sales'), 0) amount from base group by company
  union all select company, 'sales_returns', 'Satış İadeleri', coalesce(sum(amount) filter (where line_code='sales_returns'), 0) from base group by company
  union all select company, 'sales_discounts', 'Satış İskontoları', coalesce(sum(amount) filter (where line_code='sales_discounts'), 0) from base group by company
  union all select company, 'net_sales', 'Net Satışlar', coalesce(sum(amount) filter (where line_code in ('gross_sales','sales_returns','sales_discounts')), 0) from base group by company
  union all select company, 'cogs', 'Satışların Maliyeti', coalesce(sum(amount) filter (where line_code='cogs'), 0) from base group by company
  union all select company, 'gross_profit', 'Brüt Kar', coalesce(sum(amount) filter (where line_code in ('gross_sales','sales_returns','sales_discounts','cogs')), 0) from base group by company
  union all select company, 'operating_expenses', 'Operasyonel Giderler', coalesce(sum(amount) filter (where line_code='operating_expenses'), 0) from base group by company
  union all select company, 'profit_before_tax', 'Vergi Öncesi Kar', coalesce(sum(amount), 0) from base group by company
  union all select company, 'net_profit', 'Net Kar', coalesce(sum(amount), 0) from base group by company
)
select * from calc;

create or replace view financial_balance_sheet_v54_view as
with base as (
  select company, line_code, line_name, sum(net_amount) amount
  from finance_ledger_v54
  where statement_type = 'balance_sheet'
  group by company, line_code, line_name
), lines as (
  select company, line_code, line_name, amount from base
  union all
  select company, 'total_assets', 'Toplam Varlıklar', coalesce(sum(amount) filter (where line_code in ('customer_receivables','inventory','moka_united','bank','bank_cash')), 0)
  from base group by company
  union all
  select company, 'total_liabilities', 'Toplam Borçlar', abs(coalesce(sum(amount) filter (where line_code in ('vendor_payables','credit_cards','bank_loans','tax_sgk')), 0))
  from base group by company
  union all
  select company, 'net_worth', 'Net Varlık', coalesce(sum(amount), 0)
  from base group by company
)
select * from lines;

create or replace view financial_kpi_summary_v54_view as
select
  coalesce(i.company, b.company) as company,
  coalesce(max(i.amount) filter (where i.line_code='net_sales'), 0) as net_sales,
  coalesce(max(i.amount) filter (where i.line_code='gross_profit'), 0) as gross_profit,
  coalesce(max(i.amount) filter (where i.line_code='net_profit'), 0) as net_profit,
  coalesce(sum(b.amount) filter (where b.line_code in ('bank_cash','bank')), 0) as cash_and_bank,
  coalesce(max(b.amount) filter (where b.line_code='moka_united'), 0) as moka_waiting,
  coalesce(max(b.amount) filter (where b.line_code='customer_receivables'), 0) as customer_receivables,
  abs(coalesce(max(b.amount) filter (where b.line_code='vendor_payables'), 0)) as vendor_payables,
  coalesce(max(b.amount) filter (where b.line_code='net_worth'), 0) as net_worth,
  max(greatest(i.updated_marker, b.updated_marker)) as last_calculated_at
from (select *, now() updated_marker from financial_income_statement_v54_view) i
full join (select *, now() updated_marker from financial_balance_sheet_v54_view) b
  on b.company = i.company
group by coalesce(i.company, b.company);

create or replace view financial_reconciliation_alerts_v54_view as
select
  company,
  'low_confidence_events' as alert_code,
  'Düşük güvenli event var' as alert_title,
  count(*)::numeric as alert_value,
  case when count(*) > 0 then 'warning' else 'ok' end as alert_level
from finance_events_v54
where confidence_score < 70 or status <> 'approved'
group by company
union all
select
  company,
  'missing_ledger_events',
  'Ledger etkisi oluşmamış event var',
  count(*)::numeric,
  case when count(*) > 0 then 'critical' else 'ok' end
from finance_events_v54 e
where status = 'approved'
  and confidence_score >= 70
  and not exists (select 1 from finance_ledger_v54 l where l.event_id = e.event_id)
group by company;

-- Demo seed is intentionally not inserted automatically.
-- Use explicit inserts in a separate seed file after review.
