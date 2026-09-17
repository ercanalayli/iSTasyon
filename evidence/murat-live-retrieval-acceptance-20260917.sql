PRAGMA foreign_keys=ON;
-- Applied only after tools/accept_murat_live_context.mjs passed in a fresh process.
INSERT OR IGNORE INTO memory_retrieval_acceptance(acceptance_key,object_key,query,answer_hash,provenance_ref) VALUES
('retrieval:murat:contract-ref:20260917','obj:fact:murat:contract-ref','Murat Ticaret ne durumda? / contract_terms','d9638c3a893589241f4cb586edd0232d1553de0f388932b125d0024eaeabe5ca','gmail:1a08515985214614'),
('retrieval:murat:fuel-base:20260917','obj:fact:murat:fuel-base','Güncel fiyat bilgisinin kaynağı ne? / fuel_base','19a6bba3e66cafa3378f5106ba7a6fbd316ba8e879368e3fa7e856ab990a8933','gmail:1a08515985214614'),
('retrieval:murat:fuel-threshold:20260917','obj:fact:murat:fuel-threshold','Akaryakıt eskalasyon kuralı ne ve kaynağı ne?','66e82f4dccf89faea0b5ed94987e680315a190430e398f8aa1159f37','gmail:1a08515985214614');
UPDATE memory_quality SET durable_memory_verified=1,retrieval_verified_at=datetime('now')
WHERE object_key IN ('obj:fact:murat:contract-ref','obj:fact:murat:fuel-base','obj:fact:murat:fuel-threshold')
  AND EXISTS(SELECT 1 FROM memory_retrieval_acceptance a WHERE a.object_key=memory_quality.object_key);
