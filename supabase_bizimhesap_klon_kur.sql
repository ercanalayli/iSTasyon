-- AperiON / BizimHesap klon veri altyapisi
-- Supabase SQL Editor'de tek parca calistir.

grant usage on schema public to anon, authenticated;

do $$
begin
  if to_regclass('public.audit_logs') is not null then
    execute 'alter table public.audit_logs enable row level security';
    execute 'grant select, insert on public.audit_logs to anon, authenticated';

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='audit_logs' and policyname='audit_logs anon insert'
    ) then
      create policy "audit_logs anon insert"
      on public.audit_logs for insert
      to anon
      with check (true);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='audit_logs' and policyname='audit_logs anon read'
    ) then
      create policy "audit_logs anon read"
      on public.audit_logs for select
      to anon
      using (true);
    end if;
  end if;
end $$;

create table if not exists public.bizimhesap_events (
  id bigserial primary key,
  firma_id text not null,
  tarih date,
  saat text,
  aciklama text not null,
  tur text,
  kaynak text default 'bizimhesap_son_islemler',
  raw_text text,
  hash text not null unique,
  resync_gerekli boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.bizimhesap_events enable row level security;
grant select, insert, update on public.bizimhesap_events to anon, authenticated;
grant usage, select on sequence public.bizimhesap_events_id_seq to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bizimhesap_events' and policyname='bizimhesap_events anon read') then
    create policy "bizimhesap_events anon read" on public.bizimhesap_events for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bizimhesap_events' and policyname='bizimhesap_events anon write') then
    create policy "bizimhesap_events anon write" on public.bizimhesap_events for insert to anon with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bizimhesap_events' and policyname='bizimhesap_events anon update') then
    create policy "bizimhesap_events anon update" on public.bizimhesap_events for update to anon using (true) with check (true);
  end if;
end $$;

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

create unique index if not exists product_raw_firma_hash_uq on public.product_raw (firma_id, satir_hash);
alter table public.product_raw enable row level security;
grant select, insert, update, delete on public.product_raw to anon, authenticated;
grant usage, select on sequence public.product_raw_id_seq to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_raw' and policyname='product_raw anon read') then
    create policy "product_raw anon read" on public.product_raw for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_raw' and policyname='product_raw anon write') then
    create policy "product_raw anon write" on public.product_raw for all to anon using (true) with check (true);
  end if;
end $$;

create table if not exists public.banka_raw (
  id bigserial primary key,
  firma_id text not null,
  kaynak_banka text,
  kaynak_dosya text,
  tarih date not null,
  saat time,
  aciklama text not null,
  tutar numeric(14,2) not null,
  bakiye numeric(14,2),
  yon text not null check (yon in ('giris','cikis')),
  islem_tipi text,
  hash text not null,
  aday_kategori text,
  aday_cari text,
  aday_islem_tipi text,
  durum text not null default 'onay_bekliyor' check (durum in ('islenecek','islenmeyecek','onay_bekliyor','islendi')),
  guven integer not null default 0 check (guven between 0 and 100),
  risk text,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists banka_raw_hash_idx on public.banka_raw (firma_id, hash);
create index if not exists banka_raw_durum_idx on public.banka_raw (firma_id, durum, tarih);
alter table public.banka_raw enable row level security;
grant select, insert, update, delete on public.banka_raw to anon, authenticated;
grant usage, select on sequence public.banka_raw_id_seq to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='banka_raw' and policyname='banka_raw anon all') then
    create policy "banka_raw anon all" on public.banka_raw for all to anon using (true) with check (true);
  end if;
end $$;
