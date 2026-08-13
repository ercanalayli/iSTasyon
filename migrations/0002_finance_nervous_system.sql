PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS evidence_inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evidence_key TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  source_account TEXT,
  source_message_id TEXT,
  received_at TEXT NOT NULL,
  document_type TEXT,
  file_name TEXT,
  mime_type TEXT,
  drive_file_id TEXT,
  content_hash TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  classification_confidence REAL,
  extraction_json TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evidence_status_received
  ON evidence_inbox(status, received_at DESC);

CREATE TABLE IF NOT EXISTS parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_name TEXT NOT NULL,
  tax_number TEXT,
  bizimhesap_customer_ref TEXT,
  bizimhesap_supplier_ref TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(canonical_name, tax_number)
);

CREATE TABLE IF NOT EXISTS proposed_finance_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_key TEXT NOT NULL UNIQUE,
  evidence_id INTEGER NOT NULL,
  economic_event_key TEXT NOT NULL UNIQUE,
  entry_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  party_id INTEGER,
  cari_role TEXT,
  transaction_date TEXT,
  due_date TEXT,
  amount REAL,
  currency TEXT DEFAULT 'TRY',
  bank_name TEXT,
  cheque_serial_no TEXT,
  document_no TEXT,
  audit_note TEXT NOT NULL,
  confidence REAL,
  validation_json TEXT,
  status TEXT NOT NULL DEFAULT 'needs_review',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(evidence_id) REFERENCES evidence_inbox(id),
  FOREIGN KEY(party_id) REFERENCES parties(id)
);

CREATE INDEX IF NOT EXISTS idx_proposals_status_created
  ON proposed_finance_entries(status, created_at DESC);

CREATE TABLE IF NOT EXISTS reconciliation_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL,
  check_type TEXT NOT NULL,
  result TEXT NOT NULL,
  match_ref TEXT,
  details_json TEXT,
  checked_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(proposal_id) REFERENCES proposed_finance_entries(id)
);

CREATE TABLE IF NOT EXISTS execution_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_key TEXT NOT NULL UNIQUE,
  proposal_id INTEGER NOT NULL UNIQUE,
  approval_id INTEGER NOT NULL,
  target TEXT NOT NULL DEFAULT 'bizimhesap',
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  external_record_ref TEXT,
  queued_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  verified_at TEXT,
  FOREIGN KEY(proposal_id) REFERENCES proposed_finance_entries(id),
  FOREIGN KEY(approval_id) REFERENCES approval_queue(id)
);

CREATE INDEX IF NOT EXISTS idx_execution_jobs_status
  ON execution_jobs(status, queued_at);

CREATE TABLE IF NOT EXISTS sync_cursors (
  source_key TEXT PRIMARY KEY,
  cursor_value TEXT,
  last_success_at TEXT,
  checked_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'new',
  error_code TEXT,
  message TEXT
);

