CREATE TABLE IF NOT EXISTS telegram_captures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  file_id TEXT NOT NULL,
  mime_type TEXT,
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(chat_id,message_id)
);

CREATE TABLE IF NOT EXISTS personal_entity_aliases (
  alias_key TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  relationship TEXT,
  default_category TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

INSERT INTO personal_entity_aliases (alias_key,canonical_name,relationship,default_category)
VALUES ('ege','Ege','oğlu','Harçlık')
ON CONFLICT(alias_key) DO UPDATE SET canonical_name=excluded.canonical_name,
relationship=excluded.relationship,default_category=excluded.default_category,active=1,
updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');

CREATE TABLE IF NOT EXISTS personal_finance_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key TEXT NOT NULL UNIQUE,
  evidence_key TEXT NOT NULL,
  chat_id TEXT,
  telegram_message_id TEXT,
  document_type TEXT,
  direction TEXT NOT NULL,
  scope TEXT NOT NULL,
  counterparty TEXT NOT NULL,
  relationship TEXT,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  transaction_date TEXT NOT NULL,
  source_account TEXT,
  target_account TEXT,
  bank_name TEXT,
  reference_no TEXT,
  description TEXT,
  confidence REAL NOT NULL,
  evidence_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'recorded',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_personal_finance_events_party_date
  ON personal_finance_events(counterparty,transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_personal_finance_events_category_date
  ON personal_finance_events(category,transaction_date DESC);

ALTER TABLE telegram_captures ADD COLUMN file_name TEXT;
ALTER TABLE telegram_captures ADD COLUMN file_size INTEGER;
ALTER TABLE telegram_captures ADD COLUMN extraction_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE telegram_captures ADD COLUMN financial_event_key TEXT;
ALTER TABLE telegram_captures ADD COLUMN processed_at TEXT;
ALTER TABLE telegram_captures ADD COLUMN error_code TEXT;
