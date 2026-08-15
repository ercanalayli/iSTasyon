function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  }

  export async function onRequestGet({ env }) {
    if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
      const steps = [];
        try {
            const info = await env.APERION_DB.prepare("PRAGMA table_info(source_health)").all();
                const cols = (info.results || []).map(r => r.name);
                    steps.push({ step: 'inspect', cols });
                        if (cols.includes('source_key')) {
                              return json({ ok: true, already_fixed: true, steps });
                                  }
                                      if (cols.includes('source_id')) {
                                            await env.APERION_DB.prepare("ALTER TABLE source_health RENAME COLUMN source_id TO source_key").run();
                                                  steps.push({ step: 'renamed', from: 'source_id', to: 'source_key' });
                                                      } else {
                                                            return json({ ok: false, error: 'unexpected_schema', steps }, 500);
                                                                }
                                                                    const after = await env.APERION_DB.prepare("PRAGMA table_info(source_health)").all();
                                                                        steps.push({ step: 'verify', cols: (after.results || []).map(r => r.name) });
                                                                            return json({ ok: true, steps });
                                                                              } catch (error) {
                                                                                  return json({ ok: false, error: error.message, steps }, 500);
                                                                                    }
                                                                                    }
                                                                                    
