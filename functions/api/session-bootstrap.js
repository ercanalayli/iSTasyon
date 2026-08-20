import { authorized } from './session-checkpoint.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function parseJson(value, fallback = []) {
  try { return value ? JSON.parse(value) : fallback; } catch (_error) { return fallback; }
}

function normalizeCheckpoint(row) {
  return row ? {
    ...row,
    completed: parseJson(row.completed_json),
    pending: parseJson(row.pending_json),
    blockers: parseJson(row.blockers_json),
    evidence_refs: parseJson(row.evidence_refs_json),
  } : null;
}

async function safeQuery(db, key, sql, mode = 'all') {
  try {
    const statement = db.prepare(sql);
    if (mode === 'first') {
      return { key, available: true, row: await statement.first(), rows: [], error: null };
    }
    const result = await statement.all();
    return { key, available: true, row: null, rows: result?.results || [], error: null };
  } catch (error) {
    return {
      key,
      available: false,
      row: null,
      rows: [],
      error: String(error?.message || 'query_failed').slice(0, 300),
    };
  }
}

function sourceStatus(result) {
  return {
    status: result.available ? 'healthy' : 'blocked',
    error: result.error,
  };
}

export async function onRequestGet({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  if (!await authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  const results = await Promise.all([
    safeQuery(env.APERION_DB, 'checkpoint', 'SELECT * FROM session_checkpoints ORDER BY created_at DESC LIMIT 1', 'first'),
    safeQuery(env.APERION_DB, 'objectives', "SELECT objective_key,title,desired_outcome,status,priority,target_date FROM objectives WHERE status IN ('active','at_risk','blocked') ORDER BY priority DESC,target_date LIMIT 10"),
    safeQuery(env.APERION_DB, 'work_items', "SELECT work_key,action_type,title,owner,due_at,status,approval_required FROM work_items WHERE status NOT IN ('completed','cancelled') ORDER BY due_at LIMIT 20"),
    safeQuery(env.APERION_DB, 'approvals', "SELECT id,item_type AS action_type,status,created_at FROM approval_queue WHERE status IN ('needs_review','pending') ORDER BY created_at LIMIT 20"),
    safeQuery(env.APERION_DB, 'commitments', "SELECT commitment_key,commitment_type,title,due_at,expected_at,status,priority,time_bucket FROM commitment_timeline WHERE time_bucket IN ('overdue','approaching','upcoming') ORDER BY CASE time_bucket WHEN 'overdue' THEN 1 WHEN 'approaching' THEN 2 ELSE 3 END,COALESCE(due_at,expected_at) LIMIT 30"),
    safeQuery(env.APERION_DB, 'source_health', 'SELECT source_key,status,error_code,last_success_at,checked_at FROM source_health ORDER BY source_key'),
    safeQuery(env.APERION_DB, 'connectors', 'SELECT connector_key,title,maturity,status FROM connector_registry ORDER BY title'),
    safeQuery(env.APERION_DB, 'memory_counts', "SELECT (SELECT COUNT(*) FROM session_checkpoints) AS checkpoints,(SELECT COUNT(*) FROM current_state_facts WHERE status='active') AS active_facts,(SELECT COUNT(*) FROM working_state_snapshots) AS snapshots", 'first'),
    safeQuery(env.APERION_DB, 'working_state', 'SELECT snapshot_key,state_json,next_action,evidence_refs_json,created_at FROM working_state_snapshots ORDER BY created_at DESC LIMIT 1', 'first'),
  ]);

  const byKey = Object.fromEntries(results.map((result) => [result.key, result]));
  const blockedSources = results.filter((result) => !result.available).map((result) => result.key);
  const snapshot = byKey.working_state.row;

  return json({
    ok: true,
    degraded: blockedSources.length > 0,
    protocol: 'aperion-session-bootstrap-v2',
    generated_at: new Date().toISOString(),
    context_policy: { raw_chat_loaded: false, recent_turn_limit: 8, structured_memory: true },
    bootstrap_health: {
      status: blockedSources.length ? 'degraded' : 'healthy',
      blocked_sources: blockedSources,
      sources: Object.fromEntries(results.map((result) => [result.key, sourceStatus(result)])),
    },
    memory_status: byKey.memory_counts.row || {},
    last_checkpoint: normalizeCheckpoint(byKey.checkpoint.row),
    last_working_state: snapshot ? {
      ...snapshot,
      state: parseJson(snapshot.state_json, {}),
      evidence_refs: parseJson(snapshot.evidence_refs_json),
    } : null,
    objectives: byKey.objectives.rows,
    work_items: byKey.work_items.rows,
    pending_approvals: byKey.approvals.rows,
    commitments: byKey.commitments.rows,
    source_health: byKey.source_health.rows,
    connectors: byKey.connectors.rows,
  });
}
