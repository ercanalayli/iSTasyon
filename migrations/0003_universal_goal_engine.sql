PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS life_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  privacy_class TEXT NOT NULL DEFAULT 'private',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS objectives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objective_key TEXT NOT NULL UNIQUE,
  domain_id INTEGER,
  parent_objective_id INTEGER,
  title TEXT NOT NULL,
  desired_outcome TEXT NOT NULL,
  why_it_matters TEXT,
  horizon TEXT,
  owner TEXT NOT NULL DEFAULT 'ercan',
  status TEXT NOT NULL DEFAULT 'active',
  priority REAL,
  target_date TEXT,
  success_definition TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(domain_id) REFERENCES life_domains(id),
  FOREIGN KEY(parent_objective_id) REFERENCES objectives(id)
);

CREATE INDEX IF NOT EXISTS idx_objectives_status_priority
  ON objectives(status, priority DESC, target_date);

CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  observation_key TEXT NOT NULL UNIQUE,
  objective_id INTEGER,
  source_key TEXT NOT NULL,
  evidence_ref TEXT,
  observed_at TEXT NOT NULL,
  truth_state TEXT NOT NULL,
  statement TEXT NOT NULL,
  confidence REAL,
  content_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(objective_id) REFERENCES objectives(id)
);

CREATE TABLE IF NOT EXISTS hypotheses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hypothesis_key TEXT NOT NULL UNIQUE,
  objective_id INTEGER NOT NULL,
  thesis TEXT NOT NULL,
  strongest_attack TEXT NOT NULL,
  alternatives_json TEXT,
  failure_conditions TEXT NOT NULL,
  reversible_test TEXT,
  evidence_summary TEXT,
  confidence REAL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(objective_id) REFERENCES objectives(id)
);

CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_key TEXT NOT NULL UNIQUE,
  objective_id INTEGER NOT NULL,
  hypothesis_id INTEGER,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(objective_id) REFERENCES objectives(id),
  FOREIGN KEY(hypothesis_id) REFERENCES hypotheses(id)
);

CREATE TABLE IF NOT EXISTS work_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_key TEXT NOT NULL UNIQUE,
  plan_id INTEGER,
  objective_id INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  owner TEXT,
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  approval_required INTEGER NOT NULL DEFAULT 0,
  approval_id INTEGER,
  execution_adapter TEXT,
  idempotency_key TEXT UNIQUE,
  verification_rule TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(plan_id) REFERENCES plans(id),
  FOREIGN KEY(objective_id) REFERENCES objectives(id),
  FOREIGN KEY(approval_id) REFERENCES approval_queue(id)
);

CREATE INDEX IF NOT EXISTS idx_work_items_status_due
  ON work_items(status, due_at);

CREATE TABLE IF NOT EXISTS outcomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outcome_key TEXT NOT NULL UNIQUE,
  objective_id INTEGER NOT NULL,
  work_item_id INTEGER,
  result_state TEXT NOT NULL,
  result_summary TEXT NOT NULL,
  evidence_ref TEXT,
  verified_at TEXT,
  learning TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(objective_id) REFERENCES objectives(id),
  FOREIGN KEY(work_item_id) REFERENCES work_items(id)
);

CREATE TABLE IF NOT EXISTS memory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_key TEXT NOT NULL UNIQUE,
  domain_id INTEGER,
  memory_type TEXT NOT NULL,
  statement TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  confidence REAL NOT NULL,
  valid_from TEXT,
  valid_until TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(domain_id) REFERENCES life_domains(id)
);

INSERT OR IGNORE INTO life_domains(domain_key,title,privacy_class) VALUES
  ('company','Şirket ve Operasyon','company'),
  ('finance','Finans ve Muhasebe','restricted'),
  ('personal','Kişisel Yaşam','private'),
  ('health','Sağlık ve İyi Oluş','highly_private'),
  ('family','Aile','highly_private'),
  ('learning','Öğrenme ve Fikirler','private'),
  ('relationships','İlişkiler ve Ağ','private');

