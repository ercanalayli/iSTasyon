function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

async function ensureTable(env) {
    await env.APERION_DB.prepare(
          `CREATE TABLE IF NOT EXISTS data_snapshots (
                snap_key TEXT PRIMARY KEY,
                      data_json TEXT,
                            refreshed_at TEXT
                                )`
        ).run();
}

export async function onRequestGet({ env, request }) {
    if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
    try {
          await ensureTable(env);
          const url = new URL(request.url);
          const key = url.searchParams.get('key');
          if (key) {
                  const row = await env.APERION_DB.prepare('SELECT * FROM data_snapshots WHERE snap_key = ?').bind(key).first();
                  if (!row) return json({ ok: false, error: 'no_snapshot_yet' }, 503);
                  return json({ ok: true, key, refreshed_at: row.refreshed_at, data: JSON.parse(row.data_json || 'null') });
          }
          const rows = await env.APERION_DB.prepare('SELECT snap_key, refreshed_at FROM data_snapshots').all();
          return json({ ok: true, snapshots: rows.results || [] });
    } catch (error) {
          return json({ ok: false, error: error.message }, 500);
    }
}

export async function onRequestPost({ env, request }) {
    if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
    let body;
    try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'bad_json' }, 400); }
    if (!body.key) return json({ ok: false, error: 'missing_key' }, 400);
    try {
          await ensureTable(env);
          await env.APERION_DB.prepare(
                  `INSERT INTO data_snapshots (snap_key, data_json, refreshed_at)
                         VALUES (?, ?, ?)
                                ON CONFLICT(snap_key) DO UPDATE SET data_json=excluded.data_json, refreshed_at=excluded.refreshed_at`
                ).bind(body.key, JSON.stringify(body.data === undefined ? null : body.data), new Date().toISOString()).run();
          return json({ ok: true, saved: true, key: body.key });
    } catch (error) {
          return json({ ok: false, error: error.message }, 500);
    }
}
