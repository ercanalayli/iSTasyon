CREATE TABLE IF NOT EXISTS aperion_devices (
  device_id TEXT PRIMARY KEY,
  device_name TEXT NOT NULL,
  token_sha256 TEXT NOT NULL,
  allowed_chat_id TEXT NOT NULL,
  scopes_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_aperion_devices_token ON aperion_devices(token_sha256, status);

CREATE TABLE IF NOT EXISTS aperion_device_nonces (
  nonce TEXT PRIMARY KEY,
  used_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS aperion_device_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_key TEXT NOT NULL UNIQUE,
  chat_id TEXT NOT NULL,
  command TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  claimed_by TEXT,
  result_summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  claimed_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_aperion_device_commands_queue
  ON aperion_device_commands(status, chat_id, command, id);
