PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS memory_quality (
  object_key TEXT PRIMARY KEY REFERENCES memory_objects(object_key),
  confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  freshness TEXT NOT NULL DEFAULT 'unknown' CHECK (freshness IN ('current','historical_verified','stale','unknown')),
  valid_from TEXT,
  valid_until TEXT,
  scope TEXT NOT NULL,
  source_authority TEXT NOT NULL,
  last_verified_at TEXT,
  provenance_ref TEXT NOT NULL,
  durable_memory_verified INTEGER NOT NULL DEFAULT 0 CHECK (durable_memory_verified IN (0,1)),
  retrieval_verified_at TEXT
);

CREATE TABLE IF NOT EXISTS memory_retrieval_acceptance (
  acceptance_key TEXT PRIMARY KEY,
  object_key TEXT NOT NULL REFERENCES memory_objects(object_key),
  query TEXT NOT NULL,
  answer_hash TEXT NOT NULL,
  provenance_ref TEXT NOT NULL,
  tested_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_memory_quality_scope ON memory_quality(scope,freshness,durable_memory_verified);

INSERT OR IGNORE INTO memory_quality
  (object_key,confidence,freshness,valid_from,scope,source_authority,last_verified_at,provenance_ref)
SELECT o.object_key,
  CASE WHEN e.source_type='user_correction' THEN 1.0
       WHEN e.verification_status='read_back_verified' THEN 0.99
       WHEN e.verification_status='source_content_verified' THEN 0.95
       ELSE 0.65 END,
  CASE WHEN e.verification_status='read_back_verified' THEN 'historical_verified'
       WHEN e.source_type='user_correction' THEN 'current'
       ELSE 'unknown' END,
  e.occurred_at,o.scope,COALESCE(e.source_type,'unknown'),
  CASE WHEN e.verification_status IN ('read_back_verified','source_content_verified') THEN e.occurred_at ELSE NULL END,
  COALESCE(e.provenance_ref,o.canonical_ref)
FROM memory_objects o LEFT JOIN memory_events e ON e.event_id=o.source_event_id;
