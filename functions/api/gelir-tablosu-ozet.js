import { buildIncomeStatementSummary } from '../shared/income-statement.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function parseArray(value) {
  const parsed = JSON.parse(value || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

export async function onRequestGet({ env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);

  try {
    const row = await env.APERION_DB.prepare('SELECT * FROM gt_snapshot WHERE id = 1').first();
    if (!row) return json({ ok: false, error: 'no_snapshot_yet' }, 503);

    const summary = buildIncomeStatementSummary({
      income: parseArray(row.income_json),
      cogs: parseArray(row.cogs_json),
      gider: parseArray(row.gider_json),
      stok: parseArray(row.stok_json),
      refreshedAt: row.refreshed_at,
      now: new Date()
    });

    return json({
      ok: true,
      source: 'd1_income_statement_snapshot',
      ...summary
    });
  } catch (error) {
    return json({ ok: false, error: 'income_statement_summary_failed', message: error.message }, 500);
  }
}

