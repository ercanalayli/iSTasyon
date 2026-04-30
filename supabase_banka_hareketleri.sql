-- AperiON banka ekstresi onay/kayit tablosu
-- Supabase SQL Editor'de bir kez calistirilir.

create table if not exists public.bank_transactions (
  id bigserial primary key,
  firma_id text not null,
  banka text,
  hesap text,
  tarih date not null,
  aciklama text,
  karsi_taraf text,
  cari_unvan text,
  tutar numeric(14,2) not null,
  tur text check (tur in ('tahsilat','cari_tahsilat','banka_gider','gider','transfer','virman','ozel','bekleyen')),
  sinif_guven integer not null default 0 check (sinif_guven between 0 and 100),
  sinif_kaynak text default 'bekliyor',
  ogrenme_durumu text default 'bekliyor'
    check (ogrenme_durumu in ('bekliyor','ogrenildi','riskli')),
  onay_durumu text not null default 'bekliyor'
    check (onay_durumu in ('bekliyor','onaylandi','reddedildi')),
  bizimhesap_durumu text,
  bizimhesap_mesaj text,
  aperion_not text,
  onay_token text default gen_random_uuid()::text,
  bildirim_durumu text default 'bekliyor'
    check (bildirim_durumu in ('bekliyor','gonderildi','hata')),
  bildirim_mesaj text,
  bildirim_tarihi timestamptz,
  bizimhesap_islem_tarihi timestamptz,
  kaynak text default 'banka_extresi',
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists bank_transactions_dedupe
on public.bank_transactions (firma_id, tarih, tutar, coalesce(aciklama, ''), coalesce(karsi_taraf, ''));

create index if not exists bank_transactions_onay_idx
on public.bank_transactions (onay_durumu, bizimhesap_durumu, tarih);

create index if not exists bank_transactions_bildirim_idx
on public.bank_transactions (bildirim_durumu, onay_durumu, tarih);

create unique index if not exists bank_transactions_token_idx
on public.bank_transactions (onay_token);

create table if not exists public.bank_transaction_rules (
  id bigserial primary key,
  firma_id text not null,
  pattern text not null,
  tur text not null check (tur in ('tahsilat','cari_tahsilat','banka_gider','gider','transfer','virman','ozel','bekleyen')),
  hesap text,
  cari_unvan text,
  karsi_taraf text,
  guven integer not null default 100 check (guven between 0 and 100),
  kullanim_sayisi integer not null default 0,
  son_kullanim timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists bank_transaction_rules_dedupe
on public.bank_transaction_rules (firma_id, pattern);

alter table public.bank_transactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bank_transactions'
      and policyname = 'bank_transactions authenticated read'
  ) then
    create policy "bank_transactions authenticated read"
    on public.bank_transactions for select
    to authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bank_transactions'
      and policyname = 'bank_transactions authenticated write'
  ) then
    create policy "bank_transactions authenticated write"
    on public.bank_transactions for all
    to authenticated
    using (true)
    with check (true);
  end if;
end $$;

-- Masraf botunun hizli upsert kullanabilmesi icin onerilen constraint.
do $$
begin
  if to_regclass('public.bank_transactions') is not null then
    alter table public.bank_transactions
    add column if not exists aperion_not text;

    alter table public.bank_transactions
    add column if not exists onay_token text default gen_random_uuid()::text;

    alter table public.bank_transactions
    add column if not exists sinif_guven integer default 0;

    alter table public.bank_transactions
    add column if not exists sinif_kaynak text default 'bekliyor';

    alter table public.bank_transactions
    add column if not exists ogrenme_durumu text default 'bekliyor';

    alter table public.bank_transactions
    add column if not exists bildirim_durumu text default 'bekliyor';

    alter table public.bank_transactions
    add column if not exists bildirim_mesaj text;

    alter table public.bank_transactions
    add column if not exists bildirim_tarihi timestamptz;

    update public.bank_transactions
    set onay_token = gen_random_uuid()::text
    where onay_token is null;
  end if;

  if to_regclass('public.masraf_raw') is not null then
    create unique index if not exists masraf_raw_dedupe
    on public.masraf_raw (tarih, aciklama, tedarikci, firma_id);
  end if;
end $$;

grant usage on schema public to anon;
grant select, update on public.bank_transactions to anon;
grant select, insert, update on public.bank_transaction_rules to anon;
grant usage, select on sequence public.bank_transaction_rules_id_seq to anon;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bank_transactions'
      and policyname = 'bank_transactions anon approval read'
  ) then
    create policy "bank_transactions anon approval read"
    on public.bank_transactions for select
    to anon
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bank_transactions'
      and policyname = 'bank_transactions anon approval update'
  ) then
    create policy "bank_transactions anon approval update"
    on public.bank_transactions for update
    to anon
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bank_transaction_rules'
      and policyname = 'bank_transaction_rules anon learn'
  ) then
    create policy "bank_transaction_rules anon learn"
    on public.bank_transaction_rules for all
    to anon
    using (true)
    with check (true);
  end if;
end $$;
