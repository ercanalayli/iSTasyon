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

async function ensureCommitmentTimelineView(env, steps) {
      const existing = await env.APERION_DB.prepare(
              "SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name='commitment_timeline'"
            ).all();
      if ((existing.results || []).length) {
              steps.push({ step: 'view_already_ok', view: 'commitment_timeline' });
              return;
      }
      await env.APERION_DB.prepare(`
          CREATE VIEW commitment_timeline AS
              SELECT
                    commitment_key,
                          commitment_type,
                                title,
                                      due_at,
                                            expected_at,
                                                  status,
                                                        priority,
                                                              CASE
                                                                      WHEN COALESCE(due_at, expected_at) IS NULL THEN 'upcoming'
                                                                              WHEN COALESCE(due_at, expected_at) < datetime('now') THEN 'overdue'
                                                                                      WHEN COALESCE(due_at, expected_at) <= datetime('now','+3 days') THEN 'approaching'
                                                                                              ELSE 'upcoming'
                                                                                                    END AS time_bucket
                                                                                                        FROM commitments
                                                                                                            WHERE status NOT IN ('completed','cancelled')
                                                                                                              `).run();
      steps.push({ step: 'view_created', view: 'commitment_timeline' });
}

export async function onRequestGet({ env }) {
      if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
      const steps = [];
      try {
              await renameIfNeeded(env, 'source_health', 'source_id', 'source_key', steps);
              await renameIfNeeded(env, 'source_health', 'code', 'error_code', steps);
              await ensureCommitmentTimelineView(env, steps);
              const after = await env.APERION_DB.prepare("PRAGMA table_info(source_health)").all();
              steps.push({ step: 'final', cols: (after.results || []).map(r => r.name) });
              return json({ ok: true, steps });
      } catch (error) {
              return json({ ok: false, error: error.message, steps }, 500);
      }
}
