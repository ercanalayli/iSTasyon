PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS connector_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connector_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  adapter_type TEXT NOT NULL,
  data_owner TEXT NOT NULL DEFAULT 'ercan',
  privacy_class TEXT NOT NULL DEFAULT 'private',
  maturity TEXT NOT NULL DEFAULT 'declared',
  status TEXT NOT NULL DEFAULT 'inactive',
  health_source_key TEXT,
  config_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS connector_capabilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connector_id INTEGER NOT NULL,
  capability_key TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'read',
  approval_policy TEXT NOT NULL DEFAULT 'none',
  evidence_required INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'declared',
  UNIQUE(connector_id, capability_key),
  FOREIGN KEY(connector_id) REFERENCES connector_registry(id)
);

CREATE TABLE IF NOT EXISTS connector_sync_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_key TEXT NOT NULL UNIQUE,
  connector_id INTEGER NOT NULL,
  capability_id INTEGER,
  cursor_value TEXT,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  records_seen INTEGER NOT NULL DEFAULT 0,
  records_accepted INTEGER NOT NULL DEFAULT 0,
  records_rejected INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  FOREIGN KEY(connector_id) REFERENCES connector_registry(id),
  FOREIGN KEY(capability_id) REFERENCES connector_capabilities(id)
);

CREATE INDEX IF NOT EXISTS idx_connector_sync_status
  ON connector_sync_jobs(status, requested_at);

CREATE TABLE IF NOT EXISTS canonical_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key TEXT NOT NULL UNIQUE,
  connector_id INTEGER NOT NULL,
  external_ref TEXT,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  truth_state TEXT NOT NULL DEFAULT 'confirmed',
  subject_type TEXT,
  subject_ref TEXT,
  payload_json TEXT NOT NULL,
  evidence_ref TEXT,
  content_hash TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(connector_id) REFERENCES connector_registry(id)
);

CREATE INDEX IF NOT EXISTS idx_canonical_events_type_date
  ON canonical_events(event_type, occurred_at DESC);

INSERT OR IGNORE INTO connector_registry
  (connector_key,title,category,adapter_type,privacy_class,maturity,status,health_source_key)
VALUES
  ('whatsapp','WhatsApp','communication','browser','private','declared','inactive','whatsapp'),
  ('telegram','Telegram','communication','webhook','private','connected','active','telegram'),
  ('gmail','Gmail','communication','google_apps_script','private','declared','inactive','gmail'),
  ('google_calendar','Google Takvim','calendar','google_apps_script','private','declared','inactive','google_calendar'),
  ('google_drive','Google Drive','documents','connector','private','verified','active','google_drive'),
  ('bizimhesap','BizimHesap','erp_accounting','local_browser_adapter','restricted','connected','active','bizimhesap'),
  ('apsiyon','Apsiyon','home_property','local_browser_adapter','highly_private','connected','active','apsiyon'),
  ('hattat','Hattat Mali Müşavirlik','accounting_advisor','local_browser_adapter','restricted','connected','active','hattat'),
  ('bank_statements','Banka Ekstreleri','banking','document_and_email','restricted','connected','active','bank_statements');

INSERT OR IGNORE INTO connector_capabilities(connector_id,capability_key,direction,approval_policy,evidence_required,status)
SELECT id,'read_home_dues','read','none',1,'connected' FROM connector_registry WHERE connector_key='apsiyon';
INSERT OR IGNORE INTO connector_capabilities(connector_id,capability_key,direction,approval_policy,evidence_required,status)
SELECT id,'read_property_accruals','read','none',1,'connected' FROM connector_registry WHERE connector_key='apsiyon';
INSERT OR IGNORE INTO connector_capabilities(connector_id,capability_key,direction,approval_policy,evidence_required,status)
SELECT id,'read_tax_and_accounting_status','read','none',1,'connected' FROM connector_registry WHERE connector_key='hattat';
INSERT OR IGNORE INTO connector_capabilities(connector_id,capability_key,direction,approval_policy,evidence_required,status)
SELECT id,'prepare_accounting_action','prepare','action_time',1,'declared' FROM connector_registry WHERE connector_key='hattat';
INSERT OR IGNORE INTO connector_capabilities(connector_id,capability_key,direction,approval_policy,evidence_required,status)
SELECT id,'post_accounting_record','write','action_time',1,'connected' FROM connector_registry WHERE connector_key='bizimhesap';

