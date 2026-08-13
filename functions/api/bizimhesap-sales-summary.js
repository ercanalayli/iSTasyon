function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function onRequestGet({ env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  try {
    const [summary, recent, health] = await env.APERION_DB.batch([
      env.APERION_DB.prepare(
        `SELECT substr(occurred_at,1,10) AS sale_date,
                COUNT(*) AS record_count,
                ROUND(SUM(CAST(json_extract(payload_json,'$.ciro') AS REAL)),2) AS revenue,
                ROUND(SUM(CAST(json_extract(payload_json,'$.adet') AS REAL)),2) AS quantity
           FROM canonical_events
          WHERE event_type='sale.invoice' AND truth_state='confirmed'
          GROUP BY substr(occurred_at,1,10)
          ORDER BY sale_date DESC LIMIT 31`
      ),
      env.APERION_DB.prepare(
        `SELECT event_key,external_ref,occurred_at,received_at,payload_json,evidence_ref
           FROM canonical_events WHERE event_type='sale.invoice' AND truth_state='confirmed'
          ORDER BY occurred_at DESC,received_at DESC LIMIT 50`
      ),
      env.APERION_DB.prepare(
        `SELECT source_key,status,last_success_at,checked_at,error_code,message,evidence_ref
           FROM source_health WHERE source_key='bizimhesap' LIMIT 1`
      )
    ]);
    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      source: 'cloudflare_d1.canonical_events',
      summary: summary.results || [],
      recent: (recent.results || []).map(row => ({ ...row, payload: JSON.parse(row.payload_json || '{}'), payload_json: undefined })),
      health: health.results?.[0] || null
    });
  } catch (error) {
    return json({ ok: false, error: 'sales_summary_not_ready', message: error.message }, 503);
  }
}
