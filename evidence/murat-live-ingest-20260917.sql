PRAGMA foreign_keys=ON;

-- Live Gmail evidence observed 2026-09-17. Summaries only; no MIME body or attachments.
INSERT OR IGNORE INTO memory_entities(entity_id,entity_type,canonical_name,scope,provenance_ref)
VALUES('entity:murat-ticaret','company','Murat Ticaret','MURAT TİCARET','gmail:19f36e84a3370e08');

INSERT OR IGNORE INTO memory_sources(source_key,source_type,source_date,content_hash,adapter_status,metadata_json) VALUES
('gmail:19f36e84a3370e08','gmail','2026-07-06T10:10:03Z','daa97ef46f2b65fac2eeb8efc33151fc369a521550d1489e598ba44058007fc8','verified','{"thread_id":"19f36e84a3370e08","subject":"RE: Alaylı Nakliyat Söz. Hk.","from":"Sercan Mutlu / Murat Ticaret","to":"Alaylı Medikal","hash_basis":"verified_summary"}'),
('gmail:19fa76e1f31ca52b','gmail','2026-07-28T06:33:49Z','95fefee40dc14839b7de83334a67f9be6ca854eb6d5da9913d6701653338bfad','verified','{"thread_id":"19f36e84a3370e08","subject":"RE: Alaylı Nakliyat Söz. Hk.","from":"Sercan Mutlu / Murat Ticaret","to":"Alaylı Medikal","hash_basis":"verified_summary"}'),
('gmail:19fc5f828ec8c669','gmail','2026-08-03T04:53:14Z','49687c4a4df40f912affa7ffc7a30c1c0e911ec70642ba3648419dbec16d54e6','verified','{"thread_id":"19fc5f828ec8c669","subject":"KONTROL","from":"MT İnegöl Sevkiyat / Murat Ticaret","to":"Alaylı Medikal","hash_basis":"verified_summary"}'),
('gmail:19feb7269d790697','gmail','2026-08-10T11:32:51Z','17051b966a3695ae53aeaf3fd23c0a12f6c92a8f76a30e304353e54afe90e91f','verified','{"thread_id":"19fc5f828ec8c669","subject":"Re: KONTROL","from":"Alaylı Medikal","to":"MT İnegöl Sevkiyat / Murat Ticaret","hash_basis":"verified_summary"}'),
('gmail:19ff12e28eb4dafe','gmail','2026-08-11T14:15:53Z','c31deaf76da597197aa0511576a92f1ac41ccfd6b3a99c8ef125f77b7fdc45a3','verified','{"thread_id":"19fc5f828ec8c669","subject":"FW: KONTROL","from":"Volkan Ağbulak / Murat Ticaret","to":"Alaylı Medikal","hash_basis":"verified_summary"}'),
('gmail:1a071e6acd25d741','gmail','2026-09-05T14:08:58Z','ec7751aad5c1ffd01ac31cc9278bbb271c22f690be535422c03e2ff2d9740ec7','verified','{"thread_id":"1a0610ed0e3b4c89","subject":"RE: ALAYLI","from":"Alaylı Medikal","to":"Hayrullah Arslan / Murat Ticaret","hash_basis":"verified_summary"}'),
('gmail:1a08515985214614','gmail','2026-09-09T07:33:00Z','aeeea9d79fcce52a99729eeb5caa9f5c2042305f4e36c75fe84e25452f3fd9a1','verified','{"thread_id":"19f36e84a3370e08","subject":"RE: Alaylı Nakliyat Söz. Hk.","from":"Ercan Alaylı / Alaylı Medikal","to":"Sercan Mutlu / Murat Ticaret","hash_basis":"verified_summary"}');

