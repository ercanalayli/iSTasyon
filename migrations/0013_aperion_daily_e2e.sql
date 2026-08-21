CREATE TABLE IF NOT EXISTS daily_e2e_runs (
  run_key TEXT PRIMARY KEY,
  checked_at TEXT NOT NULL,
  status TEXT NOT NULL,
  checks_json TEXT NOT NULL,
  telegram_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_daily_e2e_status_checked
  ON daily_e2e_runs(status, checked_at DESC);
