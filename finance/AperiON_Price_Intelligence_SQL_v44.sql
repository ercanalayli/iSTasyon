-- AperiON Price Intelligence SQL v44
-- Purpose: supplier price lists from Telegram, last purchase price, market research and recommended sale price.
-- Safe rule: creates new tables/views only. Existing data is not changed.

create table if not exists supplier_price_lists (
  id bigserial primary key,
  company text not null default 'ALAYLI',
  supplier_name text,
  list_date date default current_date,
  valid_from date,
  valid_until date,
  source_type text default 'telegram', -- telegram, manual, excel, pdf, image, web
  source_file_name text,
  telegram_message_id text,
  currency text default 'TRY',
  vat_included boolean,
  note text,
  import_status text default 'raw', -- raw, parsed, reviewed, approved, rejected
  created_at timestamptz default now()
);

create table if not exists supplier_price_items (
  id bigserial primary key,
  price_list_id bigint references supplier_price_lists(id) on delete cascade,
  company text not null default 'ALAYLI',
  supplier_name text,
  supplier_product_code text,
  supplier_product_name text not null,
  normalized_product_name text,
  matched_product_code text,
  matched_product_name text,
  match_confidence integer default 0,
  package_info text,
  unit text,
  supplier_price numeric(18,4) not null default 0,
  discount_rate numeric(9,4) default 0,
  net_supplier_price numeric(18,4),
  currency text default 'TRY',
  vat_included boolean,
  price_date date default current_date,
  approval_status text default 'waiting', -- waiting, matched, new_product, rejected, approved
  note text,
  created_at timestamptz default now()
);

create table if not exists product_purchase_prices (
  id bigserial primary key,
  company text not null default 'ALAYLI',
  purchase_date date not null,
  supplier_name text,
  invoice_no text,
  product_code text,
  product_name text not null,
  quantity numeric(18,4) default 0,
  unit_purchase_price numeric(18,4) not null default 0,
  currency text default 'TRY',
  source_type text default 'bizimhesap',
  created_at timestamptz default now()
);

create table if not exists market_price_research (
  id bigserial primary key,
  company text not null default 'ALAYLI',
  product_code text,
  product_name text not null,
  query_text text,
  research_date timestamptz default now(),
  source_name text,
  source_url text,
  market_price numeric(18,4) not null default 0,
  currency text default 'TRY',
  availability text,
  confidence_score integer default 0,
  note text,
  created_at timestamptz default now()
);

create table if not exists product_price_policy (
  id bigserial primary key,
  company text not null default 'ALAYLI',
  category text,
  product_code text,
  product_name text,
  target_margin_rate numeric(9,4) default 0.25,
  min_margin_rate numeric(9,4) default 0.15,
  moka_pos_rate numeric(9,4) default 0.035,
  overhead_rate numeric(9,4) default 0.08,
  logistics_unit_share numeric(18,4) default 0,
  rounding_rule text default 'nearest_10',
  active boolean default true,
  created_at timestamptz default now()
);

-- Latest supplier item per product
create or replace view latest_supplier_price_view as
select distinct on (company, coalesce(matched_product_code,''), coalesce(matched_product_name, normalized_product_name, supplier_product_name))
  company,
  supplier_name,
  matched_product_code as product_code,
  coalesce(matched_product_name, normalized_product_name, supplier_product_name) as product_name,
  supplier_product_name,
  supplier_price,
  coalesce(net_supplier_price, supplier_price * (1 - coalesce(discount_rate,0))) as net_supplier_price,
  currency,
  price_date,
  price_list_id,
  approval_status,
  match_confidence
from supplier_price_items
where approval_status in ('matched','approved')
order by company, coalesce(matched_product_code,''), coalesce(matched_product_name, normalized_product_name, supplier_product_name), price_date desc, id desc;

-- Previous supplier item per product for price increase/decrease comparison
create or replace view previous_supplier_price_view as
with ranked as (
  select
    *,
    row_number() over (partition by company, coalesce(matched_product_code,''), coalesce(matched_product_name, normalized_product_name, supplier_product_name) order by price_date desc, id desc) as rn
  from supplier_price_items
  where approval_status in ('matched','approved')
)
select
  company,
  matched_product_code as product_code,
  coalesce(matched_product_name, normalized_product_name, supplier_product_name) as product_name,
  supplier_name,
  supplier_price as previous_supplier_price,
  coalesce(net_supplier_price, supplier_price * (1 - coalesce(discount_rate,0))) as previous_net_supplier_price,
  price_date as previous_price_date
from ranked
where rn = 2;

-- Latest real purchase price from BizimHesap/purchase records
create or replace view latest_purchase_price_view as
select distinct on (company, coalesce(product_code,''), product_name)
  company,
  product_code,
  product_name,
  supplier_name as last_purchase_supplier,
  purchase_date as last_purchase_date,
  unit_purchase_price as last_purchase_price,
  invoice_no
from product_purchase_prices
order by company, coalesce(product_code,''), product_name, purchase_date desc, id desc;

-- Purchase averages
create or replace view purchase_price_average_view as
select
  company,
  product_code,
  product_name,
  avg(unit_purchase_price) filter (where purchase_date >= current_date - interval '12 months') as avg_purchase_12m,
  min(unit_purchase_price) filter (where purchase_date >= current_date - interval '12 months') as min_purchase_12m,
  max(unit_purchase_price) filter (where purchase_date >= current_date - interval '12 months') as max_purchase_12m,
  count(*) filter (where purchase_date >= current_date - interval '12 months') as purchase_count_12m
from product_purchase_prices
group by company, product_code, product_name;

