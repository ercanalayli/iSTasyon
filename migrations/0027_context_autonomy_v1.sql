PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS aperion_working_context (
  task_key TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  state_json TEXT NOT NULL CHECK(json_valid(state_json)),
  previous_intent TEXT,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_aperion_working_expiry ON aperion_working_context(expires_at);

CREATE TABLE IF NOT EXISTS aperion_followups (
  followup_key TEXT PRIMARY KEY,
  entity_ref TEXT,
  thread_ref TEXT,
  lifecycle_type TEXT NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('DRAFT','WAITING_APPROVAL','WAITING_EXTERNAL','RESPONSE_RECEIVED','INVOICE_CANDIDATE','INVOICED','PAYMENT_DUE','COMPLETED','CANCELLED')),
  title TEXT NOT NULL,
  next_action TEXT,
  due_at TEXT,
  source_event_id TEXT REFERENCES memory_events(event_id),
  provenance_ref TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT(datetime('now')),
  created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_aperion_followups_stage ON aperion_followups(stage,due_at);
CREATE INDEX IF NOT EXISTS idx_aperion_followups_thread ON aperion_followups(thread_ref,stage);
