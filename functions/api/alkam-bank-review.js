import { authorized } from './session-checkpoint.js';

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
}

const ALLOWED_STATUS = new Set(['pending','needs_review','approved_read_only','rejected']);

export async function onRequestGet({ request, env }) {
  if (!env.APERION_DB) return json({ ok:false, error:'missing_d1_binding' }, 503);
  const url = new URL(request.url);
  if (url.searchParams.get('health') === '1') {
    return json({ ok:true, service:'alkam-bank-review', company_id:'alkam', data_access:'protected', posting_route:'read_only' });
  }
  if (!await authorized(request, env)) return json({ ok:false, error:'unauthorized' }, 401);

  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || 50) || 50));
  const status = String(url.searchParams.get('status') || '').trim();
  if (status && !ALLOWED_STATUS.has(status)) return json({ ok:false, error:'invalid_status' }, 400);

  try {
    const where = status ? 'company_id=? AND status=?' : "company_id=? AND status IN ('pending','needs_review','approved_read_only','rejected')";
    const bind = status ? ['alkam', status, limit] : ['alkam', limit];
    const stmt = env.APERION_DB.prepare(`SELECT
      id,company_id,bank_name,transaction_date,transaction_time,description,
      amount_in,amount_out,balance_after,confidence_score,suggested_counterparty,
      confirmed_counterparty,counterparty_confirmed,source,source_ref,status,
      approval_note,created_at,updated_at,decided_at,decided_by
      FROM bank_statement_movements
      WHERE ${where}
      ORDER BY transaction_date DESC,transaction_time DESC,created_at DESC
      LIMIT ?`);
    const result = await stmt.bind(...bind).all();

    const counts = await env.APERION_DB.prepare(`SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status IN ('pending','needs_review') THEN 1 ELSE 0 END) AS waiting,
      SUM(CASE WHEN status='approved_read_only' THEN 1 ELSE 0 END) AS approved_read_only,
      SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) AS rejected
      FROM bank_statement_movements WHERE company_id='alkam'`).first();

    return json({
      ok:true,
      protocol:'istasyon-alkam-bank-review-v1',
      company_id:'alkam',
      posting_route:'read_only',
      financial_write:0,
      counts:counts || {},
      rows:result.results || [],
    });
  } catch (error) {
    return json({ ok:false, error:'alkam_bank_review_read_failed', message:String(error.message || error).slice(0,180) }, 500);
  }
}
