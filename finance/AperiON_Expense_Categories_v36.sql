-- AperiON Expense Categories v36
-- Purpose: classify every expense as fixed, variable, product cost, finance cost, tax, personnel, POS/Moka, bank fee, logistics, other.

create table if not exists expense_categories (
  id bigserial primary key,
  category_code text not null unique,
  category_name text not null,
  expense_group text not null,
  is_fixed boolean default false,
  is_variable boolean default false,
  affects_product_cost boolean default false,
  affects_daily_profit boolean default true,
  affects_cashflow boolean default true,
  default_allocation_method text default 'daily',
  description text,
  active boolean default true,
  created_at timestamptz default now()
);

insert into expense_categories (category_code, category_name, expense_group, is_fixed, is_variable, affects_product_cost, affects_daily_profit, affects_cashflow, default_allocation_method, description)
values
('RENT', 'Kira', 'Sabit Gider', true, false, false, true, true, 'daily', 'Magaza, ofis, depo kiralari'),
('PERSONNEL', 'Personel / Maas / Ortak Odeme', 'Sabit Gider', true, false, false, true, true, 'daily', 'Maas, ortak odemesi, personel sabit odemeleri'),
('SGK', 'SGK', 'Sabit Gider', true, false, false, true, true, 'daily', 'SGK prim ve personel yuku'),
('TAX', 'Vergi', 'Vergi', false, true, false, true, true, 'period', 'KDV, stopaj, gecici vergi, diger vergiler'),
('LOAN', 'Kredi Taksiti', 'Finansman', true, false, false, true, true, 'due_date', 'Banka kredileri ve taksitleri'),
('CREDIT_CARD', 'Kredi Karti Taksit / Borc', 'Finansman', false, true, false, true, true, 'due_date', 'Kredi karti borc ve gelecek donem taksitleri'),
('BANK_FEE', 'Banka Masrafi', 'Degisken Gider', false, true, false, true, true, 'transaction', 'EFT, havale, kart, kredi islem masraflari'),
('POS_MOKA', 'POS / Moka Komisyonu', 'Degisken Gider', false, true, false, true, true, 'transaction', 'Moka/POS komisyon ve kesintileri'),
('LOGISTICS', 'Navlun / Sevkiyat', 'Degisken Gider', false, true, false, true, true, 'sale_or_day', 'Sevkiyat, kargo, navlun giderleri'),
('VEHICLE', 'Arac / Yakit / Bakim / Kasko', 'Degisken Gider', false, true, false, true, true, 'daily_or_event', 'Arac giderleri, sigorta, kasko, bakim'),
('SOFTWARE', 'Yazilim / Abonelik', 'Sabit Gider', true, false, false, true, true, 'daily', 'Yazilim, cloud, sistem, uygulama abonelikleri'),
('PRODUCT_COST', 'Satilan Malin Maliyeti', 'Urun Maliyeti', false, false, true, true, false, 'sale', 'Urun satisinda SMM olarak dusulur'),
('REPAIR', 'Tamir / Bakim', 'Degisken Gider', false, true, false, true, true, 'event', 'Beklenmeyen tamir ve bakim giderleri'),
('OTHER', 'Diger Gider', 'Diger', false, true, false, true, true, 'manual', 'Siniflandirilmamis giderler')
on conflict (category_code) do nothing;

create table if not exists expense_classification_rules (
  id bigserial primary key,
  keyword text not null,
  category_code text not null references expense_categories(category_code),
  confidence_score integer default 80,
  source_hint text,
  active boolean default true,
  created_at timestamptz default now()
);

insert into expense_classification_rules (keyword, category_code, confidence_score, source_hint)
values
('kira', 'RENT', 95, 'bank/bizimhesap'),
('maas', 'PERSONNEL', 90, 'bank/bizimhesap'),
('maaş', 'PERSONNEL', 90, 'bank/bizimhesap'),
('sgk', 'SGK', 95, 'bank/bizimhesap'),
('vergi', 'TAX', 90, 'bank/bizimhesap'),
('kdv', 'TAX', 90, 'bank/bizimhesap'),
('kredi', 'LOAN', 85, 'bank'),
('kredi karti', 'CREDIT_CARD', 90, 'bank/card'),
('kredi kartı', 'CREDIT_CARD', 90, 'bank/card'),
('eft masraf', 'BANK_FEE', 90, 'bank'),
('banka masraf', 'BANK_FEE', 90, 'bank'),
('moka', 'POS_MOKA', 95, 'moka/bank'),
('pos', 'POS_MOKA', 85, 'bank'),
('navlun', 'LOGISTICS', 95, 'invoice/manual'),
('kargo', 'LOGISTICS', 85, 'invoice/manual'),
('yakit', 'VEHICLE', 80, 'bank/manual'),
('yakıt', 'VEHICLE', 80, 'bank/manual'),
('kasko', 'VEHICLE', 90, 'bank/manual'),
('sigorta', 'VEHICLE', 80, 'bank/manual'),
('cloudflare', 'SOFTWARE', 90, 'card'),
('supabase', 'SOFTWARE', 90, 'card'),
('bizimhesap', 'SOFTWARE', 85, 'card'),
('tamir', 'REPAIR', 90, 'manual/bank'),
('bakim', 'REPAIR', 85, 'manual/bank'),
('bakım', 'REPAIR', 85, 'manual/bank')
on conflict do nothing;

create table if not exists expense_raw_items (
  id bigserial primary key,
  company text not null,
  expense_date date,
  source_type text,
  source_name text,
  description text,
  amount numeric(18,2) default 0,
  matched_category_code text,
  confidence_score integer default 0,
  classification_status text default 'waiting',
  is_fixed boolean default false,
  is_variable boolean default true,
  created_at timestamptz default now()
);

create or replace view expense_classified_view as
select
  e.*,
  c.category_name,
  c.expense_group,
  c.affects_product_cost,
  c.affects_daily_profit,
  c.affects_cashflow,
  c.default_allocation_method
from expense_raw_items e
left join expense_categories c on c.category_code = e.matched_category_code;

create index if not exists idx_expense_raw_items_company_date on expense_raw_items(company, expense_date);
create index if not exists idx_expense_raw_items_status on expense_raw_items(classification_status);
