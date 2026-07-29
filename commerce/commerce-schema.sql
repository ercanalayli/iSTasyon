create table if not exists commerce_products (
  id uuid primary key default gen_random_uuid(), firma_id text not null default 'alayli', product_key text not null,
  bizimhesap_id text, barcode text, sku text, name text not null, brand text, category text,
  cost numeric(14,2), vat_rate numeric(5,2), stock numeric(14,3), sale_price numeric(14,2),
  publish_status text not null default 'draft' check (publish_status in ('draft','review','published','blocked')),
  source_updated_at timestamptz, updated_at timestamptz not null default now(), unique(firma_id, product_key)
);
create table if not exists commerce_market_offers (
  id uuid primary key default gen_random_uuid(), firma_id text not null default 'alayli', product_key text not null,
  merchant text not null, url text not null, price numeric(14,2) not null, in_stock boolean,
  evidence_hash text not null, observed_at timestamptz not null, raw jsonb not null default '{}'::jsonb,
  unique(firma_id, product_key, merchant, evidence_hash)
);
create table if not exists commerce_price_decisions (
  id uuid primary key default gen_random_uuid(), firma_id text not null default 'alayli', product_key text not null,
  current_price numeric(14,2), recommended_price numeric(14,2), expected_margin numeric(8,4), evidence jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  approved_by text, approved_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists commerce_sync_queue (
  id uuid primary key default gen_random_uuid(), firma_id text not null default 'alayli', direction text not null,
  entity_type text not null, entity_key text not null, operation text not null, payload jsonb not null,
  status text not null default 'pending_approval' check (status in ('pending_approval','approved','processing','done','failed','rejected')),
  idempotency_key text not null unique, approved_by text, approved_at timestamptz, created_at timestamptz not null default now()
);
alter table commerce_products enable row level security;
alter table commerce_market_offers enable row level security;
alter table commerce_price_decisions enable row level security;
alter table commerce_sync_queue enable row level security;
