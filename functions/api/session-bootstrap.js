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
  if (new URL(request.url).searchParams.get('health') === '1') {
    return json({ ok: true, service: 'aperion-session-bootstrap', version: 'v3', data_access: 'protected' });
  }
  if (!await authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  const url = new URL(request.url);
  const requestedSubject = String(url.searchParams.get('subject') || '').trim().slice(0, 200);
  const subjectLike = '%' + requestedSubject + '%';

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
    safeQuery(env.APERION_DB, 'core_mandate', "SELECT fact_key,predicate,value_json,truth_state,source_ref,observed_at FROM current_state_facts WHERE subject_type='system' AND subject_ref='aperion' AND predicate='operating_roles' AND status='active' ORDER BY observed_at DESC LIMIT 1", 'first'),
    safeQuery(env.APERION_DB, 'durable_memory', "SELECT m.memory_key,d.domain_key,m.memory_type,m.statement,m.source_ref,m.confidence,m.valid_from,m.valid_until,m.updated_at FROM memory_items m LEFT JOIN life_domains d ON d.id=m.domain_id WHERE m.status='active' AND (m.valid_until IS NULL OR m.valid_until>=date('now')) ORDER BY CASE m.memory_type WHEN 'standing_rule' THEN 1 WHEN 'business_rule' THEN 2 WHEN 'identity' THEN 3 WHEN 'goal' THEN 4 ELSE 5 END,m.confidence DESC,m.updated_at DESC LIMIT 120"),
    safeQuery(env.APERION_DB, 'memory_sources', "SELECT provider,title,import_status,user_fact_count,last_scanned_at,notes FROM external_conversation_sources ORDER BY CASE import_status WHEN 'complete' THEN 1 WHEN 'partial' THEN 2 WHEN 'inventoried' THEN 3 ELSE 4 END,title LIMIT 200"),
    safeQuery(env.APERION_DB, 'memory_import', "SELECT run_key,status,sources_seen,sources_scanned,candidates_created,memories_accepted,secrets_rejected,error_summary,started_at,completed_at FROM memory_import_runs ORDER BY started_at DESC LIMIT 1", 'first'),
    safeQuery(env.APERION_DB, 'standing_access_grants', "SELECT grant_key,principal,connector_key,scopes_json,status,granted_at,notes,updated_at FROM standing_access_grants WHERE status='active' AND revoked_at IS NULL ORDER BY connector_key"),
    safeQuery(env.APERION_DB, 'project_memory_facts', requestedSubject
      ? `SELECT f.fact_key,f.subject,f.predicate,f.object_value,f.scope,f.valid_from,f.valid_to,f.confidence,f.authority,f.last_seen,group_concat(s.source_key) AS source_keys
         FROM memory_facts f LEFT JOIN memory_fact_sources fs ON fs.fact_id=f.id LEFT JOIN memory_sources s ON s.id=fs.source_id
         WHERE f.status='active' AND f.subject LIKE '${subjectLike.replace(/'/g, "''")}'
         GROUP BY f.id ORDER BY CASE f.authority WHEN 'user' THEN 1 WHEN 'document' THEN 2 ELSE 3 END,f.last_seen DESC LIMIT 120`
      : "SELECT f.fact_key,f.subject,f.predicate,f.object_value,f.scope,f.valid_from,f.valid_to,f.confidence,f.authority,f.last_seen,group_concat(s.source_key) AS source_keys FROM memory_facts f LEFT JOIN memory_fact_sources fs ON fs.fact_id=f.id LEFT JOIN memory_sources s ON s.id=fs.source_id WHERE f.status='active' GROUP BY f.id ORDER BY CASE f.authority WHEN 'user' THEN 1 WHEN 'document' THEN 2 ELSE 3 END,f.last_seen DESC LIMIT 120"),
    safeQuery(env.APERION_DB, 'project_memory_decisions', requestedSubject
      ? `SELECT d.decision_key,d.decision,d.scope,d.effective_date,d.updated_at,s.source_key FROM memory_decisions d JOIN memory_sources s ON s.id=d.source_id WHERE d.status='active' AND (d.scope LIKE '${subjectLike.replace(/'/g, "''")}' OR d.decision LIKE '${subjectLike.replace(/'/g, "''")}') ORDER BY d.effective_date DESC,d.updated_at DESC LIMIT 80`
      : "SELECT d.decision_key,d.decision,d.scope,d.effective_date,d.updated_at,s.source_key FROM memory_decisions d JOIN memory_sources s ON s.id=d.source_id WHERE d.status='active' ORDER BY d.effective_date DESC,d.updated_at DESC LIMIT 80"),
    safeQuery(env.APERION_DB, 'recent_memory_events', "SELECT event_id,event_type,occurred_at,source_type,source_ref,actor,scope,company,summary,result_status,verification_status,provenance_ref FROM memory_events ORDER BY occurred_at DESC LIMIT 40"),
    safeQuery(env.APERION_DB, 'conversation_memory_sources', "SELECT source_key,source_type,conversation_ref,session_ref,source_date,last_synced_at,adapter_status,metadata_json FROM memory_sources WHERE source_type LIKE '%conversation' ORDER BY last_synced_at DESC LIMIT 40"),
  ]);

  const byKey = Object.fromEntries(results.map((result) => [result.key, result]));
  const blockedSources = results.filter((result) => !result.available).map((result) => result.key);
  const snapshot = byKey.working_state.row;

  return json({
    ok: true,
    degraded: blockedSources.length > 0,
    protocol: 'aperion-session-bootstrap-v3',
    generated_at: new Date().toISOString(),
    context_policy: { raw_chat_loaded: false, recent_turn_limit: 8, structured_memory: true, conversation_memory_writer: true, bootstrap_reader: true },
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
    core_mandate: byKey.core_mandate.row ? {
      ...byKey.core_mandate.row,
      value: parseJson(byKey.core_mandate.row.value_json, {}),
    } : null,
    durable_memory: byKey.durable_memory.rows,
    memory_sources: byKey.memory_sources.rows,
    latest_memory_import: byKey.memory_import.row || null,
    standing_access_grants: byKey.standing_access_grants.rows.map((row) => ({
      ...row,
      scopes: parseJson(row.scopes_json),
    })),
    conversation_memory: {
      subject: requestedSubject || null,
      active_facts: byKey.project_memory_facts.rows.map((row) => ({
        ...row,
        source_keys: row.source_keys ? String(row.source_keys).split(',').filter(Boolean) : [],
      })),
      active_decisions: byKey.project_memory_decisions.rows,
      recent_events: byKey.recent_memory_events.rows,
      recent_sources: byKey.conversation_memory_sources.rows.map((row) => ({
        ...row,
        metadata: parseJson(row.metadata_json, {}),
      })),
    },
    objectives: byKey.objectives.rows,
    work_items: byKey.work_items.rows,
    pending_approvals: byKey.approvals.rows,
    commitments: byKey.commitments.rows,
    source_health: byKey.source_health.rows,
    connectors: byKey.connectors.rows,
  });
}
