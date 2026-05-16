-- AperiON Sales Flow Today SQL v46
-- Purpose: add TODAY-first sales flow metrics and prepare finance calendar integration.
-- Safe rule: creates views only; existing data is not changed.

-- Main period order for Sales Flow:
-- Bugün -> Dün -> Bu Hafta -> Bu Ay -> Geçen Ay -> Bu Yıl -> Geçen Yıl

create or replace view sales_flow_today_period_view as
select
  company,
  coalesce(category, 'Diger') as category,
  product_code,
  product_name,
  cari_name,
  sum(case when sale_date = current_date then quantity * unit_sale_price else 0 end) as today_sales,
  sum(case when sale_date = current_date then quantity else 0 end) as today_qty,
  sum(case when sale_date = current_date - interval '1 day' then quantity * unit_sale_price else 0 end) as yesterday_sales,
  sum(case when sale_date = current_date - interval '1 day' then quantity else 0 end) as yesterday_qty,
  sum(case when sale_date >= date_trunc('week', current_date)::date then quantity * unit_sale_price else 0 end) as week_sales,
  sum(case when sale_date >= date_trunc('week', current_date)::date then quantity else 0 end) as week_qty,
  sum(case when sale_date >= date_trunc('month', current_date)::date then quantity * unit_sale_price else 0 end) as month_sales,
  sum(case when sale_date >= date_trunc('month', current_date)::date then quantity else 0 end) as month_qty,
  sum(case when sale_date >= (date_trunc('month', current_date)::date - interval '1 month')
            and sale_date < date_trunc('month', current_date)::date then quantity * unit_sale_price else 0 end) as last_month_sales,
  sum(case when sale_date >= (date_trunc('month', current_date)::date - interval '1 month')
            and sale_date < date_trunc('month', current_date)::date then quantity else 0 end) as last_month_qty,
  sum(case when sale_date >= date_trunc('year', current_date)::date then quantity * unit_sale_price else 0 end) as year_sales,
  sum(case when sale_date >= date_trunc('year', current_date)::date then quantity else 0 end) as year_qty,
  sum(case when sale_date >= (date_trunc('year', current_date)::date - interval '1 year')
            and sale_date < date_trunc('year', current_date)::date then quantity * unit_sale_price else 0 end) as last_year_sales,
  sum(case when sale_date >= (date_trunc('year', current_date)::date - interval '1 year')
            and sale_date < date_trunc('year', current_date)::date then quantity else 0 end) as last_year_qty
from product_sales_profit
group by company, coalesce(category, 'Diger'), product_code, product_name, cari_name;

create or replace view sales_flow_kpi_today_view as
select
  company,
  sum(today_sales) as today_sales,
  sum(today_qty) as today_qty,
  sum(yesterday_sales) as yesterday_sales,
  sum(yesterday_qty) as yesterday_qty,
  sum(week_sales) as week_sales,
  sum(week_qty) as week_qty,
  sum(month_sales) as month_sales,
  sum(month_qty) as month_qty,
  sum(last_month_sales) as last_month_sales,
  sum(last_month_qty) as last_month_qty,
  sum(year_sales) as year_sales,
  sum(year_qty) as year_qty,
  sum(last_year_sales) as last_year_sales,
  sum(last_year_qty) as last_year_qty,
  case when sum(yesterday_sales) > 0 then round(((sum(today_sales) - sum(yesterday_sales)) / sum(yesterday_sales) * 100)::numeric, 2) else null end as today_vs_yesterday_percent,
  case when sum(last_month_sales) > 0 then round(((sum(month_sales) - sum(last_month_sales)) / sum(last_month_sales) * 100)::numeric, 2) else null end as month_vs_last_month_percent,
  case when sum(last_year_sales) > 0 then round(((sum(year_sales) - sum(last_year_sales)) / sum(last_year_sales) * 100)::numeric, 2) else null end as year_vs_last_year_percent
from sales_flow_today_period_view
group by company;

create or replace view sales_flow_category_today_view as
select
  company,
  category,
  sum(today_sales) as today_sales,
  sum(today_qty) as today_qty,
  sum(yesterday_sales) as yesterday_sales,
  sum(yesterday_qty) as yesterday_qty,
  sum(week_sales) as week_sales,
  sum(week_qty) as week_qty,
  sum(month_sales) as month_sales,
  sum(month_qty) as month_qty,
  sum(last_month_sales) as last_month_sales,
  sum(last_month_qty) as last_month_qty,
  sum(year_sales) as year_sales,
  sum(year_qty) as year_qty,
  sum(last_year_sales) as last_year_sales,
  sum(last_year_qty) as last_year_qty
from sales_flow_today_period_view
group by company, category;

create or replace view sales_flow_product_today_view as
select
  company,
  category,
  product_code,
  product_name,
  sum(today_sales) as today_sales,
  sum(today_qty) as today_qty,
  sum(yesterday_sales) as yesterday_sales,
  sum(yesterday_qty) as yesterday_qty,
  sum(week_sales) as week_sales,
  sum(week_qty) as week_qty,
  sum(month_sales) as month_sales,
  sum(month_qty) as month_qty,
  sum(last_month_sales) as last_month_sales,
  sum(last_month_qty) as last_month_qty,
  sum(year_sales) as year_sales,
  sum(year_qty) as year_qty,
  sum(last_year_sales) as last_year_sales,
  sum(last_year_qty) as last_year_qty
from sales_flow_today_period_view
group by company, category, product_code, product_name;

-- Sales screen mini finance summary: right-side finance calendar button/drawer can read this.
create or replace view sales_flow_finance_mini_today_view as
select
  coalesce(q.company, s.company) as company,
  coalesce(s.today_sales, 0) as today_sales,
  coalesce(s.today_qty, 0) as today_qty,
  coalesce(q.today_payable, 0) as today_payable,
  coalesce(q.today_receivable, 0) as today_receivable,
  coalesce(q.overdue_payable, 0) as overdue_payable,
  coalesce(q.overdue_receivable, 0) as overdue_receivable,
  coalesce(q.today_tasks, 0) as today_tasks,
  coalesce(q.waiting_approvals, 0) as waiting_approvals,
  coalesce(q.today_receivable, 0) - coalesce(q.today_payable, 0) as today_cash_net_expected
from sales_flow_kpi_today_view s
full join quick_control_summary_view q on q.company = s.company;
