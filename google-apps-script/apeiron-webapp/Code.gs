/**
 * Apeiron | İstasyON Web App
 * Free runtime: Google Apps Script + Google Sheets/Drive only.
 * Canonical architecture:
 * - Tasks: Apeiron Kontrol Merkezi / IS_TAKIP_GIRIS
 * - Payments: authorized payment spreadsheet, relevant A-tab
 * - Approvals/docs/audit/finance: canonical control-center sheets
 * - Default = read-only. Only non-financial operational completion is writable.
 */

const APP = Object.freeze({
  CONTROL_ID: '155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc',
  PAYMENT_ID: '1RdKOKgXRb5yt1bWnw-a4jYqpkkTk41941ZFlMFkEdxk',
  TZ: 'Europe/Istanbul',
  TASK_SHEET: 'IS_TAKIP_GIRIS',
  CONFIG_SHEET: 'WEB_APP_CONFIG',
  MENU_SHEET: 'WEB_APP_MENU',
  EVENT_SHEET: 'EVENT_LEDGER'
});

function doGet(e) {
  if (e && e.parameter && e.parameter.health === '1') {
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      app: 'Apeiron | İstasyON',
      version: 'SCRIPT_SHEETS_V1',
      time: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Apeiron | İstasyON')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getAppBootstrap() {
  const now = new Date();
  const today = isoDate_(now);
  const next7 = isoDate_(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
  const control = SpreadsheetApp.openById(APP.CONTROL_ID);
  const payment = SpreadsheetApp.openById(APP.PAYMENT_ID);

  const tasks = readTasks_(control);
  const payments = readPayments_(payment, now);
  const approvals = sheetObjects_(control, 'ONAY KUYRUGU', 'A1:Z150', 150);
  const documents = sheetObjects_(control, 'BELGE_INDEKSI', 'A1:L150', 150);
  const events = sheetObjects_(control, APP.EVENT_SHEET, 'A1:L150', 150);
  const health = sheetObjects_(control, 'KAYNAK SAGLIGI', 'A1:H80', 80);
  const menu = sheetObjects_(control, APP.MENU_SHEET, 'A1:H80', 80);
  const config = sheetObjects_(control, APP.CONFIG_SHEET, 'A1:D80', 80);
  const finance = sheetMatrix_(control, 'FINANS_DASHBOARD', 'A1:L40');
  const istasyon = readIstasyon_(control);

  const openTasks = tasks.filter(t => !t.completed_at && t.stage < 2);
  const todo = openTasks.filter(t => t.category === 'todo');
  const collect = openTasks.filter(t => t.category === 'collect');
  const order = openTasks.filter(t => t.category === 'order');
  const received = tasks.filter(t => !t.completed_at && t.category === 'received' && t.stage < 3);
  const completedToday = tasks.filter(t => String(t.completed_at || '').slice(0,10) === today);

  const openPayments = payments.rows.filter(p => p.remaining > 0);
  const overduePayments = openPayments.filter(p => p.due && p.due < today);
  const todayPayments = openPayments.filter(p => p.due === today);
  const next7Payments = openPayments.filter(p => p.due && p.due > today && p.due <= next7);

  const overdueTasks = openTasks.filter(t => t.due && t.due < today);
  const todayTasks = openTasks.filter(t => t.due === today);
  const next7Tasks = openTasks.filter(t => t.due && t.due > today && t.due <= next7);

  const critical = [
    ...overduePayments.map(p => Object.assign({kind:'payment'}, p)),
    ...overdueTasks.map(t => Object.assign({kind:'task'}, t))
  ].sort((a,b) => String(a.due || '').localeCompare(String(b.due || '')));

  const todayItems = [
    ...todayPayments.map(p => Object.assign({kind:'payment'}, p)),
    ...todayTasks.map(t => Object.assign({kind:'task'}, t))
  ];

  const next7Items = [
    ...next7Payments.map(p => Object.assign({kind:'payment'}, p)),
    ...next7Tasks.map(t => Object.assign({kind:'task'}, t))
  ].sort((a,b) => String(a.due || '').localeCompare(String(b.due || '')));

  const pendingApprovals = approvals.filter(a => {
    const s = norm_(a.DURUM);
    return !/uygulandi|uygulandı|tamam|closed|kapandi|kapandı/.test(s);
  });

  const pendingDocs = documents.filter(d => /bekliyor|inceleme|eslesme|eşleşme/.test(norm_(d.DURUM)));
  const ready = pendingApprovals.filter(a => /hazir|hazır|onay/.test(norm_(a.DURUM + ' ' + a.ISLEM)));

  return {
    ok: true,
    version: 'SCRIPT_SHEETS_V1',
    generated_at: fmtDateTime_(now),
    generated_iso: now.toISOString(),
    read_only_default: true,
    sources: {
      control_sheet_id: APP.CONTROL_ID,
      control_modified_at: DriveApp.getFileById(APP.CONTROL_ID).getLastUpdated().toISOString(),
      payment_sheet_id: APP.PAYMENT_ID,
      payment_modified_at: DriveApp.getFileById(APP.PAYMENT_ID).getLastUpdated().toISOString(),
      payment_tabs: payments.tabs
    },
    config: config,
    menu: menu.filter(x => norm_(x.STATUS) === 'aktif'),
    kpi: {
      critical: critical.length,
      today: todayItems.length,
      next7: next7Items.length,
      open_payment: sum_(openPayments,'remaining'),
      collections: collect.length,
      orders_to_place: order.length,
      received_orders: received.length,
      todos: todo.length,
      approvals: pendingApprovals.length
    },
    sections: {
      critical,
      today: todayItems,
      next7: next7Items,
      todo,
      payment: openPayments,
      collect,
      order,
      received,
      completed: completedToday,
      ready
    },
    approvals: pendingApprovals,
    documents: pendingDocs,
    events: events.slice(-30).reverse(),
    health,
    finance,
    istasyon
  };
}

/**
 * Non-financial write only.
 * collect/payment are intentionally blocked.
 * Uses KAYIT_ID for idempotent lookup and audit trail.
 */
function completeOperationalTask(taskId) {
  if (!taskId) throw new Error('KAYIT_ID gerekli.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(APP.CONTROL_ID);
    const sh = ss.getSheetByName(APP.TASK_SHEET);
    const values = sh.getDataRange().getValues();
    const headers = values[0].map(String);
    const idx = indexMap_(headers);
    const rowOffset = values.slice(1).findIndex(r => String(r[idx.KAYIT_ID] || '') === String(taskId));
    if (rowOffset < 0) throw new Error('Kayıt bulunamadı: ' + taskId);

    const rowNo = rowOffset + 2;
    const row = values[rowNo - 1];
    const category = String(row[idx.CATEGORY] || '').toLowerCase();

    if (category === 'collect' || category === 'payment') {
      throw new Error('Finansal sonuç doğuran kayıtlar web panelinden tamamlanamaz; açık onay gerekir.');
    }
    if (!['todo','order','received'].includes(category)) {
      throw new Error('Bu kategori web panelinden tamamlanmaya kapalı.');
    }

    const completedCol = idx.TAMAMLANMA + 1;
    const stageCol = idx.STAGE + 1;
    const updatedCol = idx.SON_GUNCELLEME + 1;
    if (String(row[idx.TAMAMLANMA] || '').trim()) {
      return {ok:true, duplicate:true, id:taskId};
    }

    const stamp = new Date().toISOString();
    sh.getRange(rowNo, completedCol).setValue(stamp);
    sh.getRange(rowNo, stageCol).setValue(category === 'received' ? 3 : 2);
    sh.getRange(rowNo, updatedCol).setValue(stamp);

    appendAuditEvent_(ss, {
      source: 'Apps Script Web App',
      area: 'IS_TAKIP',
      event: 'OPERASYON_GOREVI_TAMAMLANDI',
      status: 'TAMAMLANDI',
      risk: 'DUSUK',
      approval: 'FINANSAL_DEGIL',
      next: '',
      evidence: 'KAYIT_ID=' + taskId,
      related: taskId
    });

    SpreadsheetApp.flush();
    return {ok:true, duplicate:false, id:taskId, completed_at:stamp};
  } finally {
    lock.releaseLock();
  }
}

function readTasks_(ss) {
  const sh = ss.getSheetByName(APP.TASK_SHEET);
  if (!sh) throw new Error(APP.TASK_SHEET + ' bulunamadı.');
  const values = sh.getRange(1,1,Math.max(sh.getLastRow(),1),20).getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  const idx = indexMap_(headers);
  return values.slice(1)
    .filter(r => String(r[idx.KAYIT_ID] || '').trim())
    .map(r => ({
      id: String(r[idx.KAYIT_ID] || ''),
      category: String(r[idx.CATEGORY] || '').toLowerCase(),
      title: String(r[idx.BASLIK] || ''),
      due: isoDate_(r[idx.VADE]),
      amount: money_(r[idx.TUTAR]),
      paid: money_(r[idx.ODENEN]),
      stage: Number(r[idx.STAGE] || 0),
      note: String(r[idx.NOT] || ''),
      owner: String(r[idx.SAHIP] || ''),
      source: String(r[idx.KAYNAK] || ''),
      sync: String(r[idx.SYNC_DURUM] || ''),
      promise_date: isoDate_(r[idx.ODEME_SOZU_TARIHI]),
      promise_amount: money_(r[idx.ODEME_SOZU_TUTARI]),
      promisor: String(r[idx.SOZ_VEREN] || ''),
      completed_at: String(r[idx.TAMAMLANMA] || ''),
      updated_at: String(r[idx.SON_GUNCELLEME] || '')
    }));
}

function readPayments_(ss, now) {
  const tabNames = [monthTab_(now), monthTab_(new Date(now.getFullYear(), now.getMonth()+1, 1))];
  let rows = [];
  const used = [];
  tabNames.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    used.push(name);
    const values = sh.getRange(1,1,Math.min(Math.max(sh.getLastRow(),1),250),Math.min(Math.max(sh.getLastColumn(),1),20)).getDisplayValues();
    const table = findTable_(values, ['TARİH','TARIH']);
    table.rows.forEach(x => {
      const accrual = money_(first_(x,['TUTAR','TAHAKKUK']));
      const paid = money_(first_(x,['ÖDENEN','ODENEN']));
      const remainingRaw = first_(x,['KALAN']);
      const remaining = remainingRaw === '' ? Math.max(accrual-paid,0) : money_(remainingRaw);
      rows.push({
        tab:name,
        due: isoDate_(first_(x,['TARİH','TARIH'])),
        due_status: String(first_(x,['VADE']) || ''),
        radar: String(first_(x,['RADAR']) || ''),
        status: String(first_(x,['DURUM']) || ''),
        accrual,
        paid,
        remaining,
        section: String(first_(x,['BÖLÜM','BOLUM']) || ''),
        bank: String(first_(x,['BANKA']) || ''),
        account: String(first_(x,['CARİ','CARI','KURUM']) || ''),
        method: String(first_(x,['YÖNTEM','YONTEM']) || ''),
        type: String(first_(x,['TÜR','TUR']) || ''),
        note: String(first_(x,['AÇIKLAMA / NOT','ACIKLAMA / NOT','AÇIKLAMA','ACIKLAMA']) || '')
      });
    });
  });
  return {tabs:used, rows:rows.filter(r => r.due || r.accrual || r.paid || r.remaining || r.bank || r.account || r.note)};
}

