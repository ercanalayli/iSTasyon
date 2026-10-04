const PAYMENT_SHEET_ID = '1RdKOKgXRb5yt1bWnw-a4jYqpkkTk41941ZFlMFkEdxk';
const ISTANBUL_TZ = 'Europe/Istanbul';

function corsJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}

export async function onRequestOptions() {
  return corsJson({ ok: true });
}

function istanbulDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISTANBUL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { year: get('year'), month: get('month'), day: get('day') };
}

function isoFromParts({ year, month, day }) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthTab(year, month) {
  return `${month}${String(year).slice(-2)}A`;
}

function addDaysIso(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

function nextMonth(year, month) {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

function parseGvizDate(value) {
  const m = String(value || '').match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/);
  if (!m) return '';
  return `${m[1]}-${String(Number(m[2]) + 1).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`;
}

function parseGviz(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('gviz_invalid_payload');
  return JSON.parse(text.slice(start, end + 1));
}

async function fetchPaymentRows(tab, range) {
  const url = `https://docs.google.com/spreadsheets/d/${PAYMENT_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}&range=${encodeURIComponent(range)}`;
  const response = await fetch(url, { headers: { 'user-agent': 'AperiON-Safe-Summary/1.0' } });
  if (!response.ok) throw new Error(`payment_source_http_${response.status}`);
  const payload = parseGviz(await response.text());
  const rows = payload?.table?.rows || [];
  return rows.map((row) => {
    const c = row?.c || [];
    const date = parseGvizDate(c[0]?.v);
    const remaining = Number(c[6]?.v || 0);
    return { date, remaining: Number.isFinite(remaining) ? remaining : 0 };
  }).filter((row) => row.date);
}

async function livePaymentCounts() {
  const p = istanbulDateParts();
  const today = isoFromParts(p);
  const end7 = addDaysIso(today, 7);
  const currentTab = monthTab(p.year, p.month);
  const nm = nextMonth(p.year, p.month);
  const nextTab = monthTab(nm.year, nm.month);

  const [current, next] = await Promise.all([
    fetchPaymentRows(currentTab, 'A36:N100'),
    fetchPaymentRows(nextTab, 'A36:N80').catch(() => []),
  ]);

  const openCurrent = current.filter((r) => r.remaining > 0);
  const openAll = current.concat(next).filter((r) => r.remaining > 0);

  return {
    current_tab: currentTab,
    next_tab: nextTab,
    today_payments: openCurrent.filter((r) => r.date === today).length,
    overdue_payments: openCurrent.filter((r) => r.date < today).length,
    next7_payments: openAll.filter((r) => r.date > today && r.date <= end7).length,
  };
}

async function ensureSchema(db) {
  await db.prepare(
    "CREATE TABLE IF NOT EXISTS a1_dashboard_snapshots (snapshot_key TEXT PRIMARY KEY, generated_at TEXT NOT NULL, source_modified_at TEXT, payload_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))"
  ).run();
  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_a1_dashboard_generated ON a1_dashboard_snapshots(generated_at DESC)"
  ).run();
}

function countOpenApprovals(rows) {
  if (!Array.isArray(rows)) return null;
  return rows.filter((row) => {
    const status = String(row?.DURUM || '').toLocaleUpperCase('tr-TR');
    return status && !status.includes('UYGULANDI') && !status.includes('TAMAMLANDI') && !status.includes('KAPANDI');
  }).length;
}

function protectedCounts(snapshot) {
  const work = snapshot?.work || {};
  const kpi = snapshot?.kpi || {};
  const count = (kpiValue, rows) => {
    if (Number.isFinite(Number(kpiValue))) return Number(kpiValue);
    return Array.isArray(rows) ? rows.length : null;
  };
  return {
    open_tasks: count(kpi.open_tasks, work.todo),
    collections: count(kpi.collections, work.collections),
    orders_to_place: count(kpi.orders_to_place, work.orders_to_place),
    received_orders: count(kpi.received_orders, work.received_orders),
    approvals_open: countOpenApprovals(snapshot?.approvals),
    pending_documents: Array.isArray(snapshot?.pending_documents) ? snapshot.pending_documents.length : null,
  };
}

async function readProtectedSnapshot(env) {
  if (!env.APERION_DB) return { available: false, stale: true, counts: null };
  try {
    await ensureSchema(env.APERION_DB);
    const row = await env.APERION_DB.prepare(
      'SELECT generated_at,payload_json FROM a1_dashboard_snapshots ORDER BY generated_at DESC LIMIT 1'
    ).first();
    if (!row) return { available: false, stale: true, counts: null };
    const ageSeconds = Math.max(0, Math.round((Date.now() - Date.parse(row.generated_at)) / 1000));
    const snapshot = JSON.parse(row.payload_json || '{}');
    return {
      available: true,
      generated_at: row.generated_at,
      age_seconds: ageSeconds,
      stale: ageSeconds > 600,
      counts: ageSeconds > 600 ? null : protectedCounts(snapshot),
    };
  } catch (error) {
    return {
      available: false,
      stale: true,
      counts: null,
      error: String(error?.message || error).slice(0, 120),
    };
  }
}

export async function onRequestGet({ env }) {
  try {
    const [payments, protectedState] = await Promise.all([
      livePaymentCounts(),
      readProtectedSnapshot(env),
    ]);

    const pc = protectedState.counts || {};
    return corsJson({
      ok: true,
      protocol: 'aperion-a1-public-summary-v2',
      generated_at: new Date().toISOString(),
      stale: false,
      protected_generated_at: protectedState.generated_at || null,
      protected_stale: protectedState.stale !== false,
      source: {
        payments: 'live-gviz-counts-only',
        current_tab: payments.current_tab,
        next_tab: payments.next_tab,
        protected_snapshot: protectedState.available ? 'd1' : 'unavailable',
      },
      counts: {
        today_payments: payments.today_payments,
        overdue_payments: payments.overdue_payments,
        next7_payments: payments.next7_payments,
        open_tasks: pc.open_tasks ?? null,
        collections: pc.collections ?? null,
        orders_to_place: pc.orders_to_place ?? null,
        received_orders: pc.received_orders ?? null,
        approvals_open: pc.approvals_open ?? null,
        pending_documents: pc.pending_documents ?? null,
      },
    });
  } catch (error) {
    return corsJson({
      ok: false,
      error: 'summary_read_failed',
      message: String(error?.message || error).slice(0, 160),
    }, 500);
  }
}
