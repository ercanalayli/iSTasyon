function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function onRequestGet({ env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  try {
    const connectors = await env.APERION_DB.prepare(
      `SELECT r.connector_key,r.title,r.category,r.adapter_type,r.privacy_class,r.maturity,r.status,
              r.health_source_key,h.status AS health_status,h.last_success_at,h.checked_at,h.error_code
         FROM connector_registry r
         LEFT JOIN source_health h ON h.source_key=r.health_source_key
        ORDER BY r.category,r.title`
    ).all();
    const capabilities = await env.APERION_DB.prepare(
      `SELECT r.connector_key,c.capability_key,c.direction,c.approval_policy,c.evidence_required,c.status
         FROM connector_capabilities c JOIN connector_registry r ON r.id=c.connector_id
        ORDER BY r.connector_key,c.capability_key`
    ).all();
    return json({ ok: true, generated_at: new Date().toISOString(), connectors: connectors.results || [], capabilities: capabilities.results || [] });
  } catch (error) {
    return json({ ok: false, error: 'connector_schema_not_ready', message: error.message }, 503);
  }
}
