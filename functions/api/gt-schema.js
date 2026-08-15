function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

const STATEMENTS = [
    `CREATE TABLE IF NOT EXISTS gt_sales_raw (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
            tarih TEXT,
                ciro REAL,
                    adet REAL,
                        unvan TEXT,
                            kategori TEXT,
                                urun TEXT,
                                    urun_kod TEXT,
                                        barkod TEXT
                                          )`,
    `CREATE INDEX IF NOT EXISTS idx_gt_sales_tarih ON gt_sales_raw(tarih)`,
    `CREATE TABLE IF NOT EXISTS gt_cost_by_kod (urun_kod TEXT PRIMARY KEY, alis_fiyat REAL)`,
    `CREATE TABLE IF NOT EXISTS gt_cost_by_barkod (barkod TEXT PRIMARY KEY, alis_fiyat REAL)`,
    `CREATE TABLE IF NOT EXISTS gt_cost_by_name (urun_key TEXT PRIMARY KEY, alis_fiyat REAL)`,
    `CREATE TABLE IF NOT EXISTS gt_masraf_raw (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
            tarih TEXT,
                kategori TEXT,
                    tutar REAL,
                        aciklama TEXT
                          )`,
    `CREATE INDEX IF NOT EXISTS idx_gt_masraf_tarih ON gt_masraf_raw(tarih)`,
    `CREATE TABLE IF NOT EXISTS gt_distributor_unvan (unvan_norm TEXT PRIMARY KEY)`,
    `CREATE TABLE IF NOT EXISTS gt_stock (kategori TEXT, urun TEXT, miktar REAL)`,
    `DELETE FROM gt_sales_raw`,
    `DELETE FROM gt_cost_by_kod`,
    `DELETE FROM gt_cost_by_barkod`,
    `DELETE FROM gt_cost_by_name`,
    `DELETE FROM gt_masraf_raw`,
    `DELETE FROM gt_distributor_unvan`,
    `DELETE FROM gt_stock`
  ];

export async function onRequestGet({ env }) {
    if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
    const results = [];
    for (const sql of STATEMENTS) {
          try {
                  await env.APERION_DB.prepare(sql).run();
                  results.push({ ok: true, sql: sql.slice(0, 50) });
          } catch (error) {
                  results.push({ ok: false, sql: sql.slice(0, 50), error: error.message });
          }
    }
    return json({ ok: true, results });
}
