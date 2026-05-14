-- AperiON / ErpaltH iSTasyon
-- Finans Takvimi Health Check SQL
-- Supabase kurulum sonrası kontrol amaçlıdır.

-- 1) Tablo var mı?
select 'finance_calendar_records' as object_name, to_regclass('public.finance_calendar_records') is not null as exists
union all select 'fixed_payment_contracts', to_regclass('public.fixed_payment_contracts') is not null
union all select 'variable_payment_items', to_regclass('public.variable_payment_items') is not null
union all select 'moka_united_movements', to_regclass('public.moka_united_movements') is not null
union all select 'turkiye_public_holidays', to_regclass('public.turkiye_public_holidays') is not null
union all select 'finance_cashflow_summary', to_regclass('public.finance_cashflow_summary') is not null;

-- 2) Finans kayıt sayıları
select company, record_type, approval_status, count(*) as record_count, sum(expected_amount) as expected_total, sum(realized_amount) as realized_total
from finance_calendar_records
group by company, record_type, approval_status
order by company, record_type, approval_status;

-- 3) Nakit akışı özeti
select *
from finance_cashflow_summary
order by cashflow_date, company;

-- 4) Moka bekleyenler
select company, customer_name, pos_collection_date, expected_bank_transfer_date, gross_amount, banked_amount, remaining_moka_amount, status
from moka_united_movements
where remaining_moka_amount > 0
order by expected_bank_transfer_date;

-- 5) Kontrol gerektiren kayıtlar
select id, company, record_type, cari_name, expected_amount, realized_amount, approval_status, confidence_score, match_reason
from finance_calendar_records
where approval_status <> 'onaylandi'
order by confidence_score nulls first, created_at desc;
