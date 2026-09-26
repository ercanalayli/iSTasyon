import { authorized, containsSecret, onRequestPost as checkpointPost } from './session-checkpoint.js';
import { onRequestGet as bootstrapGet } from './session-bootstrap.js';
import { onRequestGet as projectMemoryGet } from './project-memory.js';
import { appendEvent, recordFact, linkObject } from '../shared/memory-event-ledger.js';
import { normalize, sha256 } from '../shared/project-memory.js';

const MAX_BODY_BYTES = 48 * 1024;
const MAX_CHANGES = 24;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function text(value, max = 1200) {
  return String(value == null ? '' : value).trim().slice(0, max);
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
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes) || '{}');
}

function safeArray(value) {
  return Array.isArray(value) ? value.slice(0, MAX_CHANGES) : [];
}

function tokens(value) {
  return normalize(value)
    .split(/[^a-z0-9çğıöşü]+/i)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2)
    .slice(0, 12);
}

function relevance(row, focusTokens) {
  if (!focusTokens.length) return 1;
  const hay = normalize([
    row.subject, row.predicate, row.object_value, row.scope,
    row.decision, row.summary, row.title, row.canonical_name,
  ].filter(Boolean).join(' '));
  return focusTokens.reduce((score, token) => score + (hay.includes(token) ? 1 : 0), 0);
}

async function compactBootstrap(request, env) {
  const url = new URL(request.url);
  const focus = text(url.searchParams.get('focus') || url.searchParams.get('subject') || '', 240);
  const limit = Math.max(8, Math.min(40, Number(url.searchParams.get('limit') || 24) || 24));

  const [bootstrapResponse, memoryResponse] = await Promise.all([
    bootstrapGet({ request, env }),
    projectMemoryGet({ request: new Request(new URL('/api/project-memory?view=context', request.url), {
      method: 'GET',
      headers: request.headers,
    }), env }),
  ]);

  const bootstrap = await bootstrapResponse.json().catch(() => ({ ok: false, error: 'bootstrap_decode_failed' }));
  const memory = await memoryResponse.json().catch(() => ({ ok: false, error: 'memory_decode_failed' }));
  if (!bootstrapResponse.ok && bootstrapResponse.status === 401) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!bootstrapResponse.ok && bootstrapResponse.status >= 500) return json({ ok: false, error: 'bootstrap_unavailable', detail: bootstrap }, 503);

  const focusTokens = tokens(focus);
  const rank = (rows = []) => rows
    .map((row) => ({ row, score: relevance(row, focusTokens) }))
    .filter((x) => !focusTokens.length || x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.row);

  return json({
    ok: true,
    protocol: 'apeiron-global-memory-bootstrap-v1',
    generated_at: new Date().toISOString(),
    focus,
    policy: {
      raw_chat_loaded: false,
      canonical_memory_first: true,
      user_correction_supersedes: true,
      secret_material_stored: false,
    },
    last_checkpoint: bootstrap.last_checkpoint || null,
    last_working_state: bootstrap.last_working_state || null,
    core_mandate: bootstrap.core_mandate || null,
    active_facts: rank(memory.active_facts || []),
    active_decisions: rank(memory.active_decisions || []),
    open_conflicts: rank(memory.open_conflicts || []).slice(0, 12),
    objectives: (bootstrap.objectives || []).slice(0, 10),
    work_items: (bootstrap.work_items || []).slice(0, 20),
    pending_approvals: (bootstrap.pending_approvals || []).slice(0, 20),
    commitments: (bootstrap.commitments || []).slice(0, 20),
    source_health: (bootstrap.source_health || []).slice(0, 40),
    degraded: Boolean(bootstrap.degraded || memory.ok === false),
  });
}

