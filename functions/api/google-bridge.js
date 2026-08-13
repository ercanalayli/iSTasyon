function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function authorized(request, env) {
  const expected = env.APERION_GOOGLE_BRIDGE_KEY;
  const received = request.headers.get('x-aperion-key');
  return Boolean(expected && received && received === expected);
}

export async function onRequestGet({ env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  const row = await env.APERION_DB.prepare(
    `SELECT source_key, status, error_code, message, last_success_at, checked_at
       FROM source_health WHERE source_key = 'google_apps_script' LIMIT 1`
  ).first();
  return json({ ok: true, source: row || { source_key: 'google_apps_script', status: 'not_connected' } });
}

export async function onRequestPost({ request, env }) {
  if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid_json' }, 400); }

  const checkedAt = new Date().toISOString();
  const status = body.ok === true ? 'healthy' : 'degraded';
  const message = String(body.message || (body.ok ? 'Google bridge healthy' : 'Google bridge reported a failure')).slice(0, 1000);
  const errorCode = body.ok ? null : String(body.error_code || 'GOOGLE_BRIDGE_FAILURE').slice(0, 100);
  const lastSuccess = body.ok ? checkedAt : (body.last_success_at || null);

  await env.APERION_DB.prepare(
    `INSERT INTO source_health
      (source_key, status, error_code, message, last_success_at, checked_at, evidence_ref)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(source_key) DO UPDATE SET
       status=excluded.status,
       error_code=excluded.error_code,
       message=excluded.message,
       last_success_at=COALESCE(excluded.last_success_at, source_health.last_success_at),
       checked_at=excluded.checked_at,
       evidence_ref=excluded.evidence_ref`
  ).bind(
    'google_apps_script', status, errorCode, message, lastSuccess, checkedAt,
    String(body.evidence_ref || 'apps-script:aperion-google-bridge').slice(0, 500)
  ).run();

  return json({ ok: true, accepted: true, checked_at: checkedAt });
}
