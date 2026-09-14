PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS memory_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  project_ref TEXT,
  conversation_ref TEXT,
  session_ref TEXT,
  file_path TEXT,
  source_date TEXT,
  ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
  content_hash TEXT NOT NULL,
  last_synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  adapter_status TEXT NOT NULL DEFAULT 'ready',
  metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS memory_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fact_key TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object_value TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'aperion',
  valid_from TEXT,
  valid_to TEXT,
  confidence REAL NOT NULL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'active',
  authority TEXT NOT NULL DEFAULT 'document',
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  supersedes_fact_id INTEGER,
  superseded_by_fact_id INTEGER,
  FOREIGN KEY(supersedes_fact_id) REFERENCES memory_facts(id),
  FOREIGN KEY(superseded_by_fact_id) REFERENCES memory_facts(id)
);

CREATE TABLE IF NOT EXISTS memory_fact_sources (
  fact_id INTEGER NOT NULL,
  source_id INTEGER NOT NULL,
  observed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(fact_id,source_id),
  FOREIGN KEY(fact_id) REFERENCES memory_facts(id),
  FOREIGN KEY(source_id) REFERENCES memory_sources(id)
);

CREATE TABLE IF NOT EXISTS memory_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  decision_key TEXT NOT NULL UNIQUE,
  decision TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'aperion',
  effective_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  source_id INTEGER NOT NULL,
  supersedes_decision_id INTEGER,
  superseded_by_decision_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(source_id) REFERENCES memory_sources(id),
  FOREIGN KEY(supersedes_decision_id) REFERENCES memory_decisions(id),
  FOREIGN KEY(superseded_by_decision_id) REFERENCES memory_decisions(id)
);

CREATE TABLE IF NOT EXISTS memory_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conflict_key TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  fact_a_id INTEGER NOT NULL,
  fact_b_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'needs_review',
  resolution TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY(fact_a_id) REFERENCES memory_facts(id),
  FOREIGN KEY(fact_b_id) REFERENCES memory_facts(id)
);

CREATE TABLE IF NOT EXISTS memory_sync_state (
  source_key TEXT PRIMARY KEY,
  cursor TEXT,
  content_hash TEXT,
  checkpoint_json TEXT,
  status TEXT NOT NULL,
  last_synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_error TEXT,
  FOREIGN KEY(source_key) REFERENCES memory_sources(source_key)
);

CREATE INDEX IF NOT EXISTS idx_memory_facts_lookup ON memory_facts(subject,predicate,status);
CREATE INDEX IF NOT EXISTS idx_memory_decisions_scope ON memory_decisions(scope,status,effective_date);
CREATE INDEX IF NOT EXISTS idx_memory_conflicts_status ON memory_conflicts(status,subject,predicate);
CREATE INDEX IF NOT EXISTS idx_memory_sources_type ON memory_sources(source_type,last_synced_at);