function readIstasyon_(control) {
  const sh = control.getSheetByName('ISTASYON_SNAPSHOT');
  if (!sh) return {ok:false, error:'ISTASYON_SNAPSHOT yok'};
  const vals = sh.getRange('A1:B40').getDisplayValues();
  const map = {};
  vals.slice(1).forEach(r => { if (r[0]) map[String(r[0])] = r[1]; });
  let snap = {};
  try { snap = map.SNAPSHOT_JSON ? JSON.parse(map.SNAPSHOT_JSON) : {}; } catch (e) {}
  return {
    ok:true,
    generated_at: map.GENERATED_AT || '',
    version: map.VERSION || '',
    status: map.STATUS || snap.status || '',
    write_mode: map.WRITE_MODE || snap.write_mode || '',
    main_source_id: map.MAIN_SOURCE_ID || (snap.main_source && snap.main_source.spreadsheet_id) || '',
    bank_automation: map.BANK_AUTOMATION || '',
    last_bank_check: map.LAST_BANK_CHECK || '',
    moka_status: map.MOKA_STATUS || '',
    data_quality_alert: map.DATA_QUALITY_ALERT || '',
    master_status: map.MASTER_STATUS || ''
  };
}

function sheetObjects_(ss, sheetName, rangeA1, limit) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  const values = sh.getRange(rangeA1).getDisplayValues();
  if (!values.length) return [];
  const headers = values[0].map(v => String(v || '').trim());
  return values.slice(1)
    .filter(r => r.some(v => String(v || '').trim()))
    .slice(0,limit || 200)
    .map(r => {
      const o = {};
      headers.forEach((h,i) => { if (h) o[h] = r[i]; });
      return o;
    });
}