INSERT OR IGNORE INTO memory_events(event_id,event_type,occurred_at,source_type,source_ref,actor,scope,company,entity_refs_json,summary,risk_class,result_status,verification_status,provenance_ref) VALUES
('evt:murat:contract-received','gmail_message_verified','2026-07-06T10:10:03Z','gmail','gmail:19f36e84a3370e08','Sercan Mutlu','MURAT TİCARET','Murat Ticaret','["entity:murat-ticaret"]','Kaşeli ve imzalı nakliye sözleşmesinin ekli gönderildiği bildirildi; ek içeriği bu kabulde okunmadı.','READ','observed','source_content_verified','gmail:19f36e84a3370e08'),
('evt:murat:terminal-approved','gmail_message_verified','2026-07-28T06:33:49Z','gmail','gmail:19fa76e1f31ca52b','Sercan Mutlu','MURAT TİCARET','Murat Ticaret','["entity:murat-ticaret"]','Murat yönetiminin İnegöl Fabrika–İnegöl Terminal teklifini onayladığı bildirildi.','READ','observed','source_content_verified','gmail:19fa76e1f31ca52b'),
('evt:murat:july-inbound','INBOUND_RECEIVED','2026-08-03T04:53:14Z','gmail','gmail:19fc5f828ec8c669','MT İnegöl Sevkiyat','MURAT TİCARET','Murat Ticaret','["entity:murat-ticaret"]','Temmuz sevkiyat listesi kontrol ve fiyatlandırma için gönderildi.','READ','observed','source_content_verified','gmail:19fc5f828ec8c669'),
('evt:murat:july-action','ACTION_IDENTIFIED','2026-08-10T11:32:51Z','gmail','gmail:19feb7269d790697','Alaylı Medikal','MURAT TİCARET','Murat Ticaret','["entity:murat-ticaret"]','İnegöl–Sakarya 7–10 için 11.000 TL tarihsel teklif iletildi; güncel tarife sayılmaz.','READ','observed','source_content_verified','gmail:19feb7269d790697'),
('evt:murat:july-response','RESPONSE_RECEIVED','2026-08-11T14:15:53Z','gmail','gmail:19ff12e28eb4dafe','Volkan Ağbulak','MURAT TİCARET','Murat Ticaret','["entity:murat-ticaret"]','Murat Ticaret fatura düzenlenebileceğini yazdı.','READ','observed','source_content_verified','gmail:19ff12e28eb4dafe'),
('evt:murat:aug-invoice-sent','gmail_message_verified','2026-09-05T14:08:58Z','gmail','gmail:1a071e6acd25d741','Alaylı Medikal','MURAT TİCARET','Murat Ticaret','["entity:murat-ticaret"]','Ağustos 2026 nakliye faturası M012026000000200 ve fiyatlandırılmış sevkiyat dosyasının gönderildiği bildirildi; ödeme doğrulanmadı.','READ','observed','source_content_verified','gmail:1a071e6acd25d741'),
('evt:murat:escalation-mail','gmail_message_verified','2026-09-09T07:33:00Z','gmail','gmail:1a08515985214614','Ercan Alaylı','MURAT TİCARET','Murat Ticaret','["entity:murat-ticaret"]','2026/KT-001 sözleşmesinin yakıt eskalasyonu 4–5. maddelerine dayanarak Ağustos %5,1146 navlun farkı ve fatura teyidi istendi; karşı taraf yanıtı doğrulanmadı.','READ','observed','source_content_verified','gmail:1a08515985214614'),
('evt:murat:escalation-wait','WAITING_EXTERNAL','2026-09-09T07:33:00Z','gmail','gmail:1a08515985214614:waiting','AperiON','MURAT TİCARET','Murat Ticaret','["entity:murat-ticaret"]','Ağustos yakıt eskalasyonu ve fiyat farkı faturası için Murat Ticaret teyidi bekleniyor.','READ','open','source_content_verified','gmail:1a08515985214614'),
('evt:murat:july-next-action','NEXT_ACTION','2026-08-11T14:15:53Z','gmail','gmail:19ff12e28eb4dafe:next','AperiON','MURAT TİCARET','Murat Ticaret','["entity:murat-ticaret"]','Temmuz teklif/onay zincirinin sonraki adımı faturalamaydı; eski tamamlanmış döngü bugünün açık işi değildir.','READ','historical','source_content_verified','gmail:19ff12e28eb4dafe');

INSERT OR IGNORE INTO memory_event_entity_links(event_id,entity_id,provenance_ref)
SELECT event_id,'entity:murat-ticaret',provenance_ref FROM memory_events WHERE event_id LIKE 'evt:murat:%';

INSERT OR IGNORE INTO memory_facts(fact_key,subject,predicate,object_value,scope,valid_from,confidence,status,authority) VALUES
('fact:murat:contract-ref','Murat Ticaret','contract_reference','23.05.2026 tarihli 2026/KT-001; yakıt eskalasyonu maddeleri 4–5 (9 Eylül e-postasında aktarıldı)','MURAT TİCARET','2026-09-09T07:33:00Z',0.85,'active','verified_email'),
('fact:murat:fuel-base','Murat Ticaret','price_fuel_base','KDV dahil 68,04 TL/L motorin (2026/KT-001; e-posta beyanı)','MURAT TİCARET','2026-09-09T07:33:00Z',0.85,'active','verified_email'),
('fact:murat:fuel-threshold','Murat Ticaret','price_fuel_escalation_rule','Baz motorin fiyatının %10 üzeri: 74,844 TL/L eşik (2026/KT-001; e-posta beyanı)','MURAT TİCARET','2026-09-09T07:33:00Z',0.85,'active','verified_email'),
('fact:murat:terminal-approval','Murat Ticaret','terminal_offer_approval_2026_07_28','İnegöl Fabrika–İnegöl Terminal teklifi Murat yönetimince onaylandı','MURAT TİCARET','2026-07-28T06:33:49Z',0.95,'active','verified_email');

