-- AperiON Product Profit v34

create table if not exists product_costs (
  id bigserial primary key,
  company text not null,
  product_code text,
  product_name text not null,
  category text,
  cost_date date not null,
  unit_cost numeric(18,4) not null default 0,
  source_type text default 'manual',
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists product_sales_profit (
  id bigserial primary key,
  company text not null,
  sale_date date not null,
  invoice_no text,
  cari_name text,
  product_code text,
  product_name text not null,
  quantity numeric(18,4) not null default 0,
  unit_sale_price numeric(18,4) not null default 0,
  unit_cost numeric(18,4) not null default 0,
  sales_amount numeric(18,2) generated always as (quantity * unit_sale_price) stored,
  cogs_amount numeric(18,2) generated always as (quantity * unit_cost) stored,
  gross_profit numeric(18,2) generated always as ((quantity * unit_sale_price) - (quantity * unit_cost)) stored,
  dynamic_expense_share numeric(18,2) not null default 0,
  variable_expense numeric(18,2) not null default 0,
  net_profit numeric(18,2) generated always as (((quantity * unit_sale_price) - (quantity * unit_cost)) - dynamic_expense_share - variable_expense) stored,
  profit_status text default 'estimate',
  created_at timestamptz default now()
);

create or replace view product_sales_profit_view as
select
  *,
  case when sales_amount > 0 then round((net_profit / sales_amount) * 100, 2) else 0 end as net_margin,
  case when unit_cost = 0 then 'cost_missing' else 'cost_ok' end as cost_status
from product_sales_profit;

create index if not exists idx_product_costs_lookup on product_costs(company, product_name, cost_date);
create index if not exists idx_product_sales_profit_date on product_sales_profit(company, sale_date);
