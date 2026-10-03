import { authorized, containsSecret } from './session-checkpoint.js';

const MAX_BODY_BYTES = 96 * 1024;
const MAX_CHANGES = 40;
const ALLOWED_KINDS = new Set(['fact','decision','memory']);
const ALLOWED_AUTHORITIES = new Set(['user','document','system','assistant','source_observation']);
const ALLOWED_MEMORY_TYPES = new Set(['standing_rule','business_rule','identity','goal','preference','reference']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
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

function clean(value, max = 2000) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function clampConfidence(value, fallback = 0.9) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function isoOrNow(value) {
  const text = clean(value, 80);
  return Number.isFinite(Date.parse(text)) ? new Date(text).toISOString() : new Date().toISOString();
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sourceKeyOf(source) {
  const provider = clean(source.provider || 'chatgpt', 40).toLowerCase();
  const conversation = clean(source.conversation_ref || source.conversationRef, 180);
  if (!conversation) throw new Error('conversation_ref_required');
  return provider + ':' + conversation;
}

function normalizeChange(raw = {}, index = 0) {
  const kind = clean(raw.kind, 30).toLowerCase();
  if (!ALLOWED_KINDS.has(kind)) throw new Error('invalid_change_kind_' + index);
  const scope = clean(raw.scope || 'aperion', 80);
  const authority = clean(raw.authority || 'user', 40).toLowerCase();
  if (!ALLOWED_AUTHORITIES.has(authority)) throw new Error('invalid_authority_' + index);
  const subject = clean(raw.subject, 500);
  const predicate = clean(raw.predicate, 200);
  const value = clean(raw.value ?? raw.object_value ?? raw.statement, 4000);
  const statement = clean(raw.statement || value, 4000);
  if (kind === 'fact' && (!subject || !predicate || !value)) throw new Error('fact_fields_required_' + index);
  if (kind === 'decision' && !statement) throw new Error('decision_required_' + index);
  if (kind === 'memory' && !statement) throw new Error('memory_statement_required_' + index);
  const memoryType = clean(raw.memory_type || raw.memoryType || 'reference', 40);
  if (kind === 'memory' && !ALLOWED_MEMORY_TYPES.has(memoryType)) throw new Error('invalid_memory_type_' + index);
  return {
    kind,
    scope,
    authority,
    subject,
    predicate,
    value,
    statement,
    confidence: clampConfidence(raw.confidence, authority === 'user' ? 1 : 0.8),
    validFrom: clean(raw.valid_from || raw.validFrom, 80) || null,
    validUntil: clean(raw.valid_until || raw.validUntil, 80) || null,
    memoryType,
    domain: clean(raw.domain || 'company', 60),
    supersede: raw.supersede !== false,
    explicitKey: clean(raw.key || raw.fact_key || raw.decision_key || raw.memory_key, 180),
    supersedesKey: clean(raw.supersedes_key || raw.supersedesKey, 180),
    metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
  };
}

async function upsertThread(db, source) {
  const threadKey = clean(source.thread_key || source.threadKey || source.conversation_ref || source.conversationRef, 180);
  const externalRef = clean(source.conversation_ref || source.conversationRef, 180);
  const channel = clean(source.provider || 'chatgpt', 40);
  const row = await db.prepare(
    `INSERT INTO conversation_threads(thread_key,channel,external_ref,last_turn_at)
     VALUES(?,?,?,?)
     ON CONFLICT(thread_key) DO UPDATE SET channel=excluded.channel,external_ref=excluded.external_ref,last_turn_at=excluded.last_turn_at
     RETURNING id,thread_key`
  ).bind(threadKey, channel, externalRef, isoOrNow(source.occurred_at)).first();
  return row;
}

async function upsertSource(db, source, contentHash) {
  const sourceKey = sourceKeyOf(source);
  const provider = clean(source.provider || 'chatgpt', 40).toLowerCase();
  const conversationRef = clean(source.conversation_ref || source.conversationRef, 180);
  const sessionRef = clean(source.session_ref || source.sessionRef, 180);
  const title = clean(source.title || 'ChatGPT conversation', 300);
  const observedAt = isoOrNow(source.occurred_at);

  await db.prepare(
    `INSERT INTO memory_sources(source_key,source_type,project_ref,conversation_ref,session_ref,source_date,content_hash,last_synced_at,adapter_status,metadata_json)
     VALUES(?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(source_key) DO UPDATE SET
       conversation_ref=excluded.conversation_ref,
       session_ref=excluded.session_ref,
       source_date=excluded.source_date,
       content_hash=excluded.content_hash,
       last_synced_at=excluded.last_synced_at,
       adapter_status='ready',
       metadata_json=excluded.metadata_json`
  ).bind(
    sourceKey, provider + '_conversation', 'aperion-istasyon', conversationRef, sessionRef || null,
    observedAt, contentHash, observedAt, 'ready', JSON.stringify({ title, turn_ref: clean(source.turn_ref || source.turnRef, 180) })
  ).run();

  await db.prepare(
    `INSERT INTO external_conversation_sources(source_key,provider,external_id,title,source_updated_at,import_status,user_fact_count,last_scanned_at,notes,updated_at)
     VALUES(?,?,?,?,?,'partial',0,?,'Conversation Memory Writer',datetime('now'))
     ON CONFLICT(source_key) DO UPDATE SET
       title=excluded.title,source_updated_at=excluded.source_updated_at,last_scanned_at=excluded.last_scanned_at,
       import_status=CASE WHEN external_conversation_sources.import_status='complete' THEN 'complete' ELSE 'partial' END,
       notes='Conversation Memory Writer',updated_at=datetime('now')`
  ).bind(sourceKey, provider, conversationRef, title, observedAt, observedAt).run();

  await db.prepare(
    `INSERT INTO memory_sync_state(source_key,cursor,content_hash,checkpoint_json,status,last_synced_at,last_error)
     VALUES(?,?,?,?, 'synced', ?, NULL)
     ON CONFLICT(source_key) DO UPDATE SET cursor=excluded.cursor,content_hash=excluded.content_hash,
       checkpoint_json=excluded.checkpoint_json,status='synced',last_synced_at=excluded.last_synced_at,last_error=NULL`
  ).bind(
    sourceKey,
    clean(source.turn_ref || source.turnRef, 180) || null,
    contentHash,
    JSON.stringify({ session_ref: sessionRef || null, writer: 'conversation-memory-writer-v1' }),
    observedAt
  ).run();

  return sourceKey;
}

async function persistFact(db, change, sourceKey, observedAt) {
  const factKey = change.explicitKey || 'fact:' + (await sha256Hex([change.scope, change.subject, change.predicate, change.value].join('|'))).slice(0, 40);
  const existing = await db.prepare(
    `SELECT id,fact_key,object_value,authority FROM memory_facts
     WHERE subject=? AND predicate=? AND scope=? AND status='active'
     ORDER BY last_seen DESC,id DESC LIMIT 1`
  ).bind(change.subject, change.predicate, change.scope).first();

  await db.prepare(
    `INSERT INTO memory_facts(fact_key,subject,predicate,object_value,scope,valid_from,valid_to,confidence,status,authority,first_seen,last_seen)
     VALUES(?,?,?,?,?,?,?,?, 'active', ?, ?, ?)
     ON CONFLICT(fact_key) DO UPDATE SET
       object_value=excluded.object_value,confidence=MAX(memory_facts.confidence,excluded.confidence),
       valid_from=COALESCE(excluded.valid_from,memory_facts.valid_from),valid_to=excluded.valid_to,
       status='active',authority=excluded.authority,last_seen=excluded.last_seen`
  ).bind(
    factKey, change.subject, change.predicate, change.value, change.scope,
    change.validFrom, change.validUntil, change.confidence, change.authority, observedAt, observedAt
  ).run();

  const inserted = await db.prepare('SELECT id,fact_key FROM memory_facts WHERE fact_key=?').bind(factKey).first();

  if (existing && existing.fact_key !== factKey && existing.object_value !== change.value && change.supersede && change.authority === 'user') {
    await db.prepare(
      `UPDATE memory_facts SET status='superseded',superseded_by_fact_id=?,valid_to=COALESCE(valid_to,?),last_seen=?
       WHERE id=? AND status='active'`
    ).bind(inserted.id, observedAt, observedAt, existing.id).run();
    await db.prepare('UPDATE memory_facts SET supersedes_fact_id=COALESCE(supersedes_fact_id,?) WHERE id=?')
      .bind(existing.id, inserted.id).run();
  }

  await db.prepare(
    `INSERT OR IGNORE INTO memory_fact_sources(fact_id,source_id,observed_at)
     SELECT ?,id,? FROM memory_sources WHERE source_key=?`
  ).bind(inserted.id, observedAt, sourceKey).run();

  const stateKey = 'conversation:' + (await sha256Hex([change.scope, change.subject, change.predicate].join('|'))).slice(0, 32);
  const previousState = await db.prepare(
    `SELECT id,value_json FROM current_state_facts
     WHERE subject_type='conversation_memory' AND subject_ref=? AND predicate=? AND status='active'
     ORDER BY observed_at DESC,id DESC LIMIT 1`
  ).bind(change.subject, change.predicate).first();

  if (!previousState || previousState.value_json !== JSON.stringify(change.value)) {
    const row = await db.prepare(
      `INSERT INTO current_state_facts(fact_key,subject_type,subject_ref,predicate,value_json,truth_state,source_ref,observed_at,valid_until,status)
       VALUES(?,?,?,?,?,'confirmed',?,?,?,'active')
       ON CONFLICT(fact_key) DO UPDATE SET
         value_json=excluded.value_json,truth_state='confirmed',source_ref=excluded.source_ref,
         observed_at=excluded.observed_at,valid_until=excluded.valid_until,status='active'
       RETURNING id`
    ).bind(
      stateKey + ':' + (await sha256Hex(change.value)).slice(0, 12),
      'conversation_memory', change.subject, change.predicate, JSON.stringify(change.value),
      sourceKey, observedAt, change.validUntil
    ).first();
    if (previousState && change.supersede && change.authority === 'user') {
      await db.prepare(`UPDATE current_state_facts SET status='superseded',valid_until=COALESCE(valid_until,?) WHERE id=?`)
        .bind(observedAt, previousState.id).run();
      await db.prepare('UPDATE current_state_facts SET supersedes_fact_id=? WHERE id=?').bind(previousState.id, row.id).run();
    }
  }

  return { kind: 'fact', key: factKey, superseded: Boolean(existing && existing.fact_key !== factKey && existing.object_value !== change.value && change.supersede && change.authority === 'user') };
}

async function persistDecision(db, change, sourceKey, observedAt) {
  const decisionKey = change.explicitKey || 'decision:' + (await sha256Hex([change.scope, change.statement].join('|'))).slice(0, 40);
  const source = await db.prepare('SELECT id FROM memory_sources WHERE source_key=?').bind(sourceKey).first();
  if (!source) throw new Error('memory_source_missing');

  const previous = change.supersede && change.supersedesKey ? await db.prepare(
    `SELECT id,decision_key FROM memory_decisions WHERE decision_key=? AND status='active' LIMIT 1`
  ).bind(change.supersedesKey).first() : null;

  await db.prepare(
    `INSERT INTO memory_decisions(decision_key,decision,scope,effective_date,status,source_id,created_at,updated_at)
     VALUES(?,?,?,?,'active',?,datetime('now'),datetime('now'))
     ON CONFLICT(decision_key) DO UPDATE SET decision=excluded.decision,effective_date=excluded.effective_date,
       status='active',source_id=excluded.source_id,updated_at=datetime('now')`
  ).bind(decisionKey, change.statement, change.scope, change.validFrom || observedAt, source.id).run();

  const inserted = await db.prepare('SELECT id FROM memory_decisions WHERE decision_key=?').bind(decisionKey).first();
  if (previous && previous.decision_key !== decisionKey && change.authority === 'user') {
    await db.prepare(`UPDATE memory_decisions SET status='superseded',superseded_by_decision_id=?,updated_at=datetime('now') WHERE id=? AND status='active'`)
      .bind(inserted.id, previous.id).run();
    await db.prepare('UPDATE memory_decisions SET supersedes_decision_id=COALESCE(supersedes_decision_id,?) WHERE id=?')
      .bind(previous.id, inserted.id).run();
  }
  return { kind: 'decision', key: decisionKey, superseded: Boolean(previous && previous.decision_key !== decisionKey && change.authority === 'user') };
}

async function persistMemoryItem(db, change, sourceKey, observedAt) {
  const memoryKey = change.explicitKey || 'memory:' + (await sha256Hex([change.scope, change.memoryType, change.statement].join('|'))).slice(0, 40);
  await db.prepare(
    `INSERT INTO memory_items(memory_key,domain_id,memory_type,statement,source_ref,confidence,valid_from,valid_until,status,created_at,updated_at)
     VALUES(?,(SELECT id FROM life_domains WHERE domain_key=? LIMIT 1),?,?,?,?,?,?,'active',datetime('now'),datetime('now'))
     ON CONFLICT(memory_key) DO UPDATE SET memory_type=excluded.memory_type,statement=excluded.statement,source_ref=excluded.source_ref,
       confidence=MAX(memory_items.confidence,excluded.confidence),valid_from=COALESCE(excluded.valid_from,memory_items.valid_from),
       valid_until=excluded.valid_until,status='active',updated_at=datetime('now')`
  ).bind(memoryKey, change.domain, change.memoryType, change.statement, sourceKey, change.confidence, change.validFrom || observedAt, change.validUntil).run();
  return { kind: 'memory', key: memoryKey, superseded: false };
}

async function persistWorkingState(db, thread, source, body, contentHash) {
  const state = body.working_state && typeof body.working_state === 'object' ? body.working_state : null;
  if (!state) return null;
  if (containsSecret(state)) throw new Error('secret_material_rejected');
  const snapshotKey = clean(state.snapshot_key || ('conversation:' + contentHash.slice(0, 32)), 180);
  const nextAction = clean(state.next_action || state.nextAction, 2000) || null;
  const evidenceRefs = Array.isArray(state.evidence_refs || state.evidenceRefs)
    ? (state.evidence_refs || state.evidenceRefs).slice(0, 40).map((value) => clean(value, 500)).filter(Boolean)
    : [];
  await db.prepare(
    `INSERT INTO working_state_snapshots(snapshot_key,thread_id,state_json,next_action,evidence_refs_json)
     VALUES(?,?,?,?,?) ON CONFLICT(snapshot_key) DO NOTHING`
  ).bind(snapshotKey, thread.id, JSON.stringify(state), nextAction, JSON.stringify(evidenceRefs)).run();
  return snapshotKey;
}

async function persistTurnRef(db, thread, source, contentHash) {
  const turnRef = clean(source.turn_ref || source.turnRef, 180);
  if (!turnRef) return null;
  const turnKey = clean((source.provider || 'chatgpt') + ':' + (source.conversation_ref || source.conversationRef) + ':' + turnRef, 220);
  const maxRow = await db.prepare('SELECT COALESCE(MAX(sequence_no),0) AS n FROM conversation_turns WHERE thread_id=?').bind(thread.id).first();
  await db.prepare(
    `INSERT INTO conversation_turns(turn_key,thread_id,sequence_no,role,content_ref,occurred_at,content_hash,privacy_class)
     VALUES(?,?,?,'user',?,?,?,'private') ON CONFLICT(turn_key) DO NOTHING`
  ).bind(
    turnKey, thread.id, Number(maxRow?.n || 0) + 1,
    'ref:' + turnKey, isoOrNow(source.occurred_at), contentHash
  ).run();
  return turnKey;
}

export async function onRequestPost({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  if (!await authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  try {
    const body = await readJsonBounded(request);
    if (containsSecret(body)) return json({ ok: false, error: 'secret_material_rejected' }, 400);
    const source = body.source && typeof body.source === 'object' ? body.source : {};
    const changes = Array.isArray(body.changes) ? body.changes : [];
    if (!changes.length && !body.working_state) throw new Error('changes_or_working_state_required');
    if (changes.length > MAX_CHANGES) throw new Error('too_many_changes');

    const normalized = changes.map(normalizeChange);
    const observedAt = isoOrNow(source.occurred_at);
    const contentHash = await sha256Hex(JSON.stringify({ source, changes: normalized, working_state: body.working_state || null }));
    const thread = await upsertThread(env.APERION_DB, source);
    const sourceKey = await upsertSource(env.APERION_DB, source, contentHash);
    const turnKey = await persistTurnRef(env.APERION_DB, thread, source, contentHash);

    const written = [];
    for (const change of normalized) {
      if (change.kind === 'fact') written.push(await persistFact(env.APERION_DB, change, sourceKey, observedAt));
      else if (change.kind === 'decision') written.push(await persistDecision(env.APERION_DB, change, sourceKey, observedAt));
      else written.push(await persistMemoryItem(env.APERION_DB, change, sourceKey, observedAt));
    }

    const snapshotKey = await persistWorkingState(env.APERION_DB, thread, source, body, contentHash);
    const eventId = 'evt-conversation-memory-' + contentHash.slice(0, 32);
    const eventSourceRef = sourceKey + '#' + (turnKey || contentHash.slice(0, 16));
    await env.APERION_DB.prepare(
      `INSERT OR IGNORE INTO memory_events(event_id,event_type,occurred_at,source_type,source_ref,actor,scope,company,entity_refs_json,summary,risk_class,result_status,verification_status,provenance_ref,metadata_json)
       VALUES(?,?,?,?,?,'chatgpt','aperion',NULL,'[]',?,'REVERSIBLE_LOW_RISK','recorded','source_backed',?,?)`
    ).bind(
      eventId, 'conversation_memory_write', observedAt, clean(source.provider || 'chatgpt', 40), eventSourceRef,
      'Conversation memory: ' + written.length + ' structured change(s)',
      sourceKey,
      JSON.stringify({ turn_key: turnKey, snapshot_key: snapshotKey, keys: written.map((item) => item.key) })
    ).run();

    await env.APERION_DB.prepare(
      `INSERT INTO source_health(source_key,status,error_code,message,last_success_at,checked_at,evidence_ref)
       VALUES('conversation_memory_writer','healthy','OK',?,datetime('now'),datetime('now'),?)
       ON CONFLICT(source_key) DO UPDATE SET status='healthy',error_code='OK',message=excluded.message,
         last_success_at=excluded.last_success_at,checked_at=excluded.checked_at,evidence_ref=excluded.evidence_ref`
    ).bind('Structured conversation memory write succeeded', eventId).run();

    return json({
      ok: true,
      protocol: 'aperion-conversation-memory-writer-v1',
      source_key: sourceKey,
      turn_key: turnKey,
      snapshot_key: snapshotKey,
      written,
      event_id: eventId,
      financial_writes: 0,
    });
  } catch (error) {
    const message = String(error?.message || error).slice(0, 180);
    const bad = message.startsWith('invalid_') || message.includes('_required') || ['body_too_large','too_many_changes','secret_material_rejected','changes_or_working_state_required'].includes(message);
    return json({ ok: false, error: message }, bad ? 400 : 500);
  }
}

export async function onRequestGet({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  const url = new URL(request.url);
  if (url.searchParams.get('health') === '1') {
    return json({ ok: true, service: 'aperion-conversation-memory-writer', version: 'v1', data_access: 'protected', financial_writes: 0 });
  }
  if (!await authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  return json({ ok: true, service: 'aperion-conversation-memory-writer', version: 'v1', usage: 'POST structured important changes only', financial_writes: 0 });
}