function sheetMatrix_(ss, sheetName, rangeA1) {
  const sh = ss.getSheetByName(sheetName);
  return sh ? sh.getRange(rangeA1).getDisplayValues() : [];
}

function appendAuditEvent_(ss, x) {
  const sh = ss.getSheetByName(APP.EVENT_SHEET);
  if (!sh) return;
  const headers = sh.getRange(1,1,1,Math.max(sh.getLastColumn(),12)).getDisplayValues()[0].map(String);
  const map = {
    EVENT_ID: 'WEB-' + Utilities.getUuid(),
    ZAMAN: new Date().toISOString(),
    KAYNAK: x.source || 'Apps Script',
    ALAN: x.area || 'WEB_APP',
    OLAY: x.event || '',
    DURUM: x.status || '',
    RISK: x.risk || '',
    ONAY: x.approval || '',
    SONRAKI_ADIM: x.next || '',
    KANIT: x.evidence || '',
    ILISKILI_ID: x.related || '',
    SON_GUNCELLEME: new Date().toISOString()
  };
  const row = headers.map(h => map[h] == null ? '' : map[h]);
  sh.appendRow(row);
}

function findTable_(values, requiredHeaders) {
  let hi = -1;
  for (let i=0;i<values.length;i++) {
    const norm = values[i].map(v => String(v || '').trim().toLocaleUpperCase('tr-TR'));
    if (requiredHeaders.some(h => norm.includes(h))) { hi = i; break; }
  }
  if (hi < 0) return {headers:[], rows:[]};
  const headers = values[hi].map(v => String(v || '').trim().toLocaleUpperCase('tr-TR'));
  const rows = values.slice(hi+1)
    .filter(r => r.some(v => String(v || '').trim()))
    .map(r => {
      const o = {};
      headers.forEach((h,i) => { if (h) o[h] = r[i]; });
      return o;
    });
  return {headers, rows};
}

