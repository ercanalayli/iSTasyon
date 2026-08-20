const MAX_BODY_BYTES = 64 * 1024;
const MAX_LIST_ITEMS = 50;
const SECRET_PATTERNS = [
  /\b(?:otp|tek kullanımlık şifre|doğrulama kodu|cvv|cvc)\b/i,
  /(?:şifre|sifre|parola|password|api[_ -]?key|access[_ -]?token|refresh[_ -]?token)\s*[:=]/i,
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value))));
}

export async function authorized(request, env) {
  const configured = String(env.APERION_BRIDGE_SECRET || '');
  const supplied = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (configured.length < 32 || supplied.length < 32) return false;
  const [left, right] = await Promise.all([sha256(configured), sha256(supplied)]);
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) mismatch |= (left[index] || 0) ^ (right[index] || 0);
  return mismatch === 0;
}

async function readJsonBounded(request) {
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

function cleanText(value, max = 2000) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function cleanList(value, maxText = 1000) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_LIST_ITEMS).map(item => cleanText(item, maxText)).filter(Boolean);
}

export function containsSecret(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return SECRET_PATTERNS.some(pattern => pattern.test(text));
}

export function normalizeCheckpoint(body = {}) {
  const checkpoint = {
    checkpointKey: cleanText(body.checkpoint_key || body.checkpointKey, 160),
    sessionRef: cleanText(body.session_ref || body.sessionRef || 'aperion-main-command', 200),
    threadKey: cleanText(body.thread_key || body.threadKey || 'aperion-main-command', 160),
    channel: cleanText(body.channel || 'codex', 40),
    summary: cleanText(body.summary, 4000),
    completed: cleanList(body.completed),
    pending: cleanList(body.pending),
    blockers: cleanList(body.blockers),
    nextAction: cleanText(body.next_action || body.nextAction, 2000),
    evidenceRefs: cleanList(body.evidence_refs || body.evidenceRefs, 500),
  };
  if (!checkpoint.checkpointKey) throw new Error('checkpoint_key_required');
  if (!checkpoint.summary) throw new Error('summary_required');
  if (containsSecret(checkpoint)) throw new Error('secret_material_rejected');
  return checkpoint;
}

export async function onRequestPost({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  if (!await authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  try {
    const checkpoint = normalizeCheckpoint(await readJsonBounded(request));
    const thread = await env.APERION_DB.prepare(
      `INSERT INTO conversation_threads(thread_key,channel,external_ref,last_turn_at)
       VALUES(?,?,?,datetime('now'))
       ON CONFLICT(thread_key) DO UPDATE SET channel=excluded.channel,external_ref=excluded.external_ref,last_turn_at=datetime('now')
       RETURNING id`
    ).bind(checkpoint.threadKey, checkpoint.channel, checkpoint.sessionRef).first();

    const inserted = await env.APERION_DB.prepare(
      `INSERT INTO session_checkpoints
       (checkpoint_key,session_ref,summary,completed_json,pending_json,blockers_json,next_action,evidence_refs_json)
       VALUES(?,?,?,?,?,?,?,?)
       ON CONFLICT(checkpoint_key) DO NOTHING
       RETURNING id,created_at`
    ).bind(
      checkpoint.checkpointKey,
      checkpoint.sessionRef,
      checkpoint.summary,
      JSON.stringify(checkpoint.completed),
      JSON.stringify(checkpoint.pending),
      JSON.stringify(checkpoint.blockers),
      checkpoint.nextAction || null,
      JSON.stringify(checkpoint.evidenceRefs)
    ).first();

    if (!inserted?.id) {
      const existing = await env.APERION_DB.prepare(
        'SELECT id,created_at FROM session_checkpoints WHERE checkpoint_key=? LIMIT 1'
      ).bind(checkpoint.checkpointKey).first();
      return json({ ok: true, duplicate: true, checkpoint_id: existing?.id || null, created_at: existing?.created_at || null });
    }

    const state = {
      summary: checkpoint.summary,
      completed: checkpoint.completed,
      pending: checkpoint.pending,
      blockers: checkpoint.blockers,
    };
    await env.APERION_DB.batch([
      env.APERION_DB.prepare(
        `INSERT INTO working_state_snapshots(snapshot_key,thread_id,state_json,next_action,evidence_refs_json)
         VALUES(?,?,?,?,?) ON CONFLICT(snapshot_key) DO NOTHING`
      ).bind(`snapshot:${checkpoint.checkpointKey}`, thread.id, JSON.stringify(state), checkpoint.nextAction || null, JSON.stringify(checkpoint.evidenceRefs)),
      env.APERION_DB.prepare(
        `INSERT INTO source_health(source_key,status,error_code,message,last_success_at,checked_at,evidence_ref)
         VALUES('aperion_memory','healthy',NULL,?,datetime('now'),datetime('now'),?)
         ON CONFLICT(source_key) DO UPDATE SET status='healthy',error_code=NULL,message=excluded.message,
           last_success_at=excluded.last_success_at,checked_at=excluded.checked_at,evidence_ref=excluded.evidence_ref`
      ).bind(`Checkpoint kaydedildi: ${checkpoint.checkpointKey}`, `checkpoint:${checkpoint.checkpointKey}`),
    ]);
    return json({ ok: true, duplicate: false, checkpoint_id: inserted.id, checkpoint_key: checkpoint.checkpointKey, created_at: inserted.created_at });
  } catch (error) {
    const badRequest = ['body_too_large', 'checkpoint_key_required', 'summary_required', 'secret_material_rejected'].includes(error.message);
    return json({ ok: false, error: error.message || 'checkpoint_write_failed' }, badRequest ? 400 : 500);
  }
}
