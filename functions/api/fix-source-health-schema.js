function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

async function renameIfNeeded(env, table, from, to, steps) {
    const info = await env.APERION_DB.prepare(`PRAGMA table_info(${table})`).all();
    const cols = (info.results || []).map(r => r.name);
    if (cols.includes(to)) {
          steps.push({ step: 'already_ok', table, column: to });
          return;
    }
    if (cols.includes(from)) {
          await env.APERION_DB.prepare(`ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to}`).run();
          steps.push({ step: 'renamed', table, from, to });
    } else {
          steps.push({ step: 'skip_missing', table, from, cols });
    }
}

export async function onRequestGet({ env }) {
    if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
    const steps = [];
    try {
          await renameIfNeeded(env, 'source_health', 'source_id', 'source_key', steps);
          await renameIfNeeded(env, 'source_health', 'code', 'error_code', steps);
          const after = await env.APERION_DB.prepare("PRAGMA table_info(source_health)").all();
          steps.push({ step: 'final', cols: (after.results || []).map(r => r.name) });
          return json({ ok: true, steps });
    } catch (error) {
          return json({ ok: false, error: error.message, steps }, 500);
    }
}