function first_(o, keys) {
  for (const k of keys) if (Object.prototype.hasOwnProperty.call(o,k)) return o[k];
  return '';
}
function indexMap_(headers) {
  const out = {};
  headers.forEach((h,i) => out[String(h || '').trim()] = i);
  return out;
}
function monthTab_(d) { return String(d.getMonth()+1) + String(d.getFullYear()).slice(-2) + 'A'; }
function norm_(v) { return String(v || '').toLocaleLowerCase('tr-TR').replace(/\s+/g,' ').trim(); }
function money_(v) {
  if (typeof v === 'number') return v;
  let s = String(v == null ? '' : v).trim();
  if (!s) return 0;
  s = s.replace(/\s/g,'').replace(/₺|TRY|TL/gi,'');
  if (s.includes(',')) s = s.replace(/\./g,'').replace(',','.');
  else s = s.replace(/,/g,'');
  const n = Number(s);
  return isFinite(n) ? n : 0;
}
function isoDate_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return Utilities.formatDate(v,APP.TZ,'yyyy-MM-dd');
  const s = String(v == null ? '' : v).trim();
  if (!s) return '';
  let m = s.match(/^(20\d{2})-(\d{2})-(\d{2})/);
  if (m) return m[1]+'-'+m[2]+'-'+m[3];
  m = s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})/);
  if (m) return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  return s;
}
function fmtDateTime_(d) { return Utilities.formatDate(d,APP.TZ,'dd.MM.yyyy HH:mm'); }
function sum_(rows,key) { return Math.round(rows.reduce((a,r)=>a+Number(r[key]||0),0)*100)/100; }
