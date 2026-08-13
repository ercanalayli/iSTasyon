function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function onRequestGet({ env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  try {
    const [domains, objectives, approvals, work, health] = await env.APERION_DB.batch([
      env.APERION_DB.prepare(`SELECT domain_key,title,privacy_class,status FROM life_domains WHERE status='active' ORDER BY id`),
      env.APERION_DB.prepare(`SELECT objective_key,title,desired_outcome,status,priority,target_date FROM objectives WHERE status IN ('active','at_risk','blocked') ORDER BY priority DESC,target_date LIMIT 12`),
      env.APERION_DB.prepare(`SELECT COUNT(*) AS count FROM approval_queue WHERE status='pending'`),
      env.APERION_DB.prepare(`SELECT COUNT(*) AS count FROM work_items WHERE status IN ('planned','ready','executing','verify')`),
      env.APERION_DB.prepare(`SELECT source_key,status,last_success_at,checked_at,error_code FROM source_health ORDER BY source_key`)
    ]);
    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      domains: domains.results || [],
      objectives: objectives.results || [],
      counters: { approvals: approvals.results?.[0]?.count || 0, active_work: work.results?.[0]?.count || 0 },
      source_health: health.results || []
    });
  } catch (error) {
    return json({ ok: false, error: 'os_schema_not_ready', message: error.message }, 503);
  }
}
