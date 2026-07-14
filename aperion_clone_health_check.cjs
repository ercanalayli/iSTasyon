const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const OUT_JSON = path.join(DATA_DIR, 'aperion_clone_health.json');
const OUT_TXT = path.join(DATA_DIR, 'aperion_clone_health.txt');

fs.mkdirSync(DATA_DIR, { recursive: true });

function loadEnvFallback() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

loadEnvFallback();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
// The health check must read with the same privileged credential as the clone.
// A publishable key is subject to RLS and can incorrectly report zero fresh rows.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function count(table, filters = []) {
  let q = db.from(table).select('*', { count: 'exact', head: true });
  for (const f of filters) q = q[f.op](f.col, f.val);
  const { count: c, error } = await q;
  return { count: c || 0, error: error?.message || null };
}

async function distinctDates(table, from, to) {
  const { data, error } = await db
    .from(table)
    .select('tarih')
    .eq('firma_id', 'alayli')
    .gte('tarih', from)
    .lte('tarih', to)
    .order('tarih', { ascending: true });
  if (error) return { dates: [], error: error.message };
  return { dates: [...new Set((data || []).map(r => r.tarih).filter(Boolean))], error: null };
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

async function main() {
  const now = new Date();
  const today = isoDate(now);
  const yesterday = isoDate(addDays(now, -1));
  const from15 = isoDate(addDays(now, -14));
  const lastSync = readJson(path.join(DATA_DIR, 'aperion_last_sync.json'), null);
  const sonIslemler = readJson(path.join(ROOT, 'bizimhesap_son_islemler.json'), null);

  const sales15 = await count('sales_raw', [
    { op: 'eq', col: 'firma_id', val: 'alayli' },
    { op: 'gte', col: 'tarih', val: from15 },
    { op: 'lte', col: 'tarih', val: today },
  ]);
  const salesToday = await count('sales_raw', [
    { op: 'eq', col: 'firma_id', val: 'alayli' },
    { op: 'eq', col: 'tarih', val: today },
  ]);
  const salesYesterday = await count('sales_raw', [
    { op: 'eq', col: 'firma_id', val: 'alayli' },
    { op: 'eq', col: 'tarih', val: yesterday },
  ]);
  const salesDates = await distinctDates('sales_raw', from15, today);
  const masraf2026 = await count('masraf_raw', [
    { op: 'eq', col: 'firma_id', val: 'alayli' },
    { op: 'gte', col: 'tarih', val: '2026-01-01' },
  ]);
  const productRaw = await count('product_raw', [
    { op: 'eq', col: 'firma_id', val: 'alayli' },
  ]);
  const events = await count('bizimhesap_events', [
    { op: 'eq', col: 'firma_id', val: 'alayli' },
  ]);

  const expectedDates = [];
  for (let d = new Date(from15); isoDate(d) <= today; d = addDays(d, 1)) expectedDates.push(isoDate(d));
  const missingSalesDates = expectedDates.filter(d => !salesDates.dates.includes(d));

  const checks = [
    { name: 'last_sync_ok', ok: Boolean(lastSync?.ok), detail: lastSync?.finishedAt || 'son senkron yok' },
    { name: 'sales_last_15_days', ok: sales15.count > 0 && !sales15.error, detail: `${sales15.count} kayit` },
    { name: 'sales_today_exists', ok: salesToday.count > 0 && !salesToday.error, detail: `${today}: ${salesToday.count} kayit` },
    { name: 'sales_yesterday_exists', ok: salesYesterday.count > 0 && !salesYesterday.error, detail: `${yesterday}: ${salesYesterday.count} kayit` },
    { name: 'sales_dates_complete', ok: missingSalesDates.length === 0 && !salesDates.error, detail: missingSalesDates.length ? `eksik: ${missingSalesDates.join(', ')}` : '15 gun tamam' },
    { name: 'masraf_2026_exists', ok: masraf2026.count > 0 && !masraf2026.error, detail: `${masraf2026.count} kayit` },
    { name: 'product_raw_exists', ok: productRaw.count > 0 && !productRaw.error, detail: `${productRaw.count} kayit` },
    { name: 'son_islemler_seen', ok: Boolean(sonIslemler?.toplam), detail: `${sonIslemler?.toplam || 0} son islem` },
  ];

  const report = {
    generated_at: now.toISOString(),
    firma_id: 'alayli',
    status: checks.every(c => c.ok) ? 'saglikli' : 'kontrol_gerekli',
    checks,
    counts: {
      sales_last_15_days: sales15.count,
      sales_today: salesToday.count,
      sales_yesterday: salesYesterday.count,
      masraf_2026: masraf2026.count,
      product_raw: productRaw.count,
      bizimhesap_events: events.count,
    },
    errors: [sales15, salesToday, salesYesterday, salesDates, masraf2026, productRaw, events]
      .map(x => x.error)
      .filter(Boolean),
    last_sync: lastSync,
  };

  const lines = [
    `AperiON klon saglik: ${report.status}`,
    `Tarih: ${report.generated_at}`,
    ...checks.map(c => `${c.ok ? 'OK' : 'KONTROL'} - ${c.name}: ${c.detail}`),
  ];

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(OUT_TXT, lines.join('\n'), 'utf8');
  console.log(lines.join('\n'));
  process.exitCode = report.status === 'saglikli' ? 0 : 2;
}

main().catch(err => {
  fs.writeFileSync(OUT_TXT, `AperiON klon saglik: hata\n${err.message}`, 'utf8');
  console.error(err.message);
  process.exitCode = 1;
});