INSERT OR IGNORE INTO memory_fact_sources(fact_id,source_id)
SELECT f.id,s.id FROM memory_facts f JOIN memory_sources s ON
  s.source_key=CASE WHEN f.fact_key='fact:murat:terminal-approval' THEN 'gmail:19fa76e1f31ca52b' ELSE 'gmail:1a08515985214614' END
WHERE f.fact_key LIKE 'fact:murat:%';

INSERT OR IGNORE INTO memory_objects(object_key,object_type,canonical_ref,scope,source_event_id)
SELECT 'obj:'||f.fact_key,'FACT',f.fact_key,f.scope,
  CASE WHEN f.fact_key='fact:murat:terminal-approval' THEN 'evt:murat:terminal-approved' ELSE 'evt:murat:escalation-mail' END
FROM memory_facts f WHERE f.fact_key LIKE 'fact:murat:%';

INSERT OR IGNORE INTO memory_quality(object_key,confidence,freshness,valid_from,scope,source_authority,last_verified_at,provenance_ref,freshness_policy)
SELECT 'obj:'||f.fact_key,f.confidence,CASE WHEN f.fact_key='fact:murat:terminal-approval' THEN 'historical_verified' ELSE 'current' END,
  f.valid_from,f.scope,'verified_email',f.valid_from,
  CASE WHEN f.fact_key='fact:murat:terminal-approval' THEN 'gmail:19fa76e1f31ca52b' ELSE 'gmail:1a08515985214614' END,
  CASE WHEN f.fact_key='fact:murat:terminal-approval' THEN 'historical_event' ELSE 'contract_365d' END
FROM memory_facts f WHERE f.fact_key LIKE 'fact:murat:%';

INSERT OR IGNORE INTO memory_decisions(decision_key,decision,scope,effective_date,source_id)
SELECT 'decision:murat:terminal-approved','Murat yönetimi İnegöl Fabrika–İnegöl Terminal teklifini 28.07.2026 tarihinde onayladı.','MURAT TİCARET','2026-07-28T06:33:49Z',id
FROM memory_sources WHERE source_key='gmail:19fa76e1f31ca52b';

INSERT OR IGNORE INTO aperion_followups(followup_key,entity_ref,thread_ref,lifecycle_type,stage,title,next_action,source_event_id,provenance_ref)
VALUES('followup:murat:aug2026-fuel-escalation','Murat Ticaret','thread:13ffc8821305f9d36bc9aa010c1833a0918c9596fc2e9c361e0c089bb60aec10','contract_escalation','WAITING_EXTERNAL','Murat Ticaret: Ağustos yakıt eskalasyonu teyidi','Sercan Mutlu yanıtını kontrol et; teyit yoksa fiyat farkı faturasını onaylanmış sayma.','evt:murat:escalation-wait','gmail:1a08515985214614');

INSERT OR IGNORE INTO aperion_followups(followup_key,entity_ref,thread_ref,lifecycle_type,stage,title,next_action,source_event_id,provenance_ref)
VALUES('followup:murat:july2026-freight','Murat Ticaret','gmail-thread:19fc5f828ec8c669','freight_approval','COMPLETED','Murat Ticaret: Temmuz sevkiyat teklif/onay döngüsü',NULL,'evt:murat:july-next-action','gmail:19ff12e28eb4dafe');

INSERT OR IGNORE INTO source_health(source_key,status,error_code,message,last_success_at,checked_at,evidence_ref)
VALUES('computer_use_chrome','blocked','DEGRADED_EXECUTION_CHANNEL','Chrome URL verification failed; independent Gmail/Drive/Memory channels remain available',NULL,datetime('now'),'computer_use:chrome-url-verification:2026-09-17');
INSERT OR IGNORE INTO work_items(work_key,objective_id,action_type,title,owner,status,approval_required,idempotency_key,verification_rule)
VALUES('issue:computer-use-chrome-url-verification',3,'technical_issue','Computer Use Chrome URL verification degraded','AperiON development','open',0,'issue:computer-use-chrome-url-verification','Computer Use can safely verify Chrome URL and read-only BizimHesap account');
