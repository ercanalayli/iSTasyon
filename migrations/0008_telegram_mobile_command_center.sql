PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS telegram_command_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_key TEXT NOT NULL UNIQUE,
  chat_id TEXT NOT NULL,
  user_id TEXT,
  message_id TEXT NOT NULL,
  command_code TEXT NOT NULL,
  risk_class TEXT NOT NULL CHECK (risk_class IN ('read','low_risk','approval_required','blocked')),
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  result_summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_telegram_command_status_created
  ON telegram_command_log(status, created_at DESC);

CREATE TABLE IF NOT EXISTS telegram_security_config (
  config_key TEXT PRIMARY KEY,
  config_value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS telegram_capability_registry (
  capability_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  operation_mode TEXT NOT NULL CHECK (operation_mode IN ('read','prepare','write')),
  approval_policy TEXT NOT NULL,
  maturity TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR REPLACE INTO telegram_capability_registry
  (capability_key,title,category,operation_mode,approval_policy,maturity,status)
VALUES
  ('morning_brief','Sabah özeti','system','read','none','live','active'),
  ('system_health','Sistem sağlığı','system','read','none','live','active'),
  ('task_capture','Görev yakalama','work','prepare','none','live','active'),
  ('approval_queue','Onay kuyruğu','governance','read','none','live','active'),
  ('memory_summary','Kalıcı hafıza özeti','memory','read','none','live','active'),
  ('stock_query','Stok sorgusu','operations','read','none','legacy','active'),
  ('balance_query','Bakiye sorgusu','finance','read','none','legacy','active'),
  ('media_capture','Belge ve fotoğraf yakalama','documents','prepare','none','legacy','active'),
  ('bizimhesap_finance_write','BizimHesap mali kayıt','finance','write','single_use_explicit','pilot','guarded'),
  ('bank_action','Banka işlemi','finance','write','blocked','not_connected','blocked');
