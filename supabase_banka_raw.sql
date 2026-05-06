-- AperiON banka ekstresi ham hareket tablosu
-- Onay olmadan BizimHesap'a islem yapmaz.

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
  durum text not null default 'onay_bekliyor'
    check (durum in ('islenecek','islenmeyecek','onay_bekliyor','islendi')),
  guven integer not null default 0 check (guven between 0 and 100),
  risk text,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists banka_raw_hash_idx
on public.banka_raw (firma_id, hash);

create index if not exists banka_raw_durum_idx
on public.banka_raw (firma_id, durum, tarih);

alter table public.banka_raw enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.banka_raw to anon, authenticated;
grant usage, select on sequence public.banka_raw_id_seq to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='banka_raw' and policyname='banka_raw anon all'
  ) then
    create policy "banka_raw anon all"
    on public.banka_raw for all
    to anon
    using (true)
    with check (true);
  end if;
end $$;
