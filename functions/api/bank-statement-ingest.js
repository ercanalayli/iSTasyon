Exit code: 0
Wall time: 0.3 seconds
Output:
import { ingestBankRows } from '../shared/bank-approvals.js';

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

export async function onRequestGet({ env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  const counts = await env.APERION_DB.prepare(`SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN status IN ('pending','needs_review') THEN 1 ELSE 0 END) AS waiting,
    SUM(CASE WHEN status='queued' THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) AS rejected
    FROM bank_statement_movements`).first().catch(() => null);
  return json({ ok: true, configured: Boolean((env.APERION_GOOGLE_BRIDGE_KEY || env.BANK_INGEST_SECRET) && env.TELEGRAM_BOT_TOKEN), counts: counts || { total: 0, waiting: 0, approved: 0, rejected: 0 } });
}

export async function onRequestPost({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  const expectedSecret = env.APERION_GOOGLE_BRIDGE_KEY || env.BANK_INGEST_SECRET;
  const receivedSecret = request.headers.get('x-aperion-key') || request.headers.get('x-aperion-ingest-secret');
  const authorized = await sameSecret(receivedSecret, expectedSecret);
  if (!authorized) return json({ ok: false, error: 'unauthorized' }, 401);
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

