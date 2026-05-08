create table if not exists public.product_raw (
  id bigserial primary key,
  firma_id text not null,
  firma_adi text,
  depo text,
  urun_kod text,
  barkod text,
  urun text not null,
  marka text,
  kategori text,
  alis_fiyat numeric default 0,
  satis_fiyat numeric default 0,
  kdv numeric default 0,
  raf text,
  miktar numeric default 0,
  birim text,
  etiket text,
  kaynak text default 'bizimhesap_stok',
  satir_hash text not null,
  raw jsonb,
  cekilme_tarihi timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists product_raw_firma_hash_uq
on public.product_raw (firma_id, satir_hash);

alter table public.product_raw enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='product_raw' and policyname='product_raw anon read'
  ) then
    create policy "product_raw anon read"
    on public.product_raw for select
    to anon
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='product_raw' and policyname='product_raw anon write'
  ) then
    create policy "product_raw anon write"
    on public.product_raw for all
    to anon
    using (true)
    with check (true);
  end if;
end $$;

