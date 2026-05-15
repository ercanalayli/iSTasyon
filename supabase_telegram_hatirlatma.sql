-- AperiON Telegram not / odeme / tahsilat hatirlatma altyapisi
-- Supabase SQL Editor'de tek parca calistir.

grant usage on schema public to anon, authenticated;

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

create index if not exists telegram_reminders_due_idx
on public.telegram_reminders (durum, hatirlatma_zamani);
create unique index if not exists financial_inbox_hash_uq
on public.financial_inbox (hash) where hash is not null;
create index if not exists financial_inbox_status_idx
on public.financial_inbox (firma_id, onay_durumu, bizimhesap_durumu, created_at);

alter table public.telegram_reminders enable row level security;
alter table public.bot_state enable row level security;
alter table public.financial_inbox enable row level security;

grant select, insert, update, delete on public.telegram_reminders to anon, authenticated;
grant select, insert, update on public.bot_state to anon, authenticated;
grant select, insert, update, delete on public.financial_inbox to anon, authenticated;
grant usage, select on sequence public.telegram_reminders_id_seq to anon, authenticated;
grant usage, select on sequence public.financial_inbox_id_seq to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='telegram_reminders' and policyname='telegram_reminders anon all'
  ) then
    create policy "telegram_reminders anon all"
    on public.telegram_reminders for all
    to anon
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='bot_state' and policyname='bot_state anon all'
  ) then
    create policy "bot_state anon all"
    on public.bot_state for all
    to anon
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='financial_inbox' and policyname='financial_inbox anon all'
  ) then
    create policy "financial_inbox anon all"
    on public.financial_inbox for all
    to anon
    using (true)
    with check (true);
  end if;
end $$;

select 'APERION_TELEGRAM_HATIRLATMA_OK' as durum;