async function ensureSource(db, sourceKey, conversationRef, sourceRef, sourceType, observedAt) {
  const contentHash = await sha256([sourceType, sourceRef, conversationRef].join('|'));
  await db.prepare(`INSERT INTO memory_sources
    (source_key,source_type,conversation_ref,source_date,content_hash,last_synced_at,adapter_status)
    VALUES(?,?,?,?,?,datetime('now'),'verified')
    ON CONFLICT(source_key) DO UPDATE SET
      conversation_ref=excluded.conversation_ref,
      source_date=excluded.source_date,
      last_synced_at=datetime('now'),
      adapter_status='verified'`)
    .bind(sourceKey, sourceType, conversationRef || null, observedAt, contentHash).run();
  return db.prepare('SELECT id FROM memory_sources WHERE source_key=?').bind(sourceKey).first();
}

async function writeDecision(db, change, ctx) {
  const decision = text(change.decision || change.value, 1200);
  const scope = text(change.scope || ctx.scope, 160) || 'Apeiron';
  if (!decision) throw new Error('decision_required');
  if (containsSecret(decision)) throw new Error('secret_material_rejected');
  const source = await ensureSource(db, ctx.sourceKey, ctx.conversationRef, ctx.sourceRef, ctx.sourceType, ctx.observedAt);
  const key = text(change.decision_key, 160) || `decision:${(await sha256(`${normalize(scope)}|${normalize(decision)}|${text(change.effective_date || ctx.observedAt, 40)}`)).slice(0, 40)}`;
  const supersedes = text(change.supersedes_decision_key, 160) || null;
  let supersedesId = null;
  if (supersedes) {
    const row = await db.prepare('SELECT id FROM memory_decisions WHERE decision_key=? LIMIT 1').bind(supersedes).first();
    supersedesId = row?.id || null;
  }
  await db.prepare(`INSERT OR IGNORE INTO memory_decisions
    (decision_key,decision,scope,effective_date,status,source_id,supersedes_decision_id)
    VALUES(?,?,?,?,?,?,?)`)
    .bind(key, decision, scope, text(change.effective_date || ctx.observedAt, 40), 'active', source.id, supersedesId).run();
  const stored = await db.prepare('SELECT id FROM memory_decisions WHERE decision_key=?').bind(key).first();
  if (supersedesId && stored?.id) {
    await db.prepare(`UPDATE memory_decisions
      SET status='superseded',superseded_by_decision_id=?,updated_at=datetime('now')
      WHERE id=? AND status='active'`).bind(stored.id, supersedesId).run();
  }
  return { decision_key: key, duplicate: !stored?.id ? true : false };
}

async function writeChange(db, change, ctx) {
  const type = text(change.type, 32).toLowerCase();
  if (!['fact','correction','decision','rule','preference','task','event'].includes(type)) throw new Error('change_type_not_allowed');

  const sourceRef = text(change.source_ref || ctx.sourceRef, 240);
  const sourceKey = text(change.source_key || ctx.sourceKey, 200);
  const scope = text(change.scope || ctx.scope, 160) || 'Apeiron';
  const observedAt = text(change.observed_at || ctx.observedAt, 80);

  if (type === 'fact' || type === 'correction') {
    const subject = text(change.subject, 200);
    const predicate = text(change.predicate, 120);
    const objectValue = text(change.object_value ?? change.value, 1200);
    if (!subject || !predicate || !objectValue) throw new Error('fact_fields_required');
    return recordFact(db, {
      subject,
      predicate,
      object_value: objectValue,
      scope,
      source_key: sourceKey,
      source_type: ctx.sourceType,
      source_ref: sourceRef,
      authority: type === 'correction' ? 'user_correction' : 'chat_verified',
      observed_at: observedAt,
    });
  }

  if (type === 'decision') return writeDecision(db, change, { ...ctx, sourceRef, sourceKey, scope, observedAt });

  const eventType = type === 'rule' ? 'chat_rule'
    : type === 'preference' ? 'chat_preference'
    : type === 'task' ? 'chat_task_change'
    : text(change.event_type, 80) || 'chat_event';
  const summary = text(change.summary || change.value || change.title, 600);
  if (!summary) throw new Error('event_summary_required');
  const event = await appendEvent(db, {
    event_type: eventType,
    occurred_at: observedAt,
    source_type: ctx.sourceType,
    source_ref: sourceRef,
    actor: text(change.actor || 'Ercan via ChatGPT', 120),
    scope,
    company: text(change.company, 160) || null,
    entity_refs: safeArray(change.entity_refs).map((x) => text(x, 160)),
    task_id: text(change.task_id, 100) || null,
    summary,
    risk_class: 'READ',
    result_status: text(change.result_status || 'recorded', 80),
    verification_status: text(change.verification_status || 'user_message_observed', 80),
    provenance_ref: sourceRef,
    supersedes_event_id: text(change.supersedes_event_id, 100) || null,
    metadata: change.metadata || {},
  });
  if (type !== 'event') {
    const objectType = type === 'rule' ? 'RULE' : type === 'preference' ? 'PREFERENCE' : 'TASK';
    const canonicalRef = text(change.canonical_ref || change.subject || change.task_id || summary, 240);
    if (canonicalRef) await linkObject(db, objectType, canonicalRef, scope, event.event_id, text(change.supersedes_object_key, 100) || null);
  }
  return event;
}

