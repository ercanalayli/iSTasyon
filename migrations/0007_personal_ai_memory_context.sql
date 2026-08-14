PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS conversation_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_key TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL,
  external_ref TEXT,
  active_objective_id INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_turn_at TEXT,
  FOREIGN KEY(active_objective_id) REFERENCES objectives(id)
);

CREATE TABLE IF NOT EXISTS conversation_turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  turn_key TEXT NOT NULL UNIQUE,
  thread_id INTEGER NOT NULL,
  sequence_no INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','assistant','tool','system')),
  content_ref TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  content_hash TEXT,
  privacy_class TEXT NOT NULL DEFAULT 'private',
  UNIQUE(thread_id, sequence_no),
  FOREIGN KEY(thread_id) REFERENCES conversation_threads(id)
);

CREATE TABLE IF NOT EXISTS working_state_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_key TEXT NOT NULL UNIQUE,
  thread_id INTEGER NOT NULL,
  objective_id INTEGER,
  state_json TEXT NOT NULL,
  next_action TEXT,
  evidence_refs_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(thread_id) REFERENCES conversation_threads(id),
  FOREIGN KEY(objective_id) REFERENCES objectives(id)
);

CREATE TABLE IF NOT EXISTS current_state_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fact_key TEXT NOT NULL UNIQUE,
  subject_type TEXT NOT NULL,
  subject_ref TEXT NOT NULL,
  predicate TEXT NOT NULL,
  value_json TEXT NOT NULL,
  truth_state TEXT NOT NULL DEFAULT 'confirmed',
  source_ref TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  valid_until TEXT,
  supersedes_fact_id INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(subject_type, subject_ref, predicate, observed_at),
  FOREIGN KEY(supersedes_fact_id) REFERENCES current_state_facts(id)
);

CREATE TABLE IF NOT EXISTS memory_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_type TEXT NOT NULL,
  from_ref TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  to_type TEXT NOT NULL,
  to_ref TEXT NOT NULL,
  evidence_ref TEXT NOT NULL,
  confidence REAL NOT NULL,
  valid_from TEXT,
  valid_until TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(from_type, from_ref, relation_type, to_type, to_ref, evidence_ref)
);

CREATE TABLE IF NOT EXISTS recall_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recall_key TEXT NOT NULL UNIQUE,
  thread_id INTEGER,
  query_text TEXT NOT NULL,
  filters_json TEXT,
  candidates_json TEXT NOT NULL,
  selected_json TEXT NOT NULL,
  selection_reason TEXT NOT NULL,
  latency_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(thread_id) REFERENCES conversation_threads(id)
);

CREATE TABLE IF NOT EXISTS context_manifests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  context_key TEXT NOT NULL UNIQUE,
  thread_id INTEGER,
  recall_run_id INTEGER,
  working_state_ref TEXT,
  recent_turn_refs_json TEXT NOT NULL,
  memory_refs_json TEXT NOT NULL,
  evidence_refs_json TEXT NOT NULL,
  rule_refs_json TEXT NOT NULL,
  estimated_tokens INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(thread_id) REFERENCES conversation_threads(id),
  FOREIGN KEY(recall_run_id) REFERENCES recall_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_turns_thread_time
  ON conversation_turns(thread_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_working_state_thread_time
  ON working_state_snapshots(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_current_facts_subject
  ON current_state_facts(subject_type, subject_ref, predicate, status);
CREATE INDEX IF NOT EXISTS idx_memory_relations_from
  ON memory_relations(from_type, from_ref, relation_type, status);
CREATE INDEX IF NOT EXISTS idx_memory_relations_to
  ON memory_relations(to_type, to_ref, relation_type, status);

