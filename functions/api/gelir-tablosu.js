function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function onRequestGet({ env }) {
    if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
    try {
          await env.APERION_DB.prepare(
                  `CREATE TABLE IF NOT EXISTS gt_snapshot (
                          id INTEGER PRIMARY KEY CHECK (id = 1),
                                  income_json TEXT,
                                          cogs_json TEXT,
                                                  gider_json TEXT,
                                                          stok_json TEXT,
                                                                  refreshed_at TEXT
                                                                        )`
                ).run();
          const row = await env.APERION_DB.prepare('SELECT * FROM gt_snapshot WHERE id = 1').first();
          if (!row) {
                  return json({ ok: false, error: 'no_snapshot_yet', message: 'Henuz veri yuklenmedi. /api/gelir-tablosu-refresh (POST) ile veri yukleyin.' }, 503);
          }
          return json({
                  ok: true,
                  source: 'supabase_snapshot_via_d1_cache',
                  refreshed_at: row.refreshed_at,
                  income: JSON.parse(row.income_json || '[]'),
                  cogs: JSON.parse(row.cogs_json || '[]'),
                  gider: JSON.parse(row.gider_json || '[]'),
                  stok: JSON.parse(row.stok_json || '[]')
          });
    } catch (error) {
          return json({ ok: false, error: error.message }, 500);
    }
}

export async function onRequestPost({ env, request }) {
    if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
    let body;
    try {
          body = await request.json();
    } catch (e) {
          return json({ ok: false, error: 'bad_json' }, 400);
    }
    try {
          await env.APERION_DB.prepare(
                  `CREATE TABLE IF NOT EXISTS gt_snapshot (
                          id INTEGER PRIMARY KEY CHECK (id = 1),
                                  income_json TEXT,
                                          cogs_json TEXT,
                                                  gider_json TEXT,
                                                          stok_json TEXT,
                                                                  refreshed_at TEXT
                                                                        )`
                ).run();
          await env.APERION_DB.prepare(
                  `INSERT INTO gt_snapshot (id, income_json, cogs_json, gider_json, stok_json, refreshed_at)
                         VALUES (1, ?, ?, ?, ?, ?)
                                ON CONFLICT(id) DO UPDATE SET
                                         income_json=excluded.income_json,
                                                  cogs_json=excluded.cogs_json,
                                                           gider_json=excluded.gider_json,
                                                                    stok_json=excluded.stok_json,
                                                                             refreshed_at=excluded.refreshed_at`
                ).bind(
                  JSON.stringify(body.income || []),
                  JSON.stringify(body.cogs || []),
                  JSON.stringify(body.gider || []),
                  JSON.stringify(body.stok || []),
                  new Date().toISOString()
                ).run();
          return json({ ok: true, saved: true });
    } catch (error) {
          return json({ ok: false, error: error.message }, 500);
    }
}
