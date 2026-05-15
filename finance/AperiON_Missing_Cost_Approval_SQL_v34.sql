-- AperiON Missing Cost Approval SQL v34
-- Product sales with missing unit cost go to approval/control center.

create table if not exists missing_product_cost_queue (
  id bigserial primary key,
  company text not null,
  sale_date date,
  invoice_no text,
  cari_name text,
  product_code text,
  product_name text not null,
  quantity numeric(18,4) default 0,
  unit_sale_price numeric(18,4) default 0,
  sales_amount numeric(18,2) default 0,
  suggested_unit_cost numeric(18,4),
  approved_unit_cost numeric(18,4),
  approval_status text default 'waiting',
  note text,
  created_at timestamptz default now(),
  approved_at timestamptz
);

create or replace view missing_product_cost_queue_view as
select
  *,
  case
    when approval_status = 'approved' and approved_unit_cost > 0 then 'ready_to_recalculate'
    when approval_status = 'rejected' then 'rejected'
    else 'waiting_cost_approval'
  end as control_status
from missing_product_cost_queue;

create index if not exists idx_missing_product_cost_queue_status on missing_product_cost_queue(company, approval_status);
create index if not exists idx_missing_product_cost_queue_product on missing_product_cost_queue(company, product_name);

-- Workflow:
-- 1 product_sales_profit_view cost_status = cost_missing rows are copied here.
-- 2 User enters approved_unit_cost.
-- 3 approved_unit_cost is inserted into product_costs.
-- 4 product_sales_profit row is recalculated.
-- 5 daily profit closing can continue.
