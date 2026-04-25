-- AperiON satis raporlama denetimi
-- Satis tarihi ile sisteme kayit/guncelleme tarihini ayirmak icin.

alter table public.sales_raw
add column if not exists kaynak_rapor_tarihi date default current_date;

alter table public.sales_raw
add column if not exists kaynak_cekilme_tarihi timestamptz default now();

alter table public.sales_raw
add column if not exists belge_no text;

alter table public.sales_raw
add column if not exists satir_hash text;

alter table public.sales_raw
add column if not exists degisim_durumu text default 'normal'
  check (degisim_durumu in ('normal','sonradan_faturalasti','tarih_degisti','tutar_degisti','iptal','supheli'));

alter table public.sales_raw
add column if not exists onceki_tarih date;

alter table public.sales_raw
add column if not exists onceki_ciro numeric(14,2);

alter table public.sales_raw
add column if not exists denetim_notu text;

create table if not exists public.sales_change_log (
  id bigserial primary key,
  sales_raw_id bigint,
  firma_id text,
  belge_no text,
  eski_tarih date,
  yeni_tarih date,
  eski_ciro numeric(14,2),
  yeni_ciro numeric(14,2),
  degisim_tipi text,
  aciklama text,
  created_at timestamptz default now()
);

create index if not exists sales_raw_year_idx
on public.sales_raw (firma_id, tarih);

create index if not exists sales_raw_audit_idx
on public.sales_raw (degisim_durumu, kaynak_cekilme_tarihi);

create index if not exists sales_change_log_idx
on public.sales_change_log (firma_id, created_at);

-- Eski tekillestirme ayni musteri/urun satirlarini tek kayda dusuruyordu.
-- Rapor dogrulugu icin ham veriyi satir bazli sakliyoruz.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.sales_raw'::regclass
      and c.contype = 'u'
      and pg_get_indexdef(c.conindid) ilike '%tarih%'
      and pg_get_indexdef(c.conindid) ilike '%urun%'
      and pg_get_indexdef(c.conindid) ilike '%unvan%'
      and pg_get_indexdef(c.conindid) ilike '%firma_id%'
  loop
    execute format('alter table public.sales_raw drop constraint %I', r.conname);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'sales_raw'
      and indexname <> 'unique_satis'
      and indexdef ilike '%tarih%'
      and indexdef ilike '%urun%'
      and indexdef ilike '%unvan%'
      and indexdef ilike '%firma_id%'
  loop
    execute format('drop index if exists public.%I', r.indexname);
  end loop;
end $$;

create unique index if not exists sales_raw_row_dedupe
on public.sales_raw (firma_id, kaynak_rapor_tarihi, satir_hash);

grant select, insert, update on public.sales_raw to anon;
grant select, insert on public.sales_change_log to anon;
grant usage, select on sequence public.sales_change_log_id_seq to anon;
