import { ingestBankRows } from '../shared/bank-approvals.js';

const BANK_INGEST_KEY_SHA256 = '4af045da03026996a71cd57f28011ee18d987086b4789354c589c9099075b09b';

const BANK_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS bank_statement_movements (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'alayli',
  duplicate_key TEXT NOT NULL UNIQUE,
  bank_name TEXT,
  transaction_date TEXT,
  transaction_time TEXT,
  description TEXT,
  amount_in REAL NOT NULL DEFAULT 0,
  amount_out REAL NOT NULL DEFAULT 0,
  balance_after REAL,
  confidence_score REAL NOT NULL DEFAULT 0,
  suggested_counterparty TEXT,
  confirmed_counterparty TEXT,
  counterparty_confirmed INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  source_ref TEXT,
  raw_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'needs_review',
  telegram_message_id TEXT,
  approval_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  decided_at TEXT,
  decided_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_bank_statement_movements_status
  ON bank_statement_movements(company_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_bank_statement_movements_date
  ON bank_statement_movements(company_id, transaction_date, bank_name);
CREATE TABLE IF NOT EXISTS bank_posting_queue (
  id TEXT PRIMARY KEY,
  movement_id TEXT NOT NULL UNIQUE,
  company_id TEXT NOT NULL DEFAULT 'alayli',
  status TEXT NOT NULL DEFAULT 'pending_match',
  payload_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (movement_id) REFERENCES bank_statement_movements(id)
);
CREATE INDEX IF NOT EXISTS idx_bank_posting_queue_status
  ON bank_posting_queue(company_id, status, created_at);
`;

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
}

async function sameSecret(received, expected) {
  if (!received || !expected) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(received)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const av = new Uint8Array(a);
  const bv = new Uint8Array(b);
  if (av.length !== bv.length) return false;
  let diff = 0;
  for (let i = 0; i < av.length; i += 1) diff |= av[i] ^ bv[i];
  return diff === 0;
}

async function ensureBankSchema(db) {
  await db.exec(BANK_SCHEMA_SQL);
}

export async function onRequestGet({ env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  try {
    await ensureBankSchema(env.APERION_DB);
  } catch (error) {
    console.error(JSON.stringify({ event: 'bank_schema_failed', error: error.message || String(error) }));
    return json({ ok: false, error: 'bank_schema_failed' }, 503);
  }
  const counts = await env.APERION_DB.prepare(`SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN status IN ('pending','needs_review') THEN 1 ELSE 0 END) AS waiting,
    SUM(CASE WHEN status='queued' THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) AS rejected
    FROM bank_statement_movements`).first().catch(() => null);
  return json({ ok: true, configured: Boolean(BANK_INGEST_KEY_SHA256 && env.TELEGRAM_BOT_TOKEN), counts: counts || { total: 0, waiting: 0, approved: 0, rejected: 0 } });
}

export async function onRequestPost({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  const expectedSecret = BANK_INGEST_KEY_SHA256;
  const receivedSecret = request.headers.get('x-aperion-key') || request.headers.get('x-aperion-ingest-secret');
  const receivedHash = receivedSecret
    ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(receivedSecret))))
      .map((byte) => byte.toString(16).padStart(2, '0')).join('')
    : '';
  const authorized = await sameSecret(receivedHash, expectedSecret);
  if (!authorized) return json({ ok: false, error: 'unauthorized' }, 401);
  try {
    await ensureBankSchema(env.APERION_DB);
  } catch (error) {
    console.error(JSON.stringify({ event: 'bank_schema_failed', error: error.message || String(error) }));
    return json({ ok: false, error: 'bank_schema_failed' }, 503);
  }
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) return json({ ok: false, error: 'rows_required' }, 400);
  try {
    const result = await ingestBankRows(env.APERION_DB, env, body.rows);
    return json({ ok: result.telegram_failed === 0, ...result }, result.telegram_failed === 0 ? 200 : 207);
  } catch (error) {
    console.error(JSON.stringify({ event: 'bank_statement_ingest_failed', error: error.message || String(error) }));
    return json({ ok: false, error: 'ingest_failed' }, 500);
  }
}

