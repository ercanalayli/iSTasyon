-- AperiON June 2026 Accruals FROM LIVE v58

-- Kaynak: sales_raw ve masraf_raw. Mevcut veriyi silmez; ayni tarih+baslik+tutar varsa tekrar eklemez.

-- Once finance/AperiON_Finance_Calendar_FULL_INSTALL_v58.sql kurulmus olmalidir.

-- Uretim: 2026-06-02T12:05:30.546Z

-- Kayit: 6, Satis tahakkuk: 154235, Gider tahakkuk: 1735



insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, source_table, source_id, note
)
select
  'ALAYLI', '2026-06-01', '2026-06-01', finance_next_business_day('2026-06-01'::date),
  'receivable', 'in',
  'Haziran satÄ±ÅŸ tahakkuku 2026-06-01', '131 satÄ±ÅŸ satÄ±rÄ±, 1442 adet. Kaynak: sales_raw.', 'SatÄ±ÅŸ mÃ¼ÅŸterileri', 'Cari Alacak', 'SatÄ±ÅŸ Tahakkuku',
  127380::numeric, 'open', 'normal', 'variable', 'sales_raw', 'sales_raw', 117626, 'Otomatik Ã¼retilen Haziran tahakkuk adayÄ±; onaydan Ã¶nce kontrol edilir.'
where not exists (
  select 1 from finance_calendar_items
  where company='ALAYLI'
    and item_date='2026-06-01'
    and title='Haziran satÄ±ÅŸ tahakkuku 2026-06-01'
    and expected_amount=127380::numeric
);

insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, source_table, source_id, note
)
select
  'ALAYLI', '2026-06-02', '2026-06-02', finance_next_business_day('2026-06-02'::date),
  'receivable', 'in',
  'Haziran satÄ±ÅŸ tahakkuku 2026-06-02', '43 satÄ±ÅŸ satÄ±rÄ±, 910 adet. Kaynak: sales_raw.', 'SatÄ±ÅŸ mÃ¼ÅŸterileri', 'Cari Alacak', 'SatÄ±ÅŸ Tahakkuku',
  26855::numeric, 'open', 'normal', 'variable', 'sales_raw', 'sales_raw', 117757, 'Otomatik Ã¼retilen Haziran tahakkuk adayÄ±; onaydan Ã¶nce kontrol edilir.'
where not exists (
  select 1 from finance_calendar_items
  where company='ALAYLI'
    and item_date='2026-06-02'
    and title='Haziran satÄ±ÅŸ tahakkuku 2026-06-02'
    and expected_amount=26855::numeric
);

insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, source_table, source_id, note
)
select
  'ALAYLI', '2026-06-02', '2026-06-02', finance_next_business_day('2026-06-02'::date),
  'variable_expense', 'out',
  'Haziran gider tahakkuku Personel Yemek 2026-06-02', 'Personel Giderleri/Yemek', 'Personel Yemek', 'Gider Tahakkuku', 'Personel Yemek',
  950::numeric, 'open', 'normal', 'variable', 'masraf_raw', 'masraf_raw', 2808, 'BizimHesap masraf ham verisinden Haziran gider tahakkuku.'
where not exists (
  select 1 from finance_calendar_items
  where company='ALAYLI'
    and item_date='2026-06-02'
    and title='Haziran gider tahakkuku Personel Yemek 2026-06-02'
    and expected_amount=950::numeric
);

insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, source_table, source_id, note
)
select
  'ALAYLI', '2026-06-02', '2026-06-02', finance_next_business_day('2026-06-02'::date),
  'variable_expense', 'out',
  'Haziran gider tahakkuku Market/Mutfak 2026-06-02', 'Ä°ÅŸletme Giderleri/MARKET', 'Market/Mutfak', 'Gider Tahakkuku', 'Market/Mutfak',
  175::numeric, 'open', 'normal', 'variable', 'masraf_raw', 'masraf_raw', 2809, 'BizimHesap masraf ham verisinden Haziran gider tahakkuku.'
where not exists (
  select 1 from finance_calendar_items
  where company='ALAYLI'
    and item_date='2026-06-02'
    and title='Haziran gider tahakkuku Market/Mutfak 2026-06-02'
    and expected_amount=175::numeric
);

insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, source_table, source_id, note
)
select
  'ALAYLI', '2026-06-01', '2026-06-01', finance_next_business_day('2026-06-01'::date),
  'variable_expense', 'out',
  'Haziran gider tahakkuku Market/Mutfak 2026-06-01', 'Ä°ÅŸletme Giderleri MARKET', 'Market/Mutfak', 'Gider Tahakkuku', 'Market/Mutfak',
  500::numeric, 'open', 'normal', 'variable', 'masraf_raw', 'masraf_raw', 2810, 'BizimHesap masraf ham verisinden Haziran gider tahakkuku.'
where not exists (
  select 1 from finance_calendar_items
  where company='ALAYLI'
    and item_date='2026-06-01'
    and title='Haziran gider tahakkuku Market/Mutfak 2026-06-01'
    and expected_amount=500::numeric
);

insert into finance_calendar_items (
  company, item_date, original_due_date, effective_due_date, item_type, direction,
  title, description, cari_name, account_name, category,
  expected_amount, status, priority, fixed_or_variable, source_type, source_table, source_id, note
)
select
  'ALAYLI', '2026-06-01', '2026-06-01', finance_next_business_day('2026-06-01'::date),
  'variable_expense', 'out',
  'Haziran gider tahakkuku Market/Mutfak 2026-06-01', 'Ä°ÅŸletme Giderleri/MARKET', 'Market/Mutfak', 'Gider Tahakkuku', 'Market/Mutfak',
  110::numeric, 'open', 'normal', 'variable', 'masraf_raw', 'masraf_raw', 2811, 'BizimHesap masraf ham verisinden Haziran gider tahakkuku.'
where not exists (
  select 1 from finance_calendar_items
  where company='ALAYLI'
    and item_date='2026-06-01'
    and title='Haziran gider tahakkuku Market/Mutfak 2026-06-01'
    and expected_amount=110::numeric
);



select * from finance_calendar_drawer_view where company='ALAYLI' and calendar_date between '2026-06-01' and '2026-06-30' order by calendar_date, id;
