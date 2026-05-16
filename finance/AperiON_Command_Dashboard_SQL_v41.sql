-- AperiON Command Dashboard SQL v41
-- Purpose: first screen metrics for sales, collections, receivables, payments, payables, expenses and category drilldowns.
-- Safe rule: views only. Existing data is not changed.

-- 1) Expected collections / receivables
create table if not exists finance_receivables (
  id bigserial primary key,
  company text not null,
  cari_name text not null,
  document_no text,
  due_date date not null,
  period_month date,
  description text,
  expected_amount numeric(18,2) not null default 0,
  collected_amount numeric(18,2) not null default 0,
  status text default 'open',
  source_type text default 'manual',
  created_at timestamptz default now()
);

-- 2) Collections actually received
create table if not exists finance_collections (
  id bigserial primary key,
  company text not null,
  collection_date date not null,
  cari_name text,
  document_no text,
  account_name text,
  description text,
  amount numeric(18,2) not null default 0,
  source_type text default 'bank_moka_manual',
  created_at timestamptz default now()
);

-- 3) Expected payments / payables
create table if not exists finance_payables (
  id bigserial primary key,
  company text not null,
  supplier_name text not null,
  document_no text,
  due_date date not null,
  period_month date,
  category_code text,
  description text,
  expected_amount numeric(18,2) not null default 0,
  paid_amount numeric(18,2) not null default 0,
  status text default 'open',
  source_type text default 'manual',
  created_at timestamptz default now()
);

-- 4) Payments actually paid
create table if not exists finance_payments (
  id bigserial primary key,
  company text not null,
  payment_date date not null,
  supplier_name text,
  document_no text,
  account_name text,
  category_code text,
  description text,
  amount numeric(18,2) not null default 0,
  source_type text default 'bank_card_manual',
  created_at timestamptz default now()
);

-- 5) Unified period sales metrics from product_sales_profit
create or replace view command_sales_period_view as
select
  company,
  sum(case when sale_date = current_date then quantity * unit_sale_price else 0 end) as today_sales,
  sum(case when sale_date = current_date - interval '1 day' then quantity * unit_sale_price else 0 end) as yesterday_sales,
  sum(case when sale_date >= date_trunc('week', current_date)::date then quantity * unit_sale_price else 0 end) as week_sales,
  sum(case when sale_date >= date_trunc('month', current_date)::date then quantity * unit_sale_price else 0 end) as month_sales,
  sum(case when sale_date >= date_trunc('year', current_date)::date then quantity * unit_sale_price else 0 end) as year_sales,
  sum(case when sale_date >= (date_trunc('month', current_date)::date - interval '1 month')
            and sale_date < date_trunc('month', current_date)::date then quantity * unit_sale_price else 0 end) as last_month_sales,
  sum(case when sale_date >= (date_trunc('year', current_date)::date - interval '1 year')
            and sale_date < date_trunc('year', current_date)::date then quantity * unit_sale_price else 0 end) as last_year_sales
from product_sales_profit
group by company;

-- 6) Collections period metrics
create or replace view command_collection_period_view as
select
  company,
  sum(case when collection_date = current_date then amount else 0 end) as today_collection,
  sum(case when collection_date = current_date - interval '1 day' then amount else 0 end) as yesterday_collection,
  sum(case when collection_date >= date_trunc('week', current_date)::date then amount else 0 end) as week_collection,
  sum(case when collection_date >= date_trunc('month', current_date)::date then amount else 0 end) as month_collection,
  sum(case when collection_date >= date_trunc('year', current_date)::date then amount else 0 end) as year_collection
from finance_collections
group by company;

-- 7) Expected receivables metrics
create or replace view command_receivable_period_view as
select
  company,
  sum(case when due_date <= current_date then greatest(expected_amount - collected_amount, 0) else 0 end) as due_receivable_until_today,
  sum(case when due_date >= date_trunc('month', current_date)::date
            and due_date < (date_trunc('month', current_date)::date + interval '1 month') then greatest(expected_amount - collected_amount, 0) else 0 end) as month_receivable,
  sum(case when due_date >= date_trunc('year', current_date)::date
            and due_date < (date_trunc('year', current_date)::date + interval '1 year') then greatest(expected_amount - collected_amount, 0) else 0 end) as year_receivable,
  sum(greatest(expected_amount - collected_amount, 0)) as total_receivable
from finance_receivables
where status <> 'closed'
group by company;

-- 8) Payments period metrics
create or replace view command_payment_period_view as
select
  company,
  sum(case when payment_date = current_date then amount else 0 end) as today_payment,
  sum(case when payment_date = current_date - interval '1 day' then amount else 0 end) as yesterday_payment,
  sum(case when payment_date >= date_trunc('week', current_date)::date then amount else 0 end) as week_payment,
  sum(case when payment_date >= date_trunc('month', current_date)::date then amount else 0 end) as month_payment,
  sum(case when payment_date >= date_trunc('year', current_date)::date then amount else 0 end) as year_payment
from finance_payments
group by company;

-- 9) Expected payables metrics
create or replace view command_payable_period_view as
select
  company,
  sum(case when due_date <= current_date then greatest(expected_amount - paid_amount, 0) else 0 end) as due_payable_until_today,
  sum(case when due_date >= date_trunc('month', current_date)::date
            and due_date < (date_trunc('month', current_date)::date + interval '1 month') then greatest(expected_amount - paid_amount, 0) else 0 end) as month_payable,
  sum(case when due_date >= date_trunc('year', current_date)::date
            and due_date < (date_trunc('year', current_date)::date + interval '1 year') then greatest(expected_amount - paid_amount, 0) else 0 end) as year_payable,
  sum(greatest(expected_amount - paid_amount, 0)) as total_payable
