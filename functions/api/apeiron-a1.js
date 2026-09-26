import { authorized, containsSecret } from './session-checkpoint.js';

const MAX_BODY_BYTES = 220 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function ensureSchema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS a1_dashboard_snapshots (
      snapshot_key TEXT PRIMARY KEY,
      generated_at TEXT NOT NULL,
      source_modified_at TEXT,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_a1_dashboard_generated
      ON a1_dashboard_snapshots(generated_at DESC);
  `);
}

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) throw new Error('body_too_large');
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes) || '{}');
}

function normalizeSnapshot(body) {
  const snapshot = body?.snapshot && typeof body.snapshot === 'object' ? body.snapshot : body;
  if (!snapshot || typeof snapshot !== 'object') throw new Error('snapshot_required');
  if (containsSecret(snapshot)) throw new Error('secret_material_rejected');
  const protocol = String(snapshot.protocol || '');
  if (protocol !== 'aperion-a1-v1') throw new Error('invalid_protocol');
  const generatedAt = String(snapshot.generated_at || '');
  if (!Number.isFinite(Date.parse(generatedAt))) throw new Error('invalid_generated_at');
  const key = String(snapshot.snapshot_key || ('a1:' + generatedAt)).slice(0, 180);
  const payload = JSON.stringify(snapshot);
  if (payload.length > MAX_BODY_BYTES) throw new Error('snapshot_too_large');
  return {
    key,
    generatedAt,
    sourceModifiedAt: snapshot?.freshness?.payment_source_modified_at || null,
    payload,
  };
}

export async function onRequestGet({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  const url = new URL(request.url);
  if (url.searchParams.get('health') === '1') {
    return json({ ok: true, service: 'apeiron-a1', version: 'v1', data_access: 'protected' });
  }
  if (!await authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  try {
    await ensureSchema(env.APERION_DB);
    const row = await env.APERION_DB.prepare(
      'SELECT snapshot_key,generated_at,source_modified_at,payload_json,created_at FROM a1_dashboard_snapshots ORDER BY generated_at DESC LIMIT 1'
    ).first();
    if (!row) return json({ ok: false, error: 'snapshot_not_ready' }, 404);
    const snapshot = JSON.parse(row.payload_json);
    const ageSeconds = Math.max(0, Math.round((Date.now() - Date.parse(row.generated_at)) / 1000));
    return json({
      ok: true,
      protocol: 'aperion-a1-endpoint-v1',
      snapshot_key: row.snapshot_key,
      generated_at: row.generated_at,
      age_seconds: ageSeconds,
      stale: ageSeconds > 600,
      snapshot,
    });
  } catch (error) {
    return json({ ok: false, error: 'snapshot_read_failed', message: String(error.message || error).slice(0, 180) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  if (!await authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  try {
    await ensureSchema(env.APERION_DB);
    const normalized = normalizeSnapshot(await readBody(request));
    await env.APERION_DB.prepare(
      `INSERT INTO a1_dashboard_snapshots(snapshot_key,generated_at,source_modified_at,payload_json)
       VALUES(?,?,?,?)
       ON CONFLICT(snapshot_key) DO UPDATE SET
         generated_at=excluded.generated_at,
         source_modified_at=excluded.source_modified_at,
         payload_json=excluded.payload_json,
         created_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`
    ).bind(normalized.key, normalized.generatedAt, normalized.sourceModifiedAt, normalized.payload).run();

    await env.APERION_DB.prepare(
      'DELETE FROM a1_dashboard_snapshots WHERE snapshot_key NOT IN (SELECT snapshot_key FROM a1_dashboard_snapshots ORDER BY generated_at DESC LIMIT 48)'
    ).run().catch(() => null);

    return json({ ok: true, snapshot_key: normalized.key, generated_at: normalized.generatedAt });
  } catch (error) {
    const bad = ['body_too_large','snapshot_required','secret_material_rejected','invalid_protocol','invalid_generated_at','snapshot_too_large'].includes(error.message);
    return json({ ok: false, error: error.message || 'snapshot_write_failed' }, bad ? 400 : 500);
  }
}
