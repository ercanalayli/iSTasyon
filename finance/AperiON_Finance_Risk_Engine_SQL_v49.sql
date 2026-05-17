-- AperiON Finance Risk Engine SQL v49
-- Purpose: central risk engine for cash pressure, overdue receivables/payables, stock pressure and price risk.
-- Safe rule: creates views only. No existing data is changed.
-- Requires recommended: v46 sales flow, v47 finance calendar, v44/v45 price intelligence where available.

create or replace view finance_cash_risk_v49_view as
select
  company,
  today_receivable,
  today_payable,
  today_cash_net,
  week_receivable,
  week_payable,
  week_cash_net,
  month_end_receivable,
  month_end_payable,
  month_end_cash_net,
  overdue_receivable,
  overdue_payable,
  urgent_tasks,
  waiting_approvals,
  case
    when month_end_cash_net < 0 and abs(month_end_cash_net) >= 500000 then 'critical'
    when week_cash_net < 0 and abs(week_cash_net) >= 250000 then 'high'
    when today_cash_net < 0 then 'warning'
    else 'ok'
  end as cash_risk_level,
  case
    when month_end_cash_net < 0 and abs(month_end_cash_net) >= 500000 then 'Ay sonuna kadar ciddi nakit açığı riski var.'
    when week_cash_net < 0 and abs(week_cash_net) >= 250000 then 'Bu hafta ödeme baskısı yüksek.'
    when today_cash_net < 0 then 'Bugün net nakit çıkışı var.'
    else 'Nakit akışı normal görünüyor.'
  end as cash_risk_message
from finance_calendar_summary_view;

create or replace view finance_overdue_risk_v49_view as
select
  company,
  count(*) filter (where direction='in' and period_status='overdue') as overdue_receivable_count,
  sum(case when direction='in' and period_status='overdue' then remaining_amount else 0 end) as overdue_receivable_amount,
  count(*) filter (where direction='out' and period_status='overdue') as overdue_payable_count,
  sum(case when direction='out' and period_status='overdue' then remaining_amount else 0 end) as overdue_payable_amount,
  count(*) filter (where item_type='task' and period_status='overdue') as overdue_task_count,
  case
    when sum(case when direction='in' and period_status='overdue' then remaining_amount else 0 end) >= 500000 then 'critical'
    when sum(case when direction='in' and period_status='overdue' then remaining_amount else 0 end) >= 200000 then 'high'
    when count(*) filter (where direction='in' and period_status='overdue') > 0 then 'warning'
    else 'ok'
  end as receivable_risk_level,
  case
    when sum(case when direction='out' and period_status='overdue' then remaining_amount else 0 end) >= 300000 then 'high'
    when count(*) filter (where direction='out' and period_status='overdue') > 0 then 'warning'
    else 'ok'
  end as payable_risk_level
from finance_calendar_live_view
group by company;

-- Optional price risk. If product_price_intelligence_view exists, this view will work.
-- If not installed yet, run v44 price intelligence SQL first.
create or replace view product_price_risk_v49_view as
select
  company,
  product_code,
  product_name,
  base_cost,
  minimum_sale_price,
  recommended_sale_price,
  market_avg_price,
  market_median_price,
  supplier_price_change_percent,
  price_status,
  case
    when price_status = 'missing_cost' then 'critical'
    when price_status = 'supplier_price_increased' then 'high'
    when price_status = 'above_market_warning' then 'warning'
    when supplier_price_change_percent >= 15 then 'high'
    when supplier_price_change_percent >= 10 then 'warning'
    else 'ok'
  end as price_risk_level,
  case
    when price_status = 'missing_cost' then 'Maliyet eksik; fiyat kararı güvenli değil.'
    when price_status = 'supplier_price_increased' or supplier_price_change_percent >= 10 then 'Tedarikçi fiyatı belirgin artmış; satış fiyatı kontrol edilmeli.'
    when price_status = 'above_market_warning' then 'Önerilen fiyat pazar ortalamasının üzerinde; rekabet riski var.'
    else 'Fiyat riski normal.'
  end as price_risk_message
from product_price_intelligence_view;

-- Unified risk feed for dashboard, drawer and Telegram.
create or replace view aperion_risk_feed_v49_view as
select
  company,
  'cash'::text as risk_type,
  cash_risk_level as risk_level,
  'Nakit Akışı'::text as title,
  cash_risk_message as message,
  today_cash_net as amount,
  current_date as risk_date,
  null::text as ref_code,
  null::text as ref_name
from finance_cash_risk_v49_view
where cash_risk_level <> 'ok'

union all

select
  company,
  'overdue_receivable'::text as risk_type,
  receivable_risk_level as risk_level,
  'Geciken Tahsilat'::text as title,
  ('Geciken tahsilat: ' || overdue_receivable_count || ' kayıt / ' || coalesce(overdue_receivable_amount,0)::text || ' TL') as message,
  overdue_receivable_amount as amount,
  current_date as risk_date,
  null::text as ref_code,
  null::text as ref_name
from finance_overdue_risk_v49_view
where receivable_risk_level <> 'ok'

union all

select
  company,
  'overdue_payable'::text as risk_type,
  payable_risk_level as risk_level,
  'Geciken Ödeme'::text as title,
  ('Geciken ödeme: ' || overdue_payable_count || ' kayıt / ' || coalesce(overdue_payable_amount,0)::text || ' TL') as message,
  overdue_payable_amount as amount,
  current_date as risk_date,
  null::text as ref_code,
  null::text as ref_name
from finance_overdue_risk_v49_view
where payable_risk_level <> 'ok'

union all

select
  company,
  'price'::text as risk_type,
  price_risk_level as risk_level,
  'Fiyat Riski'::text as title,
  price_risk_message as message,
  recommended_sale_price as amount,
  current_date as risk_date,
  product_code as ref_code,
  product_name as ref_name
from product_price_risk_v49_view
where price_risk_level <> 'ok';

create or replace view aperion_risk_summary_v49_view as
select
  company,
  count(*) as total_risk_count,
  count(*) filter (where risk_level='critical') as critical_count,
  count(*) filter (where risk_level='high') as high_count,
  count(*) filter (where risk_level='warning') as warning_count,
  sum(coalesce(amount,0)) filter (where risk_type in ('cash','overdue_receivable','overdue_payable')) as financial_risk_amount,
  max(risk_date) as last_risk_date
from aperion_risk_feed_v49_view
group by company;

-- Quick checks:
-- select * from aperion_risk_summary_v49_view where company='ALAYLI';
-- select * from aperion_risk_feed_v49_view where company='ALAYLI' order by case risk_level when 'critical' then 1 when 'high' then 2 when 'warning' then 3 else 4 end, amount desc nulls last;
