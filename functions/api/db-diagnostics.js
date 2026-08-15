export async function onRequestGet({ env }) {
    if (!env.APERION_DB) return new Response(JSON.stringify({ ok: false, error: 'missing_d1_binding' }), { status: 503, headers: { 'content-type': 'application/json' } });
    const tables = await env.APERION_DB.prepare("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").all();
    return new Response(JSON.stringify({ ok: true, tables: tables.results || [] }, null, 2), { status: 200, headers: { 'content-type': 'application/json' } });
}
