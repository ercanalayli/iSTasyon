function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

const TABLES = {
    gt_sales_raw: ['tarih','ciro','adet','unvan','kategori','urun','urun_kod','barkod'],
    gt_cost_by_kod: ['urun_kod','alis_fiyat'],
    gt_cost_by_barkod: ['barkod','alis_fiyat'],
    gt_cost_by_name: ['urun_key','alis_fiyat'],
    gt_masraf_raw: ['tarih','kategori','tutar','aciklama'],
    gt_distributor_unvan: ['unvan_norm'],
    gt_stock: ['kategori','urun','miktar']
};

export async function onRequestPost({ env, request }) {
    if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
    let body;
    try {
          body = await request.json();
    } catch (e) {
          return json({ ok: false, error: 'bad_json' }, 400);
    }
    const { table, rows } = body || {};
    const cols = TABLES[table];
    if (!cols) return json({ ok: false, error: 'unknown_table', table }, 400);
    if (!Array.isArray(rows) || !rows.length) return json({ ok: false, error: 'no_rows' }, 400);

  const CHUNK = 20;
    const statements = [];
    const orReplace = table.startsWith('gt_cost_') || table === 'gt_distributor_unvan' ? 'INSERT OR REPLACE' : 'INSERT';
    for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK);
          const placeholders = chunk.map(() => `(${cols.map(() => '?').join(',')})`).join(',');
          const sql = `${orReplace} INTO ${table} (${cols.join(',')}) VALUES ${placeholders}`;
          const values = [];
          for (const row of chunk) {
                  for (const c of cols) values.push(row[c] === undefined ? null : row[c]);
          }
          statements.push(env.APERION_DB.prepare(sql).bind(...values));
    }

  try {
        let inserted = 0;
        const BATCH_SIZE = 25;
        for (let i = 0; i < statements.length; i += BATCH_SIZE) {
                const slice = statements.slice(i, i + BATCH_SIZE);
                await env.APERION_DB.batch(slice);
                inserted += slice.length;
        }
        return json({ ok: true, table, rows_received: rows.length, statements_run: statements.length });
  } catch (error) {
        return json({ ok: false, error: error.message }, 500);
  }
}
