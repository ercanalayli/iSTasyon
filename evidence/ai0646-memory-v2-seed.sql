-- Idempotent, verified historical memory ingestion. No BizimHesap write.
INSERT OR IGNORE INTO memory_events(event_id,event_type,occurred_at,source_type,source_ref,actor,scope,company,entity_refs_json,summary,risk_class,result_status,verification_status,provenance_ref,metadata_json)
VALUES('evt:ai0646:verified','expense_recorded_verified','2026-09-16T00:00:00.000Z','bizimhesap_readback','bizimhesap:expense:AI-0646','ApeirON','ALAYLI MEDİKAL','ALAYLI MEDİKAL','["entity:alayli","entity:ercan-nakit","entity:ai0646"]','AI-0646: 50 TRY MARKET gideri, Ercan Nakit Kasa, ödenmiş; BizimHesap read-back doğrulandı.','FINANCIAL','completed_verified','read_back_verified','bizimhesap:expense:AI-0646','{"document_no":"AI-0646","amount":50,"currency":"TRY","category":"MARKET","payment_account":"Ercan Nakit Kasa","paid_status":"Ödenmiş","duplicate":false,"verification_method":"BizimHesap GetAllCosts read-back"}');

INSERT OR IGNORE INTO memory_events(event_id,event_type,occurred_at,source_type,source_ref,actor,scope,company,entity_refs_json,summary,risk_class,result_status,verification_status,provenance_ref,metadata_json)
VALUES('evt:chay-market:user-correction','user_rule_correction','2026-09-16T00:00:00.000Z','user_correction','user-correction:chay-market-20260916','user','ALAYLI MEDİKAL','ALAYLI MEDİKAL','["entity:alayli"]','ALAYLI bağlamında çay / çay masrafı / çay gideri MARKET kategorisidir.','READ','candidate','corroborated','user-correction:chay-market-20260916','{"document_no":"AI-0646","category":"MARKET"}');

INSERT OR IGNORE INTO memory_sources(source_key,source_type,source_date,content_hash,adapter_status)
VALUES('bizimhesap:expense:AI-0646','bizimhesap_readback','2026-09-16','f5953454b5d19a1449c85b7ef5eb1f8360263eed892153a5cf61d1932ef3b92a','verified');
INSERT OR IGNORE INTO memory_sources(source_key,source_type,source_date,content_hash,adapter_status)
VALUES('user-correction:chay-market-20260916','user_correction','2026-09-16','b16bfd06ac3b403148318ae14bde95986aef0d4b4a6c25377064de9680d7a0e1','verified');

INSERT OR IGNORE INTO memory_facts(fact_key,subject,predicate,object_value,scope,valid_from,confidence,status,authority)
VALUES('fact:alayli:chay-expense-category:market','ALAYLI MEDİKAL çay gideri','expense_category','MARKET','ALAYLI MEDİKAL','2026-09-16',1,'active','user_correction');
INSERT OR IGNORE INTO memory_fact_sources(fact_id,source_id)
SELECT f.id,s.id FROM memory_facts f,memory_sources s WHERE f.fact_key='fact:alayli:chay-expense-category:market' AND s.source_key IN ('bizimhesap:expense:AI-0646','user-correction:chay-market-20260916');

INSERT OR IGNORE INTO memory_entities(entity_id,entity_type,canonical_name,scope,external_ref,provenance_ref) VALUES
('entity:alayli','company','ALAYLI MEDİKAL','ALAYLI MEDİKAL',NULL,'bizimhesap:expense:AI-0646'),
('entity:bizimhesap','application','BizimHesap','ALAYLI MEDİKAL',NULL,'bizimhesap:expense:AI-0646'),
('entity:ercan-nakit','cash_account','Ercan Nakit Kasa','ALAYLI MEDİKAL',NULL,'bizimhesap:expense:AI-0646'),
('entity:ai0646','expense','AI-0646','ALAYLI MEDİKAL','AI-0646','bizimhesap:expense:AI-0646');

INSERT OR IGNORE INTO memory_entity_relations(relation_id,subject_entity_id,predicate,object_entity_id,valid_from,source_event_id,provenance_ref) VALUES
('rel:alayli:uses:bizimhesap','entity:alayli','uses','entity:bizimhesap','2026-09-16','evt:ai0646:verified','bizimhesap:expense:AI-0646'),
('rel:alayli:has-account:ercan-nakit','entity:alayli','has_account','entity:ercan-nakit','2026-09-16','evt:ai0646:verified','bizimhesap:expense:AI-0646'),
('rel:alayli:recorded:ai0646','entity:alayli','recorded_expense','entity:ai0646','2026-09-16','evt:ai0646:verified','bizimhesap:expense:AI-0646'),
('rel:ai0646:paid-from:ercan-nakit','entity:ai0646','paid_from','entity:ercan-nakit','2026-09-16','evt:ai0646:verified','bizimhesap:expense:AI-0646');

INSERT OR IGNORE INTO memory_objects(object_key,object_type,canonical_ref,scope,source_event_id) VALUES
('obj:event:ai0646','EVENT','evt:ai0646:verified','ALAYLI MEDİKAL','evt:ai0646:verified'),
('obj:result:ai0646','RESULT','AI-0646:completed_verified','ALAYLI MEDİKAL','evt:ai0646:verified'),
('obj:verification:ai0646','VERIFICATION','AI-0646:read_back_verified','ALAYLI MEDİKAL','evt:ai0646:verified'),
('obj:rule:alayli:chay-market','RULE','ALAYLI MEDİKAL:çay→MARKET','ALAYLI MEDİKAL','evt:chay-market:user-correction'),
('obj:fact:alayli:chay-market','FACT','fact:alayli:chay-expense-category:market','ALAYLI MEDİKAL','evt:chay-market:user-correction'),
('obj:entity:alayli','ENTITY','entity:alayli','ALAYLI MEDİKAL','evt:ai0646:verified'),
('obj:entity:ai0646','ENTITY','entity:ai0646','ALAYLI MEDİKAL','evt:ai0646:verified');
