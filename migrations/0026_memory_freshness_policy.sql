ALTER TABLE memory_quality ADD COLUMN freshness_policy TEXT NOT NULL DEFAULT 'source_review';

UPDATE memory_quality SET freshness_policy='until_superseded'
WHERE source_authority IN ('user_correction','codex_computer_use_readback','bizimhesap_readback');

UPDATE memory_quality SET confidence=1.0,source_authority='user_correction+verified_bizimhesap',freshness_policy='until_superseded'
WHERE object_key IN (
  SELECT o.object_key FROM memory_objects o JOIN memory_facts f ON o.object_type='FACT' AND o.canonical_ref=f.fact_key
  WHERE f.subject LIKE '%çay%' AND f.predicate='expense_category' AND f.object_value='MARKET' AND f.status='active'
);