async function writeCheckpoint(request, env, body, ctx) {
  if (!body.checkpoint || typeof body.checkpoint !== 'object') return null;
  const checkpoint = {
    checkpoint_key: text(body.checkpoint.checkpoint_key || `chat:${ctx.conversationRef}:${Date.now()}`, 160),
    session_ref: ctx.conversationRef || 'chatgpt-normal-chat',
    thread_key: text(body.checkpoint.thread_key || ctx.conversationRef || 'chatgpt-normal-chat', 160),
    channel: 'chatgpt',
    summary: text(body.checkpoint.summary || body.summary, 4000),
    completed: safeArray(body.checkpoint.completed).map((x) => text(x, 1000)),
    pending: safeArray(body.checkpoint.pending).map((x) => text(x, 1000)),
    blockers: safeArray(body.checkpoint.blockers).map((x) => text(x, 1000)),
    next_action: text(body.checkpoint.next_action, 2000),
    evidence_refs: safeArray(body.checkpoint.evidence_refs).map((x) => text(x, 500)),
  };
  if (!checkpoint.summary) return null;
  const delegated = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(checkpoint),
  });
  const response = await checkpointPost({ request: delegated, env });
  const result = await response.json().catch(() => ({ ok: false, error: 'checkpoint_decode_failed' }));
  if (!response.ok) throw new Error(result.error || 'checkpoint_write_failed');
  return result;
}

export async function onRequestGet({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  const url = new URL(request.url);
  if (url.searchParams.get('health') === '1') {
    return json({ ok: true, service: 'apeiron-conversation-memory', version: 'v1', data_access: 'protected' });
  }
  if (!await authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  return compactBootstrap(request, env);
}

export async function onRequestPost({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  if (!await authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  try {
    const body = await readBody(request);
    if (containsSecret(JSON.stringify(body))) return json({ ok: false, error: 'secret_material_rejected' }, 400);

    const conversationRef = text(body.conversation_ref || body.thread_ref || 'chatgpt-normal-chat', 200);
    const observedAt = text(body.observed_at || new Date().toISOString(), 80);
    if (!Number.isFinite(Date.parse(observedAt))) throw new Error('invalid_observed_at');
    const scope = text(body.scope || body.project || 'Apeiron', 160);
    const sourceRef = text(body.source_ref || `chatgpt:${conversationRef}:${observedAt}`, 240);
    const sourceKey = text(body.source_key || `chatgpt:${conversationRef}`, 200);
    const ctx = {
      conversationRef,
      observedAt: new Date(observedAt).toISOString(),
      scope,
      sourceRef,
      sourceKey,
      sourceType: 'chatgpt_conversation',
    };

    const changes = safeArray(body.changes);
    const results = [];
    for (const change of changes) results.push(await writeChange(env.APERION_DB, change, ctx));
    const checkpoint = await writeCheckpoint(request, env, body, ctx);

    return json({
      ok: true,
      protocol: 'apeiron-global-memory-writer-v1',
      conversation_ref: conversationRef,
      accepted_changes: results.length,
      results,
      checkpoint,
    });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error).slice(0, 160) }, 400);
  }
}
