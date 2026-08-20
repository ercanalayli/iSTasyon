PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS telegram_command_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_key TEXT NOT NULL UNIQUE,
  chat_id TEXT NOT NULL,
  user_id TEXT,
  message_id TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  intent_code TEXT NOT NULL,
  category TEXT NOT NULL,
  target TEXT,
  risk_class TEXT NOT NULL CHECK (risk_class IN ('read','low_risk','approval_required','blocked')),
  approval_policy TEXT NOT NULL,
  execution_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  external_queue_id TEXT,
  result_summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_telegram_command_requests_status_created
  ON telegram_command_requests(status, created_at DESC);

INSERT OR REPLACE INTO telegram_capability_registry
  (capability_key,title,category,operation_mode,approval_policy,maturity,status)
VALUES
  ('natural_language_router','Doğal dil komut yönlendiricisi','system','prepare','risk_based','verified','active'),
  ('desktop_open','Masaüstünde güvenli uygulama açma','desktop','write','none','connected','active'),
  ('unmapped_command_capture','Bilinmeyen komut yakalama','system','prepare','review_if_unmapped','verified','active'),
  ('communication_action','Mesaj ve e-posta gönderimi','communication','write','single_use_explicit','declared','guarded'),
  ('delete_action','Silme ve iptal işlemi','governance','write','single_use_explicit','declared','guarded'),
  ('access_action','Yetki ve erişim değişikliği','security','write','single_use_explicit','declared','guarded'),
  ('purchase_action','Satınalma ve sipariş oluşturma','finance','write','single_use_explicit','declared','guarded');
