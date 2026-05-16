-- AperiON Stock Coverage v37
-- Purpose: show how many months of stock remain based on last 12 months sales quantity.

create table if not exists product_stock_snapshot (
  id bigserial primary key,
  company text not null,
  snapshot_date date not null default current_date,
  product_code text,
  product_name text not null,
  category text,
  stock_qty numeric(18,4) not null default 0,
  source_type text default 'manual',
  created_at timestamptz default now()
);

create table if not exists product_sales_qty_history (
  id bigserial primary key,
  company text not null,
  sale_date date not null,
  product_code text,
  product_name text not null,
  category text,
  quantity numeric(18,4) not null default 0,
  source_type text default 'bizimhesap',
  created_at timestamptz default now()
);

create or replace view product_stock_coverage_12m_view as
with last_stock as (
  select distinct on (company, coalesce(product_code,''), product_name)
    company,
    product_code,
    product_name,
    category,
    stock_qty,
    snapshot_date
  from product_stock_snapshot
  order by company, coalesce(product_code,''), product_name, snapshot_date desc, id desc
), sales_12m as (
  select
    company,
    product_code,
    product_name,
    sum(quantity) as sales_qty_12m,
    sum(quantity) / 12.0 as avg_monthly_sales_qty
  from product_sales_qty_history
  where sale_date >= current_date - interval '12 months'
  group by company, product_code, product_name
)
select
  s.company,
  s.product_code,
  s.product_name,
  s.category,
  s.stock_qty,
  coalesce(x.sales_qty_12m,0) as sales_qty_12m,
  coalesce(x.avg_monthly_sales_qty,0) as avg_monthly_sales_qty,
  case
    when coalesce(x.avg_monthly_sales_qty,0) = 0 and s.stock_qty > 0 then null
    when coalesce(x.avg_monthly_sales_qty,0) = 0 then 0
    else round((s.stock_qty / x.avg_monthly_sales_qty)::numeric, 2)
  end as stock_months_left,
  case
    when coalesce(x.avg_monthly_sales_qty,0) = 0 and s.stock_qty > 0 then 'no_sales_12m'
    when s.stock_qty <= 0 then 'out_of_stock'
    when (s.stock_qty / nullif(x.avg_monthly_sales_qty,0)) < 1 then 'critical_under_1_month'
    when (s.stock_qty / nullif(x.avg_monthly_sales_qty,0)) < 3 then 'low_under_3_months'
    when (s.stock_qty / nullif(x.avg_monthly_sales_qty,0)) > 12 then 'overstock_over_12_months'
    else 'ok'
  end as stock_status,
  s.snapshot_date
from last_stock s
left join sales_12m x
  on x.company = s.company
 and coalesce(x.product_code,'') = coalesce(s.product_code,'')
 and x.product_name = s.product_name;

create index if not exists idx_product_stock_snapshot_lookup on product_stock_snapshot(company, product_name, snapshot_date);
create index if not exists idx_product_sales_qty_history_lookup on product_sales_qty_history(company, product_name, sale_date);
