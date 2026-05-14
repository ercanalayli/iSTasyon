-- AperiON Finans Komuta Merkezi Demo Seed
-- Kesin finans kaydı değil; demo/test verisidir.

insert into finance_command_center_records
(company, core, title, description, due_date, data_date, source, source_ref, status, verification, amount, priority, alarm_level, telegram_enabled, notes)
values
('alayli','payable','Akbank Axess Business kredi kartı','Dönem içi + gelecek dönem taksit ayrımı kontrol edilecek.','2026-05-14','2026-05-14','demo_finance_seed','PAY-001','pending','needs_approval',341263.92,'high','critical',true,'Ödeme onaydan sonra kesinleşecek.'),
('alayli','payable','Tedarikçi çeki','Asıl vade korunacak, fiili ödeme ilk iş günü mantığı uygulanacak.','2026-05-14','2026-05-14','manual_demo','PAY-002','pending','verified_date_shift',220000.00,'normal','warning',true,'Çek/senet vade kontrolü.'),
('alayli','receivable','Medikal SGK alacağı','Tahsilat bekleniyor; doğrulama sonrası kesinleşecek.','2026-05-14','2026-05-14','demo_finance_seed','REC-001','pending','needs_approval',875958.47,'high','critical',true,'Tahsilat kesin değil.'),
('alayli','receivable','Moka United beklenen POS geçişi','Banka geçişi bekleniyor.','2026-05-14','2026-05-14','moka_pipeline_demo','REC-002','pending','telegram_candidate',185000.00,'normal','warning',true,'Moka alarm adayı.'),
('alayli','task','Supabase finance tablolarını kur','SQL Editor sırası: install all, validation safe, health check.','2026-05-14','2026-05-14','NEXT_ACTIONS_FINANCE.md','TASK-001','pending','manual_required',0,'high','warning',false,'Manuel kurulum görevi.'),
('alayli','task','Inject Finance Link workflow çalıştır','Actions üzerinden manuel çalıştırılacak.','2026-05-14','2026-05-14','github_actions','TASK-002','pending','manual_required',0,'normal','warning',false,'Index link workflow.'),
('yenicespor','payable','A Takım değişken ödeme kontrolü','Kalan ödeme kontrol edilmeli.','2026-05-12','2026-05-12','demo_finance_seed','LATE-001','late','needs_approval',35000.00,'high','critical',true,'Geciken ödeme.'),
('woodlet','payable','Levha tedarikçisi ödeme kalanı','Kaynak dosya doğrulanmadan kesin sonuç kabul edilmez.','2026-05-13','2026-05-13','bizimhesap_pipeline_demo','LATE-002','late','unverified',300000.00,'high','critical',true,'Doğrulanmamış geciken ödeme.')
on conflict do nothing;

insert into finance_telegram_alarm_queue
(record_id, company, alarm_type, alarm_level, message, status)
select id, company, 'finance_command_center', alarm_level,
       '[' || company || '] ' || title || ' - ' || amount::text || ' TRY - durum: ' || status,
       'pending'
from finance_command_center_records
where alarm_level in ('warning','critical')
on conflict do nothing;
