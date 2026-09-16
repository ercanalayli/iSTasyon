PRAGMA foreign_keys = ON;

-- Additive to 0022: source/fact/decision/provenance rows remain untouched.
CREATE TABLE IF NOT EXISTS memory_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  source_type TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  actor TEXT NOT NULL,
  scope TEXT NOT NULL,
  company TEXT,
  entity_refs_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(entity_refs_json)),
  task_id TEXT,
  command_id TEXT,
  summary TEXT NOT NULL,
  risk_class TEXT NOT NULL CHECK (risk_class IN ('READ','REVERSIBLE_LOW_RISK','WRITE_EXTERNAL','FINANCIAL')),
  result_status TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  provenance_ref TEXT NOT NULL,
  supersedes_event_id TEXT REFERENCES memory_events(event_id),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  UNIQUE(source_type, source_ref, event_type),
  CHECK (supersedes_event_id IS NULL OR supersedes_event_id <> event_id)
);
CREATE TRIGGER IF NOT EXISTS memory_events_no_update BEFORE UPDATE ON memory_events BEGIN SELECT RAISE(ABORT,'append_only_event'); END;
CREATE TRIGGER IF NOT EXISTS memory_events_no_delete BEFORE DELETE ON memory_events BEGIN SELECT RAISE(ABORT,'append_only_event'); END;
CREATE INDEX IF NOT EXISTS idx_memory_events_time ON memory_events(occurred_at,event_type);
CREATE INDEX IF NOT EXISTS idx_memory_events_task ON memory_events(task_id,command_id);
CREATE INDEX IF NOT EXISTS idx_memory_events_company ON memory_events(company,occurred_at);

CREATE TABLE IF NOT EXISTS memory_objects (
  object_key TEXT PRIMARY KEY,
  object_type TEXT NOT NULL CHECK (object_type IN ('FACT','DECISION','RULE','PREFERENCE','ENTITY','DOCUMENT','EVENT','TASK','RESULT','VERIFICATION')),
  canonical_ref TEXT NOT NULL,
  scope TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  source_event_id TEXT REFERENCES memory_events(event_id),
  supersedes_object_key TEXT REFERENCES memory_objects(object_key),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(object_type,canonical_ref)
);
CREATE INDEX IF NOT EXISTS idx_memory_objects_type ON memory_objects(object_type,scope,status);

CREATE TABLE IF NOT EXISTS memory_documents (
  document_id TEXT PRIMARY KEY,
  drive_file_id TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  version_hash TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_date TEXT,
  related_entities_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(related_entities_json)),
  summary TEXT,
  extracted_fact_keys_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(extracted_fact_keys_json)),
  provenance_ref TEXT NOT NULL,
  superseded_by TEXT REFERENCES memory_documents(document_id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(drive_file_id,version_hash)
);
CREATE INDEX IF NOT EXISTS idx_memory_documents_drive ON memory_documents(drive_file_id,document_date);

CREATE TABLE IF NOT EXISTS memory_entities (
  entity_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person','company','customer','supplier','bank','cash_account','bank_account','document','invoice','expense','shipment','contract','project','application','device')),
  canonical_name TEXT NOT NULL,
  scope TEXT NOT NULL,
  external_ref TEXT,
  provenance_ref TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(entity_type,scope,canonical_name)
);
CREATE TABLE IF NOT EXISTS memory_entity_relations (
  relation_id TEXT PRIMARY KEY,
  subject_entity_id TEXT NOT NULL REFERENCES memory_entities(entity_id),
  predicate TEXT NOT NULL,
  object_entity_id TEXT NOT NULL REFERENCES memory_entities(entity_id),
  valid_from TEXT,
  valid_to TEXT,
  source_event_id TEXT REFERENCES memory_events(event_id),
  provenance_ref TEXT NOT NULL,
  superseded_by TEXT REFERENCES memory_entity_relations(relation_id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(subject_entity_id,predicate,object_entity_id,valid_from)
);
CREATE INDEX IF NOT EXISTS idx_memory_relations_subject ON memory_entity_relations(subject_entity_id,predicate,valid_to);
CREATE INDEX IF NOT EXISTS idx_memory_relations_object ON memory_entity_relations(object_entity_id,predicate,valid_to);
