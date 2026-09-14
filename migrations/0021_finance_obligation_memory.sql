CREATE TABLE IF NOT EXISTS finance_obligations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  obligation_key TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL CHECK(scope IN ('ALAYLI','SAHSI','BELIRSIZ')),
  obligation_type TEXT NOT NULL CHECK(obligation_type IN ('credit_card','tax','sgk','rent','loan','utility','supplier_invoice','subscription','other')),
  institution TEXT,
  counterparty TEXT,
  account_masked TEXT,
  statement_date TEXT,
  due_date TEXT,
  total_amount REAL,
  minimum_amount REAL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  status TEXT NOT NULL DEFAULT 'needs_review' CHECK(status IN ('open','due_soon','overdue','paid','archived','needs_review')),
  source_evidence_key TEXT NOT NULL,
  source_message_id TEXT,
  document_hash TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  confidence REAL NOT NULL DEFAULT 0,
  collection_state TEXT,
  paid_at TEXT,
  matched_transaction_key TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_finance_obligations_due ON finance_obligations(status,due_date);
CREATE INDEX IF NOT EXISTS idx_finance_obligations_scope ON finance_obligations(scope,status);

CREATE TABLE IF NOT EXISTS finance_payment_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_key TEXT NOT NULL UNIQUE,
  obligation_key TEXT,
  evidence_key TEXT NOT NULL,
  amount REAL,
  transaction_date TEXT,
  confidence REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('paid','needs_review')),
  reasons_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(obligation_key) REFERENCES finance_obligations(obligation_key)
);

CREATE TABLE IF NOT EXISTS finance_obligation_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  obligation_key TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  local_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(obligation_key,risk_level,local_date)
);
