const CONTROL_SHEET_ID = '155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc';
const PAYMENT_SHEET_ID = '1RdKOKgXRb5yt1bWnw-a4jYqpkkTk41941ZFlMFkEdxk';
const A1_ENDPOINT = 'https://aperion-istasyon.pages.dev/api/apeiron-a1';
const TZ = 'Europe/Istanbul';

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`missing_secret_${name.toLowerCase()}`);
  return value;
}

async function accessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: required('GOOGLE_CLIENT_ID'),
      client_secret: required('GOOGLE_CLIENT_SECRET'),
      refresh_token: required('GOOGLE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(`google_oauth_http_${response.status}_${String(data.error || 'refresh_failed').slice(0, 60)}`);
  }
  return data.access_token;
}

async function batchGet(token, spreadsheetId, ranges) {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet`);
  for (const range of ranges) url.searchParams.append('ranges', range);
  url.searchParams.set('valueRenderOption', 'FORMATTED_VALUE');
  url.searchParams.set('dateTimeRenderOption', 'FORMATTED_STRING');
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = data?.error?.status || data?.error?.message || 'sheets_failed';
    throw new Error(`sheets_http_${response.status}_${String(reason).slice(0, 80)}`);
  }
  return (data.valueRanges || []).map((x) => x.values || []);
}

function dateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { year: get('year'), month: get('month'), day: get('day') };
}

function iso(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function monthTab(parts) {
  return `${parts.month}${String(parts.year).slice(-2)}A`;
}

function nextMonth(parts) {
  return parts.month === 12
    ? { year: parts.year + 1, month: 1, day: 1 }
    : { year: parts.year, month: parts.month + 1, day: 1 };
}

function addDaysIso(isoDate, days) {
  const [y,m,d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10);
}

function money(value) {
  if (typeof value === 'number') return value;
  let text = String(value == null ? '' : value).trim();
  if (!text) return 0;
  text = text.replace(/\s/g, '').replace(/₺|TL|TRY/gi, '');
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  else text = text.replace(/,/g, '');
  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

function isoDate(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return '';
  let m = text.match(/^(20\d{2})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = text.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  const months = {
    ocak:'01', subat:'02', 'şubat':'02', mart:'03', nisan:'04', mayis:'05', 'mayıs':'05',
    haziran:'06', temmuz:'07', agustos:'08', 'ağustos':'08', eylul:'09', 'eylül':'09',
    ekim:'10', kasim:'11', 'kasım':'11', aralik:'12', 'aralık':'12'
  };
  m = text.toLocaleLowerCase('tr-TR').match(/^(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{2}|20\d{2})$/i);
  if (m && months[m[2]]) {
    const year = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${year}-${months[m[2]]}-${String(m[1]).padStart(2,'0')}`;
  }
  return text;
}

function table(values, requiredHeader) {
  const headerIndex = values.findIndex((row) => (row || []).map(String).includes(requiredHeader));
  if (headerIndex < 0) return { headers: [], rows: [] };
  const headers = (values[headerIndex] || []).map((x) => String(x || '').trim());
  const rows = values.slice(headerIndex + 1)
    .filter((row) => (row || []).some((x) => String(x ?? '').trim() !== ''))
    .map((row) => {
      const item = {};
      headers.forEach((h, i) => { if (h) item[h] = row?.[i]; });
      return item;
    });
  return { headers, rows };
}

function paymentRows(values) {
  return table(values, 'TARİH').rows.map((row) => ({
    date: isoDate(row['TARİH']),
    due: isoDate(row['TARİH']),
    due_status: String(row['VADE'] || ''),
    radar: String(row['RADAR'] || ''),
    status: String(row['DURUM'] || ''),
    accrual: money(row['TUTAR']),
    paid: money(row['ÖDENEN'] ?? row['ODENEN']),
    remaining: money(row['KALAN']),
    section: String(row['BÖLÜM'] || row['BOLUM'] || ''),
    bank: String(row['BANKA'] || ''),
    account: String(row['CARİ'] || row['CARI'] || ''),
    method: String(row['YÖNTEM'] || row['YONTEM'] || ''),
    installment: String(row['TAK'] || ''),
    type: String(row['TÜR'] || row['TUR'] || ''),
    note: String(row['AÇIKLAMA / NOT'] || row['ACIKLAMA / NOT'] || ''),
  })).filter((row) => row.date || row.accrual || row.paid || row.remaining || row.bank || row.account || row.note);
}

function taskRows(values) {
  if (!values.length) return [];
  const headers = (values[0] || []).map(String);
  return values.slice(1)
    .filter((row) => String(row?.[0] || '').trim() !== '')
    .map((row) => {
      const x = {};
      headers.forEach((h, i) => { if (h) x[h] = row?.[i]; });
      return {
        id: String(x.KAYIT_ID || ''),
        category: String(x.CATEGORY || ''),
        title: String(x.BASLIK || ''),
        due: isoDate(x.VADE),
        amount: money(x.TUTAR),
        paid: money(x.ODENEN),
        stage: Number(x.STAGE || 0),
        note: String(x.NOT || ''),
        owner: String(x.SAHIP || ''),
        source: String(x.KAYNAK || ''),
        promise_date: isoDate(x.ODEME_SOZU_TARIHI),
        promise_amount: money(x.ODEME_SOZU_TUTARI),
        promisor: String(x.SOZ_VEREN || ''),
        completed_at: String(x.TAMAMLANMA || ''),
        updated_at: String(x.SON_GUNCELLEME || ''),
      };
    });
}

