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

-- BizimHesap klonunun eksik ana veri havuzlari.
create table if not exists public.masraf_raw (
  id bigserial primary key,
  firma_id text not null,
  tarih date,
  saat text,
  kategori text,
  masraf_kalemi text,
  tedarikci text,
  aciklama text,
  tutar numeric default 0,
  kdv numeric default 0,
  toplam numeric default 0,
  odeme_durumu text,
  hesap text,
  kaynak text default 'bizimhesap_masraf',
  hash text,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.customers (
  id bigserial primary key,
  firma_id text not null,
  cari_kod text,
  cari_unvan text not null,
  tip text,
  telefon text,
  email text,
  adres text,
  bakiye numeric default 0,
  bakiye_tipi text,
  risk_etiketi text,
  kaynak text default 'bizimhesap_cari',
  hash text,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.transactions (
  id bigserial primary key,
  firma_id text not null,
  tarih date,
  saat text,
  cari_unvan text,
  islem_tipi text,
  aciklama text,
  hesap text,
  borc numeric default 0,
  alacak numeric default 0,
  tutar numeric default 0,
  kaynak text default 'bizimhesap_hareket',
  hash text,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.collections_raw (
  id bigserial primary key,
  firma_id text not null,
  tarih date,
  saat text,
  cari_unvan text,
  islem_tipi text,
  hesap text,
  aciklama text,
  tutar numeric default 0,
  kaynak text default 'bizimhesap_tahsilat_odeme',
  hash text,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.stock_raw (
  id bigserial primary key,
  firma_id text not null,
  tarih date,
  urun_kod text,
  barkod text,
  urun text not null,
  kategori text,
  depo text,
  hareket_tipi text,
  miktar numeric default 0,
  birim text,
  kaynak text default 'bizimhesap_stok_hareket',
  hash text,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.purchase_raw (
  id bigserial primary key,
  firma_id text not null,
  tarih date,
  belge_no text,
  tedarikci text,
  urun_kod text,
  barkod text,
  urun text,
  kategori text,
  miktar numeric default 0,
  birim text,
  alis_fiyat numeric default 0,
  tutar numeric default 0,
  kaynak text default 'bizimhesap_alis',
  hash text,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.accounts_raw (
  id bigserial primary key,
  firma_id text not null,
  hesap_tipi text,
  hesap_adi text not null,
  para_birimi text default 'TL',
  bakiye numeric default 0,
  aktif boolean default true,
  kaynak text default 'bizimhesap_hesaplar',
  hash text,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.telegram_reminders (
  id bigserial primary key,
  firma_id text not null default 'alayli',
  chat_id text not null,
  message_id bigint,
  kategori text not null check (kategori in ('yapilacak','odenecek','tahsil_edilecek')),
  baslik text not null,
  aciklama text,
  hatirlatma_zamani timestamptz not null,
  durum text not null default 'bekliyor' check (durum in ('bekliyor','hatirlatildi','tamamlandi','iptal')),
  kaynak text default 'telegram',
  raw_text text,
  raw jsonb default '{}'::jsonb,
  bildirim_tarihi timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bot_state (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

create table if not exists public.financial_inbox (
  id bigserial primary key,
  firma_id text not null default 'alayli',
  kanal text not null default 'telegram',
  chat_id text,
  message_id bigint,
  kategori text not null default 'not' check (kategori in ('tahakkuk','dekont','ekstre','tahsilat','odeme_sozu','vade','odeme','not')),
  baslik text,
  aciklama text,
  cari_unvan text,
  tutar numeric,
  para_birimi text default 'TL',
  tarih timestamptz,
  vade_tarihi timestamptz,
  dosya_tipi text,
  file_id text,
  file_unique_id text,
  file_name text,
  mime_type text,
  onay_durumu text not null default 'bekliyor' check (onay_durumu in ('bekliyor','onaylandi','reddedildi','ogrenilecek')),
  bizimhesap_durumu text not null default 'beklemede' check (bizimhesap_durumu in ('beklemede','islenmeyecek','islenebilir','islendi','hata')),
  hash text,
  raw_text text,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists masraf_raw_firma_hash_uq on public.masraf_raw (firma_id, hash) where hash is not null;
create unique index if not exists customers_firma_hash_uq on public.customers (firma_id, hash) where hash is not null;
create unique index if not exists transactions_firma_hash_uq on public.transactions (firma_id, hash) where hash is not null;
create unique index if not exists collections_raw_firma_hash_uq on public.collections_raw (firma_id, hash) where hash is not null;
create unique index if not exists stock_raw_firma_hash_uq on public.stock_raw (firma_id, hash) where hash is not null;
create unique index if not exists purchase_raw_firma_hash_uq on public.purchase_raw (firma_id, hash) where hash is not null;
create unique index if not exists accounts_raw_firma_hash_uq on public.accounts_raw (firma_id, hash) where hash is not null;
create index if not exists telegram_reminders_due_idx on public.telegram_reminders (durum, hatirlatma_zamani);
create unique index if not exists financial_inbox_hash_uq on public.financial_inbox (hash) where hash is not null;
create index if not exists financial_inbox_status_idx on public.financial_inbox (firma_id, onay_durumu, bizimhesap_durumu, created_at);
alter table public.bot_state enable row level security;
grant select, insert, update on public.bot_state to anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['masraf_raw','customers','transactions','collections_raw','stock_raw','purchase_raw','accounts_raw','telegram_reminders','bot_state','financial_inbox']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename=t and policyname=t || ' anon all'
    ) then
      execute format('create policy %I on public.%I for all to anon using (true) with check (true)', t || ' anon all', t);
    end if;
  end loop;
end $$;

grant usage, select on all sequences in schema public to anon, authenticated;
