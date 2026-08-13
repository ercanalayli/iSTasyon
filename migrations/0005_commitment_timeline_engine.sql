PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS commitments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commitment_key TEXT NOT NULL UNIQUE,
  domain_id INTEGER,
  connector_id INTEGER,
  objective_id INTEGER,
  commitment_type TEXT NOT NULL,
  title TEXT NOT NULL,
  counterparty TEXT,
  owner TEXT,
  amount REAL,
  currency TEXT DEFAULT 'TRY',
  start_at TEXT,
  due_at TEXT,
  expected_at TEXT,
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  truth_state TEXT NOT NULL DEFAULT 'confirmed',
  source_ref TEXT,
  evidence_ref TEXT,
  next_action TEXT,
  approval_required INTEGER NOT NULL DEFAULT 0,
  recurrence_rule TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(domain_id) REFERENCES life_domains(id),
  FOREIGN KEY(connector_id) REFERENCES connector_registry(id),
  FOREIGN KEY(objective_id) REFERENCES objectives(id)
);

CREATE INDEX IF NOT EXISTS idx_commitments_due_status
  ON commitments(status, due_at, expected_at);
CREATE INDEX IF NOT EXISTS idx_commitments_type_status
  ON commitments(commitment_type, status);

CREATE TABLE IF NOT EXISTS commitment_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_commitment_id INTEGER NOT NULL,
  to_commitment_id INTEGER NOT NULL,
  relation_type TEXT NOT NULL,
  UNIQUE(from_commitment_id,to_commitment_id,relation_type),
  FOREIGN KEY(from_commitment_id) REFERENCES commitments(id),
  FOREIGN KEY(to_commitment_id) REFERENCES commitments(id)
);

CREATE VIEW IF NOT EXISTS commitment_timeline AS
SELECT c.*,
  CASE
    WHEN c.status IN ('completed','cancelled','verified') THEN 'closed'
    WHEN COALESCE(c.due_at,c.expected_at) IS NULL THEN 'unscheduled'
    WHEN datetime(COALESCE(c.due_at,c.expected_at)) < datetime('now') THEN 'overdue'
    WHEN datetime(COALESCE(c.due_at,c.expected_at)) <= datetime('now','+3 days') THEN 'approaching'
    WHEN datetime(COALESCE(c.due_at,c.expected_at)) <= datetime('now','+30 days') THEN 'upcoming'
    ELSE 'later'
  END AS time_bucket
FROM commitments c;

CREATE VIEW IF NOT EXISTS morning_commitment_brief AS
SELECT commitment_type,time_bucket,COUNT(*) AS item_count,
       SUM(CASE WHEN amount IS NULL THEN 0 ELSE amount END) AS known_amount,
       MIN(COALESCE(due_at,expected_at)) AS nearest_at
FROM commitment_timeline
WHERE time_bucket IN ('overdue','approaching','upcoming')
GROUP BY commitment_type,time_bucket;

