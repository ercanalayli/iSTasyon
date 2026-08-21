CREATE TABLE IF NOT EXISTS morning_brief_runs (
  run_key TEXT PRIMARY KEY,
  scheduled_at TEXT NOT NULL,
  cron TEXT,
  status TEXT NOT NULL,
  telegram_message_id TEXT,
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_morning_brief_runs_status_scheduled
  ON morning_brief_runs(status, scheduled_at DESC);
