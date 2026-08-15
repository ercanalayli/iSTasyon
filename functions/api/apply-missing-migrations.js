function json(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

const STATEMENTS = [
    `CREATE TABLE IF NOT EXISTS commitments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
            commitment_key TEXT NOT NULL UNIQUE,
                domain_id INTEGER,
                    connector_id INTEGER,
                        objective_id INTEGER,
                            commitment_type TEXT NOT NULL,
                                title TEXT NOT NULL,
                                    counterparty TEXT,
                                        owner TEXT,
                                            amount REAL,
                                                currency TEXT DEFAULT 'TRY',
                                                    start_at TEXT,
                                                        due_at TEXT,
                                                            expected_at TEXT,
                                                                completed_at TEXT,
                                                                    status TEXT NOT NULL DEFAULT 'open',
                                                                        priority TEXT NOT NULL DEFAULT 'normal',
                                                                            truth_state TEXT NOT NULL DEFAULT 'confirmed',
                                                                                source_ref TEXT,
                                                                                    evidence_ref TEXT,
                                                                                        next_action TEXT,
                                                                                            approval_required INTEGER NOT NULL DEFAULT 0,
                                                                                                recurrence_rule TEXT,
                                                                                                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                                                                                                        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                                                                                                          )`,
    `CREATE INDEX IF NOT EXISTS idx_commitments_due_status ON commitments(status, due_at, expected_at)`,
    `CREATE INDEX IF NOT EXISTS idx_commitments_type_status ON commitments(commitment_type, status)`,
    `CREATE TABLE IF NOT EXISTS commitment_relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_commitment_id INTEGER NOT NULL,
                to_commitment_id INTEGER NOT NULL,
                    relation_type TEXT NOT NULL,
                        UNIQUE(from_commitment_id,to_commitment_id,relation_type)
                          )`,
    `CREATE VIEW IF NOT EXISTS morning_commitment_brief AS
       SELECT commitment_type,time_bucket,COUNT(*) AS item_count,
                 SUM(CASE WHEN amount IS NULL THEN 0 ELSE amount END) AS known_amount,
                           MIN(COALESCE(due_at,expected_at)) AS nearest_at
                              FROM commitment_timeline
                                 WHERE time_bucket IN ('overdue','approaching','upcoming')
                                    GROUP BY commitment_type,time_bucket`,
    `CREATE TABLE IF NOT EXISTS conversation_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_key TEXT NOT NULL UNIQUE,
                channel TEXT NOT NULL,
                    external_ref TEXT,
                        active_objective_id INTEGER,
                            status TEXT NOT NULL DEFAULT 'active',
                                started_at TEXT NOT NULL DEFAULT (datetime('now')),
                                    last_turn_at TEXT
                                      )`,
    `CREATE TABLE IF NOT EXISTS conversation_turns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
            turn_key TEXT NOT NULL UNIQUE,
                thread_id INTEGER NOT NULL,
                    sequence_no INTEGER NOT NULL,
                        role TEXT NOT NULL CHECK(role IN ('user','assistant','tool','system')),
                            content_ref TEXT NOT NULL,
                                occurred_at TEXT NOT NULL,
                                    content_hash TEXT,
                                        privacy_class TEXT NOT NULL DEFAULT 'private',
                                            UNIQUE(thread_id, sequence_no)
                                              )`,
    `CREATE TABLE IF NOT EXISTS working_state_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
            snapshot_key TEXT NOT NULL UNIQUE,
                thread_id INTEGER NOT NULL,
                    objective_id INTEGER,
                        state_json TEXT NOT NULL,
                            next_action TEXT,
                                evidence_refs_json TEXT,
                                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                                      )`,
    `CREATE TABLE IF NOT EXISTS current_state_facts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
            fact_key TEXT NOT NULL UNIQUE,
                subject_type TEXT NOT NULL,
                    subject_ref TEXT NOT NULL,
                        predicate TEXT NOT NULL,
                            value_json TEXT NOT NULL,
                                truth_state TEXT NOT NULL DEFAULT 'confirmed',
                                    source_ref TEXT NOT NULL,
                                        observed_at TEXT NOT NULL,
                                            valid_until TEXT,
                                                supersedes_fact_id INTEGER,
                                                    status TEXT NOT NULL DEFAULT 'active',
                                                        UNIQUE(subject_type, subject_ref, predicate, observed_at)
                                                          )`,
    `CREATE TABLE IF NOT EXISTS memory_relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_type TEXT NOT NULL,
                from_ref TEXT NOT NULL,
                    relation_type TEXT NOT NULL,
                        to_type TEXT NOT NULL,
                            to_ref TEXT NOT NULL,
                                evidence_ref TEXT NOT NULL,
                                    confidence REAL NOT NULL,
                                        valid_from TEXT,
                                            valid_until TEXT,
                                                status TEXT NOT NULL DEFAULT 'active',
                                                    UNIQUE(from_type, from_ref, relation_type, to_type, to_ref, evidence_ref)
                                                      )`,
    `CREATE TABLE IF NOT EXISTS recall_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
            recall_key TEXT NOT NULL UNIQUE,
                thread_id INTEGER,
                    query_text TEXT NOT NULL,
                        filters_json TEXT,
                            candidates_json TEXT NOT NULL,
                                selected_json TEXT NOT NULL,
                                    selection_reason TEXT NOT NULL,
                                        latency_ms INTEGER,
                                            created_at TEXT NOT NULL DEFAULT (datetime('now'))
                                              )`,
    `CREATE TABLE IF NOT EXISTS context_manifests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
            context_key TEXT NOT NULL UNIQUE,
                thread_id INTEGER,
                    recall_run_id INTEGER,
                        working_state_ref TEXT,
                            recent_turn_refs_json TEXT NOT NULL,
                                memory_refs_json TEXT NOT NULL,
                                    evidence_refs_json TEXT NOT NULL,
                                        rule_refs_json TEXT NOT NULL,
                                            estimated_tokens INTEGER,
                                                created_at TEXT NOT NULL DEFAULT (datetime('now'))
                                                  )`,
    `CREATE INDEX IF NOT EXISTS idx_turns_thread_time ON conversation_turns(thread_id, occurred_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_working_state_thread_time ON working_state_snapshots(thread_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_current_facts_subject ON current_state_facts(subject_type, subject_ref, predicate, status)`,
    `CREATE INDEX IF NOT EXISTS idx_memory_relations_from ON memory_relations(from_type, from_ref, relation_type, status)`,
    `CREATE INDEX IF NOT EXISTS idx_memory_relations_to ON memory_relations(to_type, to_ref, relation_type, status)`
  ];

export async function onRequestGet({ env }) {
    if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
    const results = [];
    for (const sql of STATEMENTS) {
          try {
                  await env.APERION_DB.prepare(sql).run();
                  results.push({ ok: true, sql: sql.slice(0, 60) });
          } catch (error) {
                  results.push({ ok: false, sql: sql.slice(0, 60), error: error.message });
          }
    }
    return json({ ok: true, results });
}
