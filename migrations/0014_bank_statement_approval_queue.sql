Exit code: 0
Wall time: 0.4 seconds
Output:
CREATE TABLE IF NOT EXISTS bank_statement_movements (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'alayli',
  duplicate_key TEXT NOT NULL UNIQUE,
  bank_name TEXT,
  transaction_date TEXT,
  transaction_time TEXT,
  description TEXT,
  amount_in REAL NOT NULL DEFAULT 0,
  amount_out REAL NOT NULL DEFAULT 0,
  balance_after REAL,
  confidence_score REAL NOT NULL DEFAULT 0,
  suggested_counterparty TEXT,
  confirmed_counterparty TEXT,
  counterparty_confirmed INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  source_ref TEXT,
  raw_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'needs_review',
  telegram_message_id TEXT,
  approval_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  decided_at TEXT,
  decided_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_bank_statement_movements_status
  ON bank_statement_movements(company_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_bank_statement_movements_date
  ON bank_statement_movements(company_id, transaction_date, bank_name);

CREATE TABLE IF NOT EXISTS bank_posting_queue (
  id TEXT PRIMARY KEY,
  movement_id TEXT NOT NULL UNIQUE,
  company_id TEXT NOT NULL DEFAULT 'alayli',
  status TEXT NOT NULL DEFAULT 'pending_match',
  payload_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (movement_id) REFERENCES bank_statement_movements(id)
);

CREATE INDEX IF NOT EXISTS idx_bank_posting_queue_status
  ON bank_posting_queue(company_id, status, created_at);

