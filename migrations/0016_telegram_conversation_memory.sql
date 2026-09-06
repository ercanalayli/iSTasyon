CREATE TABLE IF NOT EXISTS telegram_conversation_turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(chat_id,message_id,role)
);

CREATE INDEX IF NOT EXISTS idx_telegram_conversation_chat_created
  ON telegram_conversation_turns(chat_id,created_at DESC);
