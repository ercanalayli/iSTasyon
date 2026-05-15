-- AperiON Recalculate Product Profit Function v34
-- Purpose: after missing cost approval, update product_sales_profit rows with the approved/latest product cost.

create or replace function recalculate_product_profit_for_product(
  p_company text,
  p_product_code text default null,
  p_product_name text default null
)
returns table (
  updated_rows integer,
  result_status text
)
language plpgsql
as $$
declare
  v_count integer := 0;
begin
  if coalesce(p_product_code, '') = '' and coalesce(p_product_name, '') = '' then
    raise exception 'product_code or product_name is required';
  end if;

  with latest_cost as (
    select distinct on (company, coalesce(product_code,''), product_name)
      company,
      product_code,
      product_name,
      unit_cost,
      cost_date
    from product_costs
    where company = p_company
      and active = true
      and (
        (p_product_code is not null and product_code = p_product_code)
        or
        (p_product_name is not null and product_name = p_product_name)
      )
    order by company, coalesce(product_code,''), product_name, cost_date desc, id desc
  )
  update product_sales_profit p
  set unit_cost = lc.unit_cost,
      profit_status = 'recalculated'
  from latest_cost lc
  where p.company = lc.company
    and (
      (p_product_code is not null and p.product_code = lc.product_code)
      or
      (p_product_name is not null and p.product_name = lc.product_name)
    )
    and (p.unit_cost = 0 or p.profit_status in ('cost_missing','estimate','recalculated'));

  get diagnostics v_count = row_count;

  return query select v_count, 'recalculated'::text;
end;
$$;

create or replace function approve_and_recalculate_missing_product_cost(
  p_queue_id bigint,
  p_approved_unit_cost numeric,
  p_note text default null
)
returns table (
  queue_id bigint,
  product_name text,
  approved_unit_cost numeric,
  updated_rows integer,
  result_status text
)
language plpgsql
as $$
declare
  q record;
  r record;
begin
  select * into q
  from missing_product_cost_queue
  where id = p_queue_id;

  if not found then
    raise exception 'missing_product_cost_queue id not found: %', p_queue_id;
  end if;

  perform approve_missing_product_cost(p_queue_id, p_approved_unit_cost, p_note);

  select * into r
  from recalculate_product_profit_for_product(q.company, q.product_code, q.product_name)
  limit 1;

  return query
  select
    q.id,
    q.product_name,
    p_approved_unit_cost,
    coalesce(r.updated_rows, 0),
    'approved_and_recalculated'::text;
end;
$$;
