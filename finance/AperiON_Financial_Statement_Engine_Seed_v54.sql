-- AperiON Financial Statement Engine Seed v54
-- Purpose: insert controlled demo events for testing dynamic income statement and balance sheet.
-- Safety: demo company is ALAYLI_DEMO_V54. Existing live company data is not touched.

insert into finance_events_v54 (
  company, event_type, source_table, source_id, event_date, accounting_date,
  amount, currency, customer_name, vendor_name, product_name, account_name,
  status, confidence_score, note
) values
  ('ALAYLI_DEMO_V54', 'sale', 'demo_seed_v54', 'sale-001', current_date, current_date, 100000, 'TRY', 'Gamze Eczanesi', null, 'Jender Hasta Bezi', null, 'approved', 100, 'Demo satış'),
  ('ALAYLI_DEMO_V54', 'cost_of_goods_sold', 'demo_seed_v54', 'cogs-001', current_date, current_date, 62000, 'TRY', 'Gamze Eczanesi', null, 'Jender Hasta Bezi', null, 'approved', 100, 'Demo satış maliyeti'),
  ('ALAYLI_DEMO_V54', 'collection', 'demo_seed_v54', 'collection-001', current_date, current_date, 25000, 'TRY', 'Gamze Eczanesi', null, null, 'bank', 'approved', 100, 'Demo banka tahsilatı'),
  ('ALAYLI_DEMO_V54', 'moka_collection', 'demo_seed_v54', 'moka-001', current_date, current_date, 30000, 'TRY', 'Gamze Eczanesi', null, null, 'moka_united', 'approved', 100, 'Demo Moka tahsilatı'),
  ('ALAYLI_DEMO_V54', 'moka_bank_transfer', 'demo_seed_v54', 'moka-bank-001', current_date, current_date, 12000, 'TRY', null, null, null, 'bank', 'approved', 100, 'Demo Moka banka geçişi'),
  ('ALAYLI_DEMO_V54', 'expense', 'demo_seed_v54', 'expense-001', current_date, current_date, 15000, 'TRY', null, 'Personel', null, null, 'approved', 100, 'Demo operasyonel gider'),
  ('ALAYLI_DEMO_V54', 'payment', 'demo_seed_v54', 'payment-001', current_date, current_date, 5000, 'TRY', null, 'Personel', null, 'bank', 'approved', 100, 'Demo gider ödemesi'),
  ('ALAYLI_DEMO_V54', 'sale', 'demo_seed_v54', 'low-confidence-001', current_date, current_date, 9000, 'TRY', 'Düşük Güvenli Cari', null, 'Belirsiz Ürün', null, 'pending', 55, 'Bu kayıt bilerek onay dışı bırakıldı')
on conflict do nothing;

select finance_rebuild_ledger_v54('ALAYLI_DEMO_V54') as generated_ledger_rows;

-- Expected quick checks:
-- select * from financial_income_statement_v54_view where company = 'ALAYLI_DEMO_V54';
-- select * from financial_balance_sheet_v54_view where company = 'ALAYLI_DEMO_V54';
-- select * from financial_kpi_summary_v54_view where company = 'ALAYLI_DEMO_V54';
-- select * from financial_reconciliation_alerts_v54_view where company = 'ALAYLI_DEMO_V54';
