CREATE TABLE IF NOT EXISTS diaper_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_key TEXT NOT NULL UNIQUE,
  chat_id TEXT NOT NULL,
  telegram_message_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  order_date TEXT NOT NULL,
  price_list_name TEXT NOT NULL DEFAULT 'Mayıs 2026',
  discount_note TEXT NOT NULL DEFAULT 'İskonto yok',
  special_list_note TEXT NOT NULL DEFAULT 'Standart liste',
  source_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  data_quality TEXT NOT NULL DEFAULT 'review',
  blocker_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(chat_id, telegram_message_id)
);

CREATE TABLE IF NOT EXISTS diaper_order_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  line_no INTEGER NOT NULL,
  raw_text TEXT NOT NULL,
  brand TEXT,
  product_kind TEXT,
  size TEXT,
  bale_quantity INTEGER NOT NULL,
  packages_per_bale INTEGER NOT NULL,
  package_quantity INTEGER NOT NULL,
  units_per_package INTEGER NOT NULL,
  total_units INTEGER NOT NULL,
  catalog_product_id TEXT,
  catalog_product_name TEXT,
  unit_price_ex_vat REAL,
  vat_rate REAL,
  discount_rate REAL NOT NULL DEFAULT 0,
  match_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(order_id) REFERENCES diaper_orders(id),
  UNIQUE(order_id, line_no)
);

CREATE TABLE IF NOT EXISTS diaper_operation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_at TEXT NOT NULL,
  source TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(order_id) REFERENCES diaper_orders(id)
);

CREATE TABLE IF NOT EXISTS diaper_proforma_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_key TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'approval_pending',
  approval_id TEXT,
  external_queue_id TEXT,
  bizimhesap_document_id TEXT,
  bizimhesap_document_no TEXT,
  evidence_ref TEXT,
  result_summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(order_id) REFERENCES diaper_orders(id)
);

CREATE INDEX IF NOT EXISTS idx_diaper_orders_status_date
  ON diaper_orders(status, order_date, id);
CREATE INDEX IF NOT EXISTS idx_diaper_lines_order
  ON diaper_order_lines(order_id, line_no);
CREATE INDEX IF NOT EXISTS idx_diaper_events_order
  ON diaper_operation_events(order_id, event_at, id);
CREATE INDEX IF NOT EXISTS idx_diaper_proforma_jobs_order
  ON diaper_proforma_jobs(order_id, status, id);
