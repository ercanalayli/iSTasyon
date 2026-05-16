-- AperiON Finance Calendar Seed v47
-- Purpose: first safe demo/live starter records for finance_calendar_items.
-- Safe rule: inserts only when the same title + date + company does not already exist.

-- Important: run AperiON_Finance_Calendar_Live_SQL_v47.sql first.

insert into finance_calendar_holidays (holiday_date, holiday_name, country)
values
  ('2026-01-01','Yılbaşı','TR'),
  ('2026-04-23','Ulusal Egemenlik ve Çocuk Bayramı','TR'),
  ('2026-05-01','Emek ve Dayanışma Günü','TR'),
  ('2026-05-19','Atatürk’ü Anma, Gençlik ve Spor Bayramı','TR'),
  ('2026-07-15','Demokrasi ve Milli Birlik Günü','TR'),
  ('2026-08-30','Zafer Bayramı','TR'),
  ('2026-10-29','Cumhuriyet Bayramı','TR')
on conflict (holiday_date) do nothing;

insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, note
)
select * from (values
  ('ALAYLI', current_date, current_date, finance_next_business_day(current_date), 'payable', 'out',
   'Bugün ödenecek - örnek tedarikçi ödemesi', 'İlk canlı finans takvimi kontrol kaydı', 'Demo Tedarikçi', 'Banka', 'Tedarikçi Ödemesi',
   125000::numeric, 'open', 'high', 'variable', 'seed', 'Canlı veriye geçince silinebilir veya kapatılabilir'),

  ('ALAYLI', current_date, current_date, finance_next_business_day(current_date), 'receivable', 'in',
   'Bugün tahsil edilecek - örnek cari tahsilatı', 'İlk canlı tahsilat kontrol kaydı', 'Demo Cari', 'Kasa/Banka', 'Cari Tahsilat',
   155000::numeric, 'open', 'high', 'variable', 'seed', 'Canlı veriye geçince silinebilir veya kapatılabilir'),

  ('ALAYLI', current_date - interval '2 days', current_date - interval '2 days', finance_next_business_day((current_date - interval '2 days')::date), 'payable', 'out',
   'Geciken ödeme - örnek kredi kartı', 'Geciken ödeme uyarı testi', 'Banka/Kart', 'Kredi Kartı', 'Kredi Kartı',
   48500::numeric, 'open', 'critical', 'variable', 'seed', 'Geciken ödeme KPI testi'),

  ('ALAYLI', current_date - interval '3 days', current_date - interval '3 days', finance_next_business_day((current_date - interval '3 days')::date), 'receivable', 'in',
   'Geciken tahsilat - örnek müşteri', 'Geciken tahsilat uyarı testi', 'Demo Müşteri', 'Cari', 'Tahsilat',
   72000::numeric, 'open', 'critical', 'variable', 'seed', 'Geciken tahsilat KPI testi'),

  ('ALAYLI', current_date + interval '1 day', current_date + interval '1 day', finance_next_business_day((current_date + interval '1 day')::date), 'credit', 'out',
   'Yarın kredi taksiti - örnek', 'Kredi taksiti kontrol kaydı', 'Banka', 'Kredi', 'Kredi Taksiti',
   22650::numeric, 'open', 'normal', 'fixed', 'seed', 'Kredi taksiti örnek kaydı'),

  ('ALAYLI', current_date, current_date, finance_next_business_day(current_date), 'task', 'neutral',
   'Bugün yapılacak - banka ekstresi kontrolü', 'Banka hareketleri ve Moka transferleri kontrol edilecek', null, null, 'Görev',
   0::numeric, 'open', 'high', 'variable', 'seed', 'Görev KPI testi'),

  ('ALAYLI', current_date, current_date, finance_next_business_day(current_date), 'approval', 'neutral',
   'Onay bekleyen - fiyat listesi eşleşmesi', 'Telegram fiyat listesi ürün eşleşmesi kontrol edilecek', 'Demo Tedarikçi', null, 'Onay',
   0::numeric, 'waiting_approval', 'normal', 'variable', 'seed', 'Onay merkezi testi')
) as v(company,item_date,original_due_date,effective_due_date,item_type,direction,title,description,cari_name,account_name,category,expected_amount,status,priority,fixed_or_variable,source_type,note)
where not exists (
  select 1 from finance_calendar_items f
  where f.company = v.company
    and f.title = v.title
    and f.item_date = v.item_date::date
);

-- Quick check after seed:
-- select * from finance_calendar_summary_view where company='ALAYLI';
-- select * from finance_calendar_drawer_view where company='ALAYLI';