from finance_payables
where status <> 'closed'
group by company;

-- 10) Expense period metrics from expense_classified_view
create or replace view command_expense_period_view as
select
  company,
  sum(case when expense_date = current_date then amount else 0 end) as today_expense,
  sum(case when expense_date = current_date - interval '1 day' then amount else 0 end) as yesterday_expense,
  sum(case when expense_date >= date_trunc('week', current_date)::date then amount else 0 end) as week_expense,
  sum(case when expense_date >= date_trunc('month', current_date)::date then amount else 0 end) as month_expense,
  sum(case when expense_date >= date_trunc('year', current_date)::date then amount else 0 end) as year_expense,
  sum(case when expense_date >= (date_trunc('month', current_date)::date - interval '1 month')
            and expense_date < date_trunc('month', current_date)::date then amount else 0 end) as last_month_expense,
  sum(case when expense_date >= (date_trunc('year', current_date)::date - interval '1 year')
            and expense_date < date_trunc('year', current_date)::date then amount else 0 end) as last_year_expense
from expense_classified_view
group by company;

-- 11) Category sales drilldown
create or replace view command_sales_category_view as
select
  company,
  coalesce(category, 'Diger') as category,
  sum(case when sale_date = current_date then quantity * unit_sale_price else 0 end) as today_sales,
  sum(case when sale_date >= date_trunc('month', current_date)::date then quantity * unit_sale_price else 0 end) as month_sales,
  sum(case when sale_date >= date_trunc('year', current_date)::date then quantity * unit_sale_price else 0 end) as year_sales,
  sum(quantity * unit_sale_price) as total_sales
from product_sales_profit
group by company, coalesce(category, 'Diger');

-- 12) Expense shares by category
create or replace view command_expense_share_view as
with sales_month as (
  select company, sum(quantity * unit_sale_price) as month_sales
  from product_sales_profit
  where sale_date >= date_trunc('month', current_date)::date
  group by company
), expenses as (
  select company, coalesce(category_name, matched_category_code, 'OTHER') as expense_category, sum(amount) as month_expense
  from expense_classified_view
  where expense_date >= date_trunc('month', current_date)::date
  group by company, coalesce(category_name, matched_category_code, 'OTHER')
)
select
  e.company,
  e.expense_category,
  e.month_expense,
  case when s.month_sales > 0 then round((e.month_expense / s.month_sales * 100)::numeric, 2) else 0 end as sales_share_percent
from expenses e
left join sales_month s on s.company = e.company;

-- 13) Full command dashboard one-row view
create or replace view command_dashboard_summary_view as
select
  coalesce(s.company, c.company, r.company, p.company, py.company, e.company) as company,
  coalesce(s.today_sales,0) as today_sales,
  coalesce(s.yesterday_sales,0) as yesterday_sales,
  coalesce(s.week_sales,0) as week_sales,
  coalesce(s.month_sales,0) as month_sales,
  coalesce(s.year_sales,0) as year_sales,
  coalesce(s.last_month_sales,0) as last_month_sales,
  coalesce(s.last_year_sales,0) as last_year_sales,
  coalesce(c.today_collection,0) as today_collection,
  coalesce(c.yesterday_collection,0) as yesterday_collection,
  coalesce(c.week_collection,0) as week_collection,
  coalesce(c.month_collection,0) as month_collection,
  coalesce(c.year_collection,0) as year_collection,
  coalesce(r.due_receivable_until_today,0) as due_receivable_until_today,
  coalesce(r.month_receivable,0) as month_receivable,
  coalesce(r.year_receivable,0) as year_receivable,
  coalesce(r.total_receivable,0) as total_receivable,
  coalesce(p.today_payment,0) as today_payment,
  coalesce(p.yesterday_payment,0) as yesterday_payment,
  coalesce(p.week_payment,0) as week_payment,
  coalesce(p.month_payment,0) as month_payment,
  coalesce(p.year_payment,0) as year_payment,
  coalesce(py.due_payable_until_today,0) as due_payable_until_today,
  coalesce(py.month_payable,0) as month_payable,
  coalesce(py.year_payable,0) as year_payable,
  coalesce(py.total_payable,0) as total_payable,
  coalesce(e.today_expense,0) as today_expense,
  coalesce(e.yesterday_expense,0) as yesterday_expense,
  coalesce(e.week_expense,0) as week_expense,
  coalesce(e.month_expense,0) as month_expense,
  coalesce(e.year_expense,0) as year_expense,
  coalesce(e.last_month_expense,0) as last_month_expense,
  coalesce(e.last_year_expense,0) as last_year_expense
from command_sales_period_view s
full join command_collection_period_view c on c.company = s.company
full join command_receivable_period_view r on r.company = coalesce(s.company, c.company)
full join command_payment_period_view p on p.company = coalesce(s.company, c.company, r.company)
full join command_payable_period_view py on py.company = coalesce(s.company, c.company, r.company, p.company)
full join command_expense_period_view e on e.company = coalesce(s.company, c.company, r.company, p.company, py.company);

create index if not exists idx_finance_receivables_company_due on finance_receivables(company, due_date);
create index if not exists idx_finance_collections_company_date on finance_collections(company, collection_date);
create index if not exists idx_finance_payables_company_due on finance_payables(company, due_date);
create index if not exists idx_finance_payments_company_date on finance_payments(company, payment_date);
