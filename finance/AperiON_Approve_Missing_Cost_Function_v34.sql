-- AperiON Approve Missing Product Cost Function v34
-- Purpose: approve missing unit cost, insert cost into product_costs, and mark queue ready.

create or replace function approve_missing_product_cost(
  p_queue_id bigint,
  p_approved_unit_cost numeric,
  p_note text default null
)
returns table (
  queue_id bigint,
  product_name text,
  approved_unit_cost numeric,
  result_status text
)
language plpgsql
as $$
declare
  q record;
begin
  select * into q
  from missing_product_cost_queue
  where id = p_queue_id;

  if not found then
    raise exception 'missing_product_cost_queue id not found: %', p_queue_id;
  end if;

  if p_approved_unit_cost is null or p_approved_unit_cost <= 0 then
    raise exception 'approved unit cost must be greater than zero';
  end if;

  insert into product_costs (
    company,
    product_code,
    product_name,
    category,
    cost_date,
    unit_cost,
    source_type,
    active
  ) values (
    q.company,
    q.product_code,
    q.product_name,
    null,
    coalesce(q.sale_date, current_date),
    p_approved_unit_cost,
    'missing_cost_approval',
    true
  );

  update missing_product_cost_queue
  set approved_unit_cost = p_approved_unit_cost,
      approval_status = 'approved',
      note = coalesce(p_note, note),
      approved_at = now()
  where id = p_queue_id;

  return query
  select
    q.id,
    q.product_name,
    p_approved_unit_cost,
    'ready_to_recalculate'::text;
end;
$$;

-- After approval, product_sales_profit rows with matching product_code/product_name
-- should be recalculated or re-imported by the product profit import process.