-- Market price summary
create or replace view market_price_summary_view as
select
  company,
  product_code,
  product_name,
  max(research_date) as last_market_research_at,
  min(market_price) as market_min_price,
  max(market_price) as market_max_price,
  avg(market_price) as market_avg_price,
  percentile_cont(0.5) within group (order by market_price) as market_median_price,
  count(*) as market_result_count
from market_price_research
where research_date >= now() - interval '30 days'
  and market_price > 0
group by company, product_code, product_name;

-- Product price intelligence final view
create or replace view product_price_intelligence_view as
with base_products as (
  select company, product_code, product_name from latest_purchase_price_view
  union
  select company, product_code, product_name from latest_supplier_price_view
  union
  select company, product_code, product_name from market_price_summary_view
), policy as (
  select distinct on (company, coalesce(product_code,''), coalesce(product_name,'')) *
  from product_price_policy
  where active = true
  order by company, coalesce(product_code,''), coalesce(product_name,''), id desc
)
select
  b.company,
  b.product_code,
  b.product_name,
  lp.last_purchase_supplier,
  lp.last_purchase_date,
  lp.last_purchase_price,
  ls.supplier_name as last_supplier_name,
  ls.price_date as last_supplier_price_date,
  ls.net_supplier_price as last_supplier_price,
  ps.previous_net_supplier_price as previous_supplier_price,
  case when ps.previous_net_supplier_price > 0 then round(((ls.net_supplier_price - ps.previous_net_supplier_price) / ps.previous_net_supplier_price * 100)::numeric, 2) else null end as supplier_price_change_percent,
  pa.avg_purchase_12m,
  pa.min_purchase_12m,
  pa.max_purchase_12m,
  ms.market_min_price,
  ms.market_max_price,
  ms.market_avg_price,
  ms.market_median_price,
  ms.last_market_research_at,
  greatest(coalesce(lp.last_purchase_price,0), coalesce(ls.net_supplier_price,0), coalesce(pa.avg_purchase_12m,0)) as base_cost,
  coalesce(pol.target_margin_rate, 0.25) as target_margin_rate,
  coalesce(pol.min_margin_rate, 0.15) as min_margin_rate,
  coalesce(pol.moka_pos_rate, 0.035) as moka_pos_rate,
  coalesce(pol.overhead_rate, 0.08) as overhead_rate,
  coalesce(pol.logistics_unit_share, 0) as logistics_unit_share,
  round((greatest(coalesce(lp.last_purchase_price,0), coalesce(ls.net_supplier_price,0), coalesce(pa.avg_purchase_12m,0)) * (1 + coalesce(pol.overhead_rate,0.08) + coalesce(pol.moka_pos_rate,0.035)) + coalesce(pol.logistics_unit_share,0))::numeric, 2) as minimum_sale_price,
  round(((greatest(coalesce(lp.last_purchase_price,0), coalesce(ls.net_supplier_price,0), coalesce(pa.avg_purchase_12m,0)) * (1 + coalesce(pol.overhead_rate,0.08) + coalesce(pol.moka_pos_rate,0.035)) + coalesce(pol.logistics_unit_share,0)) / nullif(1 - coalesce(pol.target_margin_rate,0.25), 0))::numeric, 2) as recommended_sale_price,
  case
    when greatest(coalesce(lp.last_purchase_price,0), coalesce(ls.net_supplier_price,0), coalesce(pa.avg_purchase_12m,0)) = 0 then 'missing_cost'
    when ps.previous_net_supplier_price > 0 and ls.net_supplier_price > ps.previous_net_supplier_price * 1.10 then 'supplier_price_increased'
    when ms.market_avg_price > 0 and ((greatest(coalesce(lp.last_purchase_price,0), coalesce(ls.net_supplier_price,0), coalesce(pa.avg_purchase_12m,0)) * (1 + coalesce(pol.overhead_rate,0.08) + coalesce(pol.moka_pos_rate,0.035)) + coalesce(pol.logistics_unit_share,0)) / nullif(1 - coalesce(pol.target_margin_rate,0.25), 0)) > ms.market_avg_price * 1.15 then 'above_market_warning'
    else 'ok'
  end as price_status
from base_products b
left join latest_purchase_price_view lp on lp.company=b.company and coalesce(lp.product_code,'')=coalesce(b.product_code,'') and lp.product_name=b.product_name
left join latest_supplier_price_view ls on ls.company=b.company and coalesce(ls.product_code,'')=coalesce(b.product_code,'') and ls.product_name=b.product_name
left join previous_supplier_price_view ps on ps.company=b.company and coalesce(ps.product_code,'')=coalesce(b.product_code,'') and ps.product_name=b.product_name
left join purchase_price_average_view pa on pa.company=b.company and coalesce(pa.product_code,'')=coalesce(b.product_code,'') and pa.product_name=b.product_name
left join market_price_summary_view ms on ms.company=b.company and coalesce(ms.product_code,'')=coalesce(b.product_code,'') and ms.product_name=b.product_name
left join policy pol on pol.company=b.company and (coalesce(pol.product_code,'')=coalesce(b.product_code,'') or pol.product_code is null) and (pol.product_name=b.product_name or pol.product_name is null);

create index if not exists idx_supplier_price_lists_company_date on supplier_price_lists(company, list_date);
create index if not exists idx_supplier_price_items_match on supplier_price_items(company, matched_product_code, matched_product_name, price_date);
create index if not exists idx_product_purchase_prices_lookup on product_purchase_prices(company, product_code, product_name, purchase_date);
create index if not exists idx_market_price_research_lookup on market_price_research(company, product_code, product_name, research_date);
