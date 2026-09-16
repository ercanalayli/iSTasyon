-- Production read-only retrieval checks. Correction/supersede is fixture-tested separately.
SELECT 'A_document_no' AS test,COUNT(*) AS matches FROM memory_events WHERE json_extract(metadata_json,'$.document_no')='AI-0646' AND event_type='expense_recorded_verified';
SELECT 'B_first_verified_expense' AS test,event_id,occurred_at FROM memory_events WHERE event_type='expense_recorded_verified' AND verification_status='read_back_verified' ORDER BY occurred_at,event_id LIMIT 1;
SELECT 'C_tea_category' AS test,object_value,status FROM memory_facts WHERE subject='ALAYLI MEDİKAL çay gideri' AND predicate='expense_category' ORDER BY id DESC LIMIT 1;
SELECT 'D_account_relation' AS test,o.canonical_name FROM memory_entity_relations r JOIN memory_entities o ON o.entity_id=r.object_entity_id WHERE r.subject_entity_id='entity:alayli' AND r.predicate='has_account' AND r.superseded_by IS NULL;
SELECT 'E_provenance' AS test,COUNT(*) AS linked_sources FROM memory_fact_sources fs JOIN memory_facts f ON f.id=fs.fact_id WHERE f.fact_key='fact:alayli:chay-expense-category:market';
SELECT 'F_dedupe' AS test,COUNT(*) AS matching_events FROM memory_events WHERE source_type='bizimhesap_readback' AND source_ref='bizimhesap:expense:AI-0646' AND event_type='expense_recorded_verified';
SELECT 'legacy_preserved' AS test,(SELECT COUNT(*) FROM memory_facts) AS facts,(SELECT COUNT(*) FROM memory_decisions) AS decisions,(SELECT COUNT(*) FROM memory_fact_sources) AS provenance;
