PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS memory_executions (
  execution_id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  task_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  scope TEXT NOT NULL,
  company TEXT,
  result_status TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  provenance_ref TEXT NOT NULL,
  refs_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(refs_json)),
  task_event_id TEXT NOT NULL REFERENCES memory_events(event_id),
  result_event_id TEXT NOT NULL REFERENCES memory_events(event_id),
  verification_event_id TEXT REFERENCES memory_events(event_id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_memory_executions_scope ON memory_executions(scope,occurred_at);

CREATE TABLE IF NOT EXISTS memory_event_entity_links (
  event_id TEXT NOT NULL REFERENCES memory_events(event_id),
  entity_id TEXT NOT NULL REFERENCES memory_entities(entity_id),
  provenance_ref TEXT NOT NULL,
  PRIMARY KEY(event_id,entity_id)
);

CREATE TABLE IF NOT EXISTS memory_execution_event_links (
  execution_id TEXT NOT NULL REFERENCES memory_executions(execution_id),
  related_event_id TEXT NOT NULL REFERENCES memory_events(event_id),
  relation TEXT NOT NULL,
  provenance_ref TEXT NOT NULL,
  PRIMARY KEY(execution_id,related_event_id,relation)
);

CREATE TABLE IF NOT EXISTS memory_document_candidates (
  candidate_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES memory_documents(document_id),
  version_hash TEXT NOT NULL,
  subject TEXT NOT NULL,
  entity_id TEXT REFERENCES memory_entities(entity_id),
  predicate TEXT NOT NULL,
  object_value TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence>=0 AND confidence<=1),
  source_authority TEXT NOT NULL,
  extraction_method TEXT NOT NULL,
  supporting_location TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('needs_review','awaiting_corroboration','accepted','rejected')),
  provenance_ref TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  UNIQUE(document_id,subject,predicate,object_value,supporting_location)
);
CREATE INDEX IF NOT EXISTS idx_memory_document_candidates_status ON memory_document_candidates(status,document_id);

CREATE TABLE IF NOT EXISTS memory_skill_candidates (
  candidate_key TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,
  scope TEXT NOT NULL,
  verified_executions INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'candidate',
  last_execution_id TEXT NOT NULL REFERENCES memory_executions(execution_id),
  provenance_ref TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
