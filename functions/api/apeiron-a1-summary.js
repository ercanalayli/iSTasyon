function corsJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}

function countOpenApprovals(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const status = String(row?.DURUM || '').toLocaleUpperCase('tr-TR');
    return status && !status.includes('UYGULANDI') && !status.includes('TAMAMLANDI') && !status.includes('KAPANDI');
  }).length;
}

export async function onRequestOptions() {
  return corsJson({ ok: true });
}

async function ensureSchema(db) {
  await db.prepare(
    "CREATE TABLE IF NOT EXISTS a1_dashboard_snapshots (snapshot_key TEXT PRIMARY KEY, generated_at TEXT NOT NULL, source_modified_at TEXT, payload_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))"
  ).run();
  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_a1_dashboard_generated ON a1_dashboard_snapshots(generated_at DESC)"
  ).run();
}

export async function onRequestGet({ env }) {
  if (!env.APERION_DB) return corsJson({ ok: false, error: 'missing_d1_binding' }, 503);

  try {
    await ensureSchema(env.APERION_DB);
    const row = await env.APERION_DB.prepare(
      'SELECT snapshot_key,generated_at,payload_json FROM a1_dashboard_snapshots ORDER BY generated_at DESC LIMIT 1'
    ).first();

    if (!row) return corsJson({ ok: false, error: 'snapshot_not_ready' }, 404);

    const snapshot = JSON.parse(row.payload_json || '{}');
    const ageSeconds = Math.max(0, Math.round((Date.now() - Date.parse(row.generated_at)) / 1000));
    const payments = snapshot?.payments || {};
    const work = snapshot?.work || {};

    const summary = {
      ok: true,
      protocol: 'aperion-a1-public-summary-v1',
      generated_at: row.generated_at,
      age_seconds: ageSeconds,
      stale: ageSeconds > 600,
      source: {
        current_tab: snapshot?.freshness?.current_tab || null,
        next_tab: snapshot?.freshness?.next_tab || null,
      },
      counts: {
        today_payments: Array.isArray(payments.today) ? payments.today.length : 0,
        overdue_payments: Array.isArray(payments.overdue) ? payments.overdue.length : 0,
        next7_payments: Array.isArray(payments.next7) ? payments.next7.length : 0,
        open_tasks: Number(snapshot?.kpi?.open_tasks || (Array.isArray(work.todo) ? work.todo.length : 0)),
        collections: Number(snapshot?.kpi?.collections || (Array.isArray(work.collections) ? work.collections.length : 0)),
        orders_to_place: Number(snapshot?.kpi?.orders_to_place || (Array.isArray(work.orders_to_place) ? work.orders_to_place.length : 0)),
        received_orders: Number(snapshot?.kpi?.received_orders || (Array.isArray(work.received_orders) ? work.received_orders.length : 0)),
        approvals_open: countOpenApprovals(snapshot?.approvals),
        pending_documents: Array.isArray(snapshot?.pending_documents) ? snapshot.pending_documents.length : 0,
      },
    };

    return corsJson(summary);
  } catch (error) {
    return corsJson({
      ok: false,
      error: 'summary_read_failed',
      message: String(error?.message || error).slice(0, 160),
    }, 500);
  }
}
