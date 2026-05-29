-- =========================================================
-- AperiON v57 — Kategori Marj Yönetimi SQL
-- =========================================================
-- Amaç:
-- AperiON'daki gerçek ürün/satış kategori listesinden ortalama kâr marjı yönetmek.
--
-- Kritik kural:
-- - Kategori isimleri asla elle uydurulmaz.
-- - Kategori listesi sales_raw / ürün ana kaynağı gibi AperiON verisinden çıkarılır.
-- - Gerçek maliyet varsa gerçek kârlılık önceliklidir.
-- - Gerçek maliyet yoksa sadece onaylı kategori marjı ile tahmini kâr hesaplanır.
-- =========================================================

create extension if not exists pgcrypto;

-- 1) Kategori marj ayarları
create table if not exists product_category_margin_rules_v57 (
  id uuid primary key default gen_random_uuid(),
  company text not null default 'alayli',
  category_name text not null,
  average_margin_percent numeric(8,4),
  margin_source text not null default 'user_approved'
    check (margin_source in ('user_approved','imported','estimated','disabled')),
  is_active boolean not null default true,
  note text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company, category_name)
);

create index if not exists product_category_margin_rules_v57_company_idx
on product_category_margin_rules_v57(company, is_active, category_name);

-- 2) Güncelleme zamanı
create or replace function touch_product_category_margin_rules_v57()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_product_category_margin_rules_v57 on product_category_margin_rules_v57;
create trigger trg_touch_product_category_margin_rules_v57
before update on product_category_margin_rules_v57
for each row execute function touch_product_category_margin_rules_v57();

-- 3) AperiON gerçek kategori listesi
-- Not: sales_raw içindeki olası kategori kolonları farklı sürümlerde değişebildiği için
-- view güvenli şekilde sadece mevcut kolonlardan veri almak üzere dinamik değil,
-- açık kolon adlarıyla tasarlanmıştır. Eğer projedeki ana kategori kolonu farklıysa
-- bu view Codex tarafından gerçek kolon adına göre güncellenecektir.

create or replace view aperion_real_categories_v57_view as
select distinct
  'alayli'::text as company,
  nullif(trim(coalesce(category::text, kategori::text, product_category::text, urun_kategori::text)), '') as category_name
from sales_raw
where nullif(trim(coalesce(category::text, kategori::text, product_category::text, urun_kategori::text)), '') is not null;

-- 4) Gerçek kategoriler + marj durumları
create or replace view aperion_category_margin_status_v57_view as
select
  c.company,
  c.category_name,
  r.average_margin_percent,
  r.margin_source,
  r.is_active,
  r.note,
  r.approved_by,
  r.approved_at,
  case
    when r.id is null then 'margin_missing'
    when r.is_active is false then 'disabled'
    when r.average_margin_percent is null then 'margin_missing'
    when r.margin_source <> 'user_approved' then 'approval_needed'
    else 'ready'
  end as margin_status,
  case
    when r.id is null then 'Marj tanımı yok'
    when r.is_active is false then 'Pasif'
    when r.average_margin_percent is null then 'Marj yüzdesi boş'
    when r.margin_source <> 'user_approved' then 'Kullanıcı onayı gerekli'
    else 'Hazır'
  end as margin_status_label
from aperion_real_categories_v57_view c
left join product_category_margin_rules_v57 r
  on r.company = c.company
 and r.category_name = c.category_name;

-- 5) Marj kaydetme/upsert fonksiyonu
create or replace function upsert_category_margin_rule_v57(
  p_company text,
  p_category_name text,
  p_average_margin_percent numeric,
  p_note text default null,
  p_approved_by text default 'user'
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  if nullif(trim(p_category_name), '') is null then
    raise exception 'Kategori adı boş olamaz';
  end if;

  -- Kategori gerçek AperiON kategori listesinde yoksa kayıt açma.
  if not exists (
    select 1
    from aperion_real_categories_v57_view
    where company = coalesce(nullif(p_company,''),'alayli')
      and category_name = trim(p_category_name)
  ) then
    raise exception 'Kategori AperiON gerçek kategori listesinde yok: %', p_category_name;
  end if;

  insert into product_category_margin_rules_v57 (
    company,
    category_name,
    average_margin_percent,
    margin_source,
    is_active,
    note,
    approved_by,
    approved_at
  ) values (
    coalesce(nullif(p_company,''),'alayli'),
    trim(p_category_name),
    p_average_margin_percent,
    'user_approved',
    true,
    p_note,
    p_approved_by,
    now()
  )
  on conflict (company, category_name)
  do update set
    average_margin_percent = excluded.average_margin_percent,
    margin_source = 'user_approved',
    is_active = true,
    note = excluded.note,
    approved_by = excluded.approved_by,
    approved_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- 6) Eksik marj listesi
create or replace view aperion_missing_category_margins_v57_view as
select *
from aperion_category_margin_status_v57_view
where margin_status in ('margin_missing','approval_needed')
order by category_name;

-- Quick checks:
-- select * from aperion_real_categories_v57_view where company='alayli';
-- select * from aperion_category_margin_status_v57_view where company='alayli';
-- select * from aperion_missing_category_margins_v57_view where company='alayli';
