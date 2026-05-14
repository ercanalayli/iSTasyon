-- AperiON Finans Takvimi Demo Seed
-- Bu dosya şema kurulduktan sonra test verisi üretmek içindir.
-- Kesin muhasebe kaydı değil, test/demo başlangıç verisidir.

insert into finance_calendar_records
(company, record_type, status, cari_name, description, original_due_date, actual_payment_date, accrual_month, expected_amount, realized_amount, source, approval_status, confidence_score, match_reason)
values
('alayli','tahsilat','bekliyor','Medikal SGK alacağı','Beklenen SGK tahsilatı','2026-05-16','2026-05-16','2026-05-01',875958.47,0,'demo_seed','onay_bekliyor',90,'manuel doğrulanacak demo kayıt'),
('alayli','tahsilat','bekliyor','Medikal cari alacağı','Cari tahsilat planı','2026-05-20','2026-05-20','2026-05-01',300000.00,0,'demo_seed','onay_bekliyor',88,'manuel doğrulanacak demo kayıt'),
('alayli','moka_united','bekliyor','Moka United','POS tahsilatı beklenen banka geçişi','2026-05-17','2026-05-17','2026-05-01',185000.00,0,'moka_demo','onay_bekliyor',92,'Moka demo geçişi'),
('alayli','kredi_karti','bekliyor','Akbank Axess Business','Kredi kartı ödeme','2026-05-15','2026-05-15','2026-05-01',341263.92,57930.62,'demo_seed','onay_bekliyor',88,'kredi kartı demo kayıt'),
('alayli','cek_senet','bekliyor','Tedarikçi çeki','Asıl vade hafta sonu/resmi tatil kontrolü','2026-05-30','2026-06-01','2026-05-01',220000.00,0,'demo_seed','kontrol_gerekli',80,'fiili ödeme ilk iş günü kontrolü'),
('woodlet','odeme','bekliyor','Levha tedarikçisi','Tedarikçi ödemesi','2026-05-22','2026-05-22','2026-05-01',420000.00,120000.00,'demo_seed','onay_bekliyor',76,'belge kontrolü gerekli'),
('odyoform','tahsilat','bekliyor','Odyoform cihaz satışı','Beklenen tahsilat','2026-05-28','2026-05-28','2026-05-01',480000.00,100000.00,'demo_seed','onay_bekliyor',84,'cari kontrolü gerekli'),
('alkam','tahsilat','bekliyor','Aylık muhasebe ücretleri','Mayıs tahsilat planı','2026-05-31','2026-05-31','2026-05-01',275000.00,175000.00,'demo_seed','onay_bekliyor',87,'aylık hizmet tahsilat planı'),
('yenicespor','tahsilat','tamamlandi','Sosyal Tesis 2026 Kira','Sözleşmeli gelir','2026-05-05','2026-05-05','2026-05-01',75000.00,75000.00,'demo_seed','onaylandi',95,'sözleşmeli gelir demo'),
('yenicespor','odeme','bekliyor','A Takım giderleri','Değişken ödeme','2026-05-12','2026-05-12','2026-05-01',95000.00,60000.00,'demo_seed','onay_bekliyor',82,'değişken gider kontrolü');

insert into moka_united_movements
(company, customer_name, pos_collection_date, expected_bank_transfer_date, gross_amount, commission_amount, banked_amount, status, notes)
values
('alayli','Moka United Demo POS','2026-05-14','2026-06-23',185000.00,0,0,'moka_bekliyor','40 gün sonrası banka geçişi demo');
