const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  'https://iilfwosoroflzubkaryj.supabase.co',
  'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW'
);

async function main() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('sales_raw')
      .select('id,firma_id,tarih,kaynak_cekilme_tarihi,ciro')
      .order('id')
      .range(from, from + 999);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  const groups = new Map();
  for (const r of all) {
    if (!r.firma_id || !r.tarih) continue;
    const key = `${r.firma_id}|${r.tarih}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const deleteIds = [];
  const summary = [];
  for (const [key, rows] of groups) {
    const batches = new Map();
    for (const r of rows) {
      const batch = (r.kaynak_cekilme_tarihi || '').slice(0, 19) || 'none';
      if (!batches.has(batch)) batches.set(batch, []);
      batches.get(batch).push(r);
    }
    if (batches.size <= 1) continue;

    const latest = [...batches.keys()].sort().at(-1);
    for (const [batch, rs] of batches) {
      if (batch !== latest) deleteIds.push(...rs.map(x => x.id));
    }
    const kept = batches.get(latest) || [];
    summary.push({
      key,
      batches: batches.size,
      keep: latest,
      keepRows: kept.length,
      keepCiro: kept.reduce((s, r) => s + Number(r.ciro || 0), 0),
    });
  }

  for (let i = 0; i < deleteIds.length; i += 200) {
    const ids = deleteIds.slice(i, i + 200);
    const { error } = await db.from('sales_raw').delete().in('id', ids);
    if (error) throw error;
  }

  console.log(JSON.stringify({
    totalRows: all.length,
    groupsCleaned: summary.length,
    deleted: deleteIds.length,
    examples: summary.slice(0, 10),
  }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
