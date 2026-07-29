create extension if not exists pgcrypto;

create table if not exists public.purchase_raw (
  id uuid primary key default gen_random_uuid(),
  firma_id text not null,
  tarih date not null,
  belge_no text not null,
  tedarikci text not null default '',
  urun_kod text not null default '',
  barkod text not null default '',
  urun text not null,
  kategori text not null default '',
  miktar numeric not null default 0,
  birim text not null default '',
  alis_fiyat numeric not null default 0,
  tutar numeric not null default 0,
  kaynak text not null,
  hash text not null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firma_id, hash)
);
create table if not exists public.stock_raw (
  id uuid primary key default gen_random_uuid(),
  firma_id text not null,
  tarih date not null,
  urun_kod text not null default '',
  barkod text not null default '',
  urun text not null,
  kategori text not null default '',
  depo text not null default '',
  hareket_tipi text not null,
  miktar numeric not null default 0,
  birim text not null default '',
  kaynak text not null,
  hash text not null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firma_id, hash)
);
create index if not exists purchase_raw_firma_tarih_idx on public.purchase_raw (firma_id, tarih desc);
create index if not exists purchase_raw_product_idx on public.purchase_raw (firma_id, urun_kod, urun);
create index if not exists stock_raw_firma_tarih_idx on public.stock_raw (firma_id, tarih desc);
create index if not exists stock_raw_product_idx on public.stock_raw (firma_id, urun_kod, urun);
alter table public.purchase_raw enable row level security;
alter table public.stock_raw enable row level security;
comment on table public.purchase_raw is 'Verified BizimHesap purchase invoice lines. Service-role writes only.';
comment on table public.stock_raw is 'BizimHesap stock snapshots and movements. Service-role writes only.';