function simpleRows(values, maxRows) {
  if (!values.length) return [];
  const headers = (values[0] || []).map(String);
  return values.slice(1)
    .filter((row) => String(row?.[0] || '').trim() !== '')
    .slice(0, maxRows)
    .map((row) => {
      const x = {};
      headers.forEach((h, i) => { if (h) x[h] = row?.[i] ?? ''; });
      return x;
    });
}

function sum(rows, key) {
  return Math.round(rows.reduce((acc, row) => acc + Number(row?.[key] || 0), 0) * 100) / 100;
}

async function main() {
  const token = await accessToken();
  const now = new Date();
  const parts = dateParts(now);
  const today = iso(parts);
  const end7 = addDaysIso(today, 7);
  const currentTab = monthTab(parts);
  const nextTab = monthTab(nextMonth(parts));

  const [controlRanges, paymentRanges] = await Promise.all([
    batchGet(token, CONTROL_SHEET_ID, [
      'IS_TAKIP_GIRIS!A1:T200',
      "'ONAY KUYRUGU'!A1:Z100",
      'EVENT_LEDGER!A1:L100',
      'BELGE_INDEKSI!A1:L100',
    ]),
    batchGet(token, PAYMENT_SHEET_ID, [
      `'${currentTab}'!A36:N100`,
      `'${nextTab}'!A36:N80`,
    ]),
  ]);

  const [taskValues = [], approvalValues = [], eventValues = [], documentValues = []] = controlRanges;
  const [currentValues = [], nextValues = []] = paymentRanges;

  const current = paymentRows(currentValues);
  const next = paymentRows(nextValues);
  const tasks = taskRows(taskValues);
  const approvals = simpleRows(approvalValues, 50);
  const events = simpleRows(eventValues, 30);
  const documents = simpleRows(documentValues, 30);

  const allPayments = current.concat(next);
  const openCurrent = current.filter((r) => r.remaining > 0);
  const openAll = allPayments.filter((r) => r.remaining > 0);
  const overdue = openCurrent.filter((r) => r.due && r.due < today);
  const dueToday = openCurrent.filter((r) => r.due === today);
  const next7 = openAll.filter((r) => r.due && r.due > today && r.due <= end7);

  const snapshot = {
    protocol: 'aperion-a1-v1',
    snapshot_key: 'a1:' + now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    generated_at: now.toISOString(),
    freshness: {
      google_sheet_read_at: now.toISOString(),
      current_tab: currentTab,
      next_tab: nextTab,
      source: 'github-actions-google-sheets-readonly',
    },
    kpi: {
      overdue_remaining: sum(overdue, 'remaining'),
      today_remaining: sum(dueToday, 'remaining'),
      next7_remaining: sum(next7, 'remaining'),
      open_remaining: sum(openCurrent, 'remaining'),
      open_tasks: tasks.filter((t) => t.category === 'todo' && t.stage < 2).length,
      collections: tasks.filter((t) => t.category === 'collect' && t.stage < 2).length,
      orders_to_place: tasks.filter((t) => t.category === 'order' && t.stage < 2).length,
      received_orders: tasks.filter((t) => t.category === 'received' && t.stage < 3).length,
      approvals: approvals.length,
    },
    payments: {
      overdue,
      today: dueToday,
      next7,
      open_total: sum(openCurrent, 'remaining'),
      overdue_accrual: sum(overdue, 'accrual'),
      overdue_paid: sum(overdue, 'paid'),
    },
    work: {
      todo: tasks.filter((t) => t.category === 'todo' && t.stage < 2),
      collections: tasks.filter((t) => t.category === 'collect' && t.stage < 2),
      orders_to_place: tasks.filter((t) => t.category === 'order' && t.stage < 2),
      received_orders: tasks.filter((t) => t.category === 'received' && t.stage < 3),
      completed_today: tasks.filter((t) => t.completed_at && String(t.completed_at).slice(0, 10) === today),
    },
    approvals,
    latest_events: events.slice(-20).reverse(),
    pending_documents: documents.filter((d) => {
      const status = String(d.DURUM || '').toLocaleUpperCase('tr-TR');
      return status.includes('BEKLIYOR') || status.includes('BEKLİYOR');
    }).slice(-20).reverse(),
    source_refs: {
      payment_sheet_id: PAYMENT_SHEET_ID,
      control_sheet_id: CONTROL_SHEET_ID,
    },
  };

  const bridgeSecret = required('APERION_BRIDGE_SECRET');
  const response = await fetch(A1_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${bridgeSecret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ snapshot }),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok !== true) {
    throw new Error(`a1_post_http_${response.status}_${String(result?.error || 'write_failed').slice(0, 80)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    protocol: snapshot.protocol,
    generated_at: snapshot.generated_at,
    current_tab: currentTab,
    next_tab: nextTab,
    counts: {
      today_payments: dueToday.length,
      overdue_payments: overdue.length,
      next7_payments: next7.length,
      open_tasks: snapshot.kpi.open_tasks,
      collections: snapshot.kpi.collections,
      orders_to_place: snapshot.kpi.orders_to_place,
      received_orders: snapshot.kpi.received_orders,
      approvals: approvals.length,
      pending_documents: snapshot.pending_documents.length,
    },
    protected_details_logged: false,
    financial_writes: false,
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: String(error?.message || error).slice(0, 180), financial_writes: false }));
  process.exitCode = 1;
});
