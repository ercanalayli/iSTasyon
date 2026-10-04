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


async function safePublicCounts() {
  const url = `https://docs.google.com/spreadsheets/d/${PAYMENT_SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=APERION_PUBLIC_SUMMARY&range=A1:B8`;
  const response = await fetch(url, { headers: { 'user-agent': 'AperiON-Safe-Summary/1.0' } });
  if (!response.ok) return { available: false, stale: true, counts: null };

  const payload = parseGviz(await response.text());
  const rows = payload?.table?.rows || [];
  const map = {};
  for (const row of rows) {
    const key = String(row?.c?.[0]?.v || '').replace(/\\_/g, '_');
    const value = row?.c?.[1]?.v;
    if (key) map[key] = value;
  }

  const epoch = Number(map.generated_at_epoch);
  const ageSeconds = Number.isFinite(epoch) ? Math.max(0, Math.round(Date.now() / 1000 - epoch)) : null;
  const stale = ageSeconds == null || ageSeconds > 4500;
  const n = (key) => Number.isFinite(Number(map[key])) ? Number(map[key]) : null;

  return {
    available: true,
    generated_at: Number.isFinite(epoch) ? new Date(epoch * 1000).toISOString() : null,
    age_seconds: ageSeconds,
    stale,
    counts: stale ? null : {
      open_tasks: n('open_tasks'),
      collections: n('collections'),
      orders_to_place: n('orders_to_place'),
      received_orders: n('received_orders'),
      approvals_open: n('approvals_open'),
      pending_documents: n('pending_documents'),
    },
  };
}


async function safeFirst(db, sql) {
  if (!db) return { available: false, row: null };
  try {
    return { available: true, row: await db.prepare(sql).first() };
  } catch (error) {
    return { available: false, row: null, error: String(error?.message || error).slice(0, 120) };
  }
}

async function safeAll(db, sql) {
  if (!db) return { available: false, rows: [] };
  try {
    const result = await db.prepare(sql).all();
    return { available: true, rows: result?.results || [] };
  } catch (error) {
    return { available: false, rows: [], error: String(error?.message || error).slice(0, 120) };
  }
}

function normalizedType(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9çğıöşü]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function liveD1Counts(db) {
  if (!db) return { available: false, fully_available: false, counts: null };
  const [work, approvals, commitments] = await Promise.all([
    safeFirst(db, "SELECT COUNT(*) AS count FROM work_items WHERE status NOT IN ('completed','cancelled','verified','done','closed')"),
    safeFirst(db, "SELECT COUNT(*) AS count FROM approval_queue WHERE status IN ('needs_review','pending','approval_pending')"),
    safeAll(db, "SELECT commitment_type FROM commitment_timeline WHERE status NOT IN ('completed','cancelled','verified','done','closed') LIMIT 2000"),
  ]);

  let collections = null;
  let ordersToPlace = null;
  let receivedOrders = null;
  if (commitments.available) {
    collections = 0;
    ordersToPlace = 0;
    receivedOrders = 0;
    const collectionTypes = new Set(['receivable','collection','tahsilat']);
    const placedTypes = new Set(['purchase_order','supplier_order','placed_order','verilen_siparis']);
    const receivedTypes = new Set(['received_order','sales_order','customer_order','alinan_siparis']);
    for (const row of commitments.rows) {
      const type = normalizedType(row.commitment_type);
      if (collectionTypes.has(type)) collections += 1;
      if (placedTypes.has(type)) ordersToPlace += 1;
      if (receivedTypes.has(type)) receivedOrders += 1;
    }
  }

  return {
    available: work.available || approvals.available || commitments.available,
    fully_available: work.available && approvals.available && commitments.available,
    sources: {
      work_items: work.available,
      approval_queue: approvals.available,
      commitment_timeline: commitments.available,
    },
    counts: {
      open_tasks: work.available ? Number(work.row?.count || 0) : null,
      collections,
      orders_to_place: ordersToPlace,
      received_orders: receivedOrders,
      approvals_open: approvals.available ? Number(approvals.row?.count || 0) : null,
      pending_documents: null,
    },
  };
}

function sameKnownCounts(a, b) {
  if (!a || !b) return null;
  const keys = ['open_tasks','collections','orders_to_place','received_orders','approvals_open'];
  let compared = 0;
  for (const key of keys) {
    if (a[key] == null || b[key] == null) continue;
    compared += 1;
    if (Number(a[key]) !== Number(b[key])) return false;
  }
  return compared ? true : null;
}

export async function onRequestGet({ env }) {
  try {
    const [payments, safeSheet, d1] = await Promise.all([
      livePaymentCounts(),
      safePublicCounts(),
      liveD1Counts(env),
    ]);

    const safeFresh = safeSheet.available && safeSheet.stale === false && safeSheet.counts;
    const d1Consistency = safeFresh ? sameKnownCounts(safeSheet.counts, d1.counts) : null;
    const protectedCounts = safeFresh
      ? safeSheet.counts
      : (d1.fully_available && d1Consistency !== false ? d1.counts : null);
    const protectedSource = safeFresh
      ? 'privacy-safe-sheet-summary'
      : (protectedCounts ? 'd1-live-core' : 'unavailable');

    return corsJson({
      ok: true,
      protocol: 'aperion-a1-public-summary-v4',
      generated_at: new Date().toISOString(),
      stale: false,
      protected_generated_at: safeFresh ? safeSheet.generated_at : new Date().toISOString(),
      protected_stale: !protectedCounts,
      source: {
        payments: 'live-gviz-counts-only',
        current_tab: payments.current_tab,
        next_tab: payments.next_tab,
        protected_snapshot: protectedSource,
        d1_sources: d1.sources || null,
        d1_consistent_with_safe_sheet: d1Consistency,
      },
      counts: {
        today_payments: payments.today_payments,
        overdue_payments: payments.overdue_payments,
        next7_payments: payments.next7_payments,
        open_tasks: protectedCounts?.open_tasks ?? null,
        collections: protectedCounts?.collections ?? null,
        orders_to_place: protectedCounts?.orders_to_place ?? null,
        received_orders: protectedCounts?.received_orders ?? null,
        approvals_open: protectedCounts?.approvals_open ?? null,
        pending_documents: protectedCounts?.pending_documents ?? null,
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
