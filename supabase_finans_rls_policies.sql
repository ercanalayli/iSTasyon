-- AperiON / ErpaltH iSTasyon
-- Finans Takvimi RLS / Policy Taslağı
-- Bu dosya Supabase canlı kurulumunda güvenlik katmanı için hazırlanmıştır.
-- Not: Auth yapısı netleşmeden production'da doğrudan uygulamadan önce rol/yetki yapısı kontrol edilmelidir.

alter table if exists finance_calendar_records enable row level security;
alter table if exists fixed_payment_contracts enable row level security;
alter table if exists variable_payment_items enable row level security;
alter table if exists moka_united_movements enable row level security;
alter table if exists turkiye_public_holidays enable row level security;

-- Geçici güvenli okuma politikası:
-- Auth olmuş kullanıcılar okuyabilir. Yazma için ayrı onay/servis katmanı önerilir.

drop policy if exists finance_records_read_authenticated on finance_calendar_records;
create policy finance_records_read_authenticated
on finance_calendar_records
for select
to authenticated
using (true);

drop policy if exists fixed_contracts_read_authenticated on fixed_payment_contracts;
create policy fixed_contracts_read_authenticated
on fixed_payment_contracts
for select
to authenticated
using (true);

drop policy if exists variable_items_read_authenticated on variable_payment_items;
create policy variable_items_read_authenticated
on variable_payment_items
for select
to authenticated
using (true);

drop policy if exists moka_read_authenticated on moka_united_movements;
create policy moka_read_authenticated
on moka_united_movements
for select
to authenticated
using (true);

drop policy if exists holidays_read_authenticated on turkiye_public_holidays;
create policy holidays_read_authenticated
on turkiye_public_holidays
for select
to authenticated
using (true);

-- Yazma politikası:
-- İlk canlı aşamada direkt frontend insert/update yerine Onay Merkezi veya servis rolü kullanılmalı.
-- Bu yüzden burada genel insert/update policy açılmadı.

-- İleride kullanıcı profili / rol tablosu oluşturulursa örnek:
-- create table app_user_roles(user_id uuid primary key, role text not null);
-- role in ('admin','finance_admin') ise insert/update/delete yetkisi verilebilir.
