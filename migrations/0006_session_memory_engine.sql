PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS session_checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkpoint_key TEXT NOT NULL UNIQUE,
  session_ref TEXT,
  summary TEXT NOT NULL,
  completed_json TEXT,
  pending_json TEXT,
  blockers_json TEXT,
  next_action TEXT,
  evidence_refs_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS startup_briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brief_key TEXT NOT NULL UNIQUE,
  generated_at TEXT NOT NULL,
  source_snapshot_json TEXT NOT NULL,
  brief_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated'
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_created
  ON session_checkpoints(created_at DESC);

