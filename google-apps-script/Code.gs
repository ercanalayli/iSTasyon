/**
 * AperiON Google Bridge
 * Phase 1: no Gmail scope, no financial writes, no outbound messaging.
 */
const APERION_ENDPOINT = 'https://aperion-istasyon.pages.dev/api/google-bridge';
const APERION_MEMORY_EXPORT_ENDPOINT = 'https://aperion-istasyon.pages.dev/api/session-export';

function aperionHealthCheck() {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('APERION_GOOGLE_BRIDGE_KEY');
  if (!key) throw new Error('APERION_GOOGLE_BRIDGE_KEY tanimli degil.');

  const rootFolderId = props.getProperty('APERION_DRIVE_ROOT_ID');
  const controlSheetId = props.getProperty('APERION_CONTROL_SHEET_ID');
  const checks = [];

  checks.push(checkResource_('drive_root', function () {
    if (!rootFolderId) throw new Error('APERION_DRIVE_ROOT_ID eksik');
    return DriveApp.getFolderById(rootFolderId).getName();
  }));

  checks.push(checkResource_('control_sheet', function () {
    if (!controlSheetId) throw new Error('APERION_CONTROL_SHEET_ID eksik');
    return SpreadsheetApp.openById(controlSheetId).getName();
  }));

  const failed = checks.filter(function (x) { return !x.ok; });
  const payload = {
    ok: failed.length === 0,
    message: failed.length ? failed.map(function (x) { return x.name + ': ' + x.error; }).join(' | ') : 'Drive ve kontrol tablosu erisilebilir.',
    error_code: failed.length ? 'GOOGLE_RESOURCE_CHECK_FAILED' : null,
    evidence_ref: 'apps-script:aperionHealthCheck',
    checks: checks
  };

  const response = UrlFetchApp.fetch(APERION_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-aperion-key': key },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() >= 300) {
    throw new Error('AperiON bridge HTTP ' + response.getResponseCode() + ': ' + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}

function checkResource_(name, fn) {
  try { return { name: name, ok: true, value: fn() }; }
  catch (error) { return { name: name, ok: false, error: String(error.message || error) }; }
}

function installAperionMorningTrigger() {
  ScriptApp.getProjectTriggers().filter(function (trigger) {
    return ['aperionHealthCheck', 'aperionDailyMaintenance'].indexOf(trigger.getHandlerFunction()) >= 0;
  }).forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });

  ScriptApp.newTrigger('aperionDailyMaintenance')
    .timeBased()
    .atHour(8)
    .nearMinute(30)
    .everyDays(1)
    .inTimezone('Europe/Istanbul')
    .create();
}

function aperionDailyMaintenance() {
  const health = aperionHealthCheck();
  const backup = aperionMemoryBackup();
  return { health: health, backup: backup };
}

function aperionMemoryBackup() {
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty('APERION_BRIDGE_SECRET');
  const rootFolderId = props.getProperty('APERION_DRIVE_ROOT_ID');
  if (!secret) throw new Error('APERION_BRIDGE_SECRET tanimli degil.');
  if (!rootFolderId) throw new Error('APERION_DRIVE_ROOT_ID tanimli degil.');

  const response = UrlFetchApp.fetch(APERION_MEMORY_EXPORT_ENDPOINT, {
    method: 'get',
    headers: { authorization: 'Bearer ' + secret },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() >= 300) {
    throw new Error('AperiON memory export HTTP ' + response.getResponseCode() + ': ' + response.getContentText());
  }

  const root = DriveApp.getFolderById(rootFolderId);
  const folders = root.getFoldersByName('03_SISTEM_YEDEKLERI');
  const backupFolder = folders.hasNext() ? folders.next() : root.createFolder('03_SISTEM_YEDEKLERI');
  const today = Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd');
  const fileName = 'AperiON_Hafiza_Yedegi_' + today + '.json';
  const existing = backupFolder.getFilesByName(fileName);
  if (existing.hasNext()) {
    const file = existing.next();
    return { ok: true, duplicate: true, file_id: file.getId(), file_name: fileName };
  }
  const file = backupFolder.createFile(fileName, response.getContentText(), 'application/json');
  return { ok: true, duplicate: false, file_id: file.getId(), file_name: fileName };
}


// ============================================================
// A1 Fast Snapshot
// Read-only source collection + protected D1 snapshot + one-cell Sheets cache.
// No financial system write is performed.
// ============================================================
const APERION_A1_ENDPOINT = 'https://aperion-istasyon.pages.dev/api/apeiron-a1';
const APERION_PAYMENT_SHEET_ID = '1RdKOKgXRb5yt1bWnw-a4jYqpkkTk41941ZFlMFkEdxk';

function installAperionA1Trigger() {
  ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction() === 'aperionA1Refresh';
  }).forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });

  ScriptApp.newTrigger('aperionA1Refresh')
    .timeBased()
    .everyMinutes(5)
    .create();
}

function a1MonthTab_(date) {
  return String(date.getMonth() + 1) + String(date.getFullYear()).slice(-2) + 'A';
}

function a1NextMonth_(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function a1Money_(value) {
  if (typeof value === 'number') return value;
  var text = String(value == null ? '' : value).trim();
  if (!text) return 0;
  text = text.replace(/\s/g, '').replace(/₺|TL|TRY/gi, '');
  if (text.indexOf(',') >= 0) text = text.replace(/\./g, '').replace(',', '.');
  else text = text.replace(/,/g, '');
  var number = Number(text);
  return isFinite(number) ? number : 0;
}

function a1IsoDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'Europe/Istanbul', 'yyyy-MM-dd');
  }
  var text = String(value == null ? '' : value).trim();
  if (!text) return '';
  var m = text.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  var trMonths = {ocak:'01',subat:'02','şubat':'02',mart:'03',nisan:'04',mayis:'05','mayıs':'05',haziran:'06',temmuz:'07',agustos:'08','ağustos':'08',eylul:'09','eylül':'09',ekim:'10',kasim:'11','kasım':'11',aralik:'12','aralık':'12'};
  var named = text.toLocaleLowerCase('tr-TR').match(/^(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{2}|20\d{2})$/i);
  if (named && trMonths[named[2]]) {
    var year = named[3].length === 2 ? '20' + named[3] : named[3];
    return year + '-' + trMonths[named[2]] + '-' + ('0' + named[1]).slice(-2);
  }
  var iso = text.match(/^(20\d{2})-(\d{2})-(\d{2})/);
  return iso ? iso[1] + '-' + iso[2] + '-' + iso[3] : text;
}

function a1Table_(values, requiredHeader) {
  var headerIndex = -1;
  for (var i = 0; i < values.length; i++) {
    if (values[i].map(String).indexOf(requiredHeader) >= 0) { headerIndex = i; break; }
  }
  if (headerIndex < 0) return { headers: [], rows: [] };
  var headers = values[headerIndex].map(function (v) { return String(v || '').trim(); });
  var rows = [];
  for (var r = headerIndex + 1; r < values.length; r++) {
    if (!values[r].some(function (v) { return String(v || '').trim() !== ''; })) continue;
    var item = {};
    headers.forEach(function (h, idx) { if (h) item[h] = values[r][idx]; });
    rows.push(item);
  }
  return { headers: headers, rows: rows };
}

function a1PaymentRows_(sheet, rangeA1) {
  var table = a1Table_(sheet.getRange(rangeA1).getValues(), 'TARİH');
  return table.rows.map(function (row) {
    return {
      date: a1IsoDate_(row['TARİH']),
      due: a1IsoDate_(row['TARİH']),
      due_status: String(row['VADE'] || ''),
      radar: String(row['RADAR'] || ''),
      status: String(row['DURUM'] || ''),
      accrual: a1Money_(row['TUTAR']),
      paid: a1Money_(row['ÖDENEN'] != null ? row['ÖDENEN'] : row['ODENEN']),
      remaining: a1Money_(row['KALAN']),
      section: String(row['BÖLÜM'] || row['BOLUM'] || ''),
      bank: String(row['BANKA'] || ''),
      account: String(row['CARİ'] || row['CARI'] || ''),
      method: String(row['YÖNTEM'] || row['YONTEM'] || ''),
      installment: String(row['TAK'] || ''),
      type: String(row['TÜR'] || row['TUR'] || ''),
      note: String(row['AÇIKLAMA / NOT'] || row['ACIKLAMA / NOT'] || '')
    };
  }).filter(function (row) {
    return row.date || row.due || row.accrual || row.paid || row.remaining || row.bank || row.account || row.note;
  });
}

function a1TaskRows_(sheet) {
  var values = sheet.getRange('A1:T200').getValues();
  if (!values.length) return [];
  var headers = values[0].map(String);
  return values.slice(1).filter(function (row) { return String(row[0] || '').trim() !== ''; }).map(function (row) {
    var x = {};
    headers.forEach(function (h, i) { if (h) x[h] = row[i]; });
    return {
      id: String(x.KAYIT_ID || ''),
      category: String(x.CATEGORY || ''),
      title: String(x.BASLIK || ''),
      due: a1IsoDate_(x.VADE),
      amount: a1Money_(x.TUTAR),
      paid: a1Money_(x.ODENEN),
      stage: Number(x.STAGE || 0),
      note: String(x.NOT || ''),
      owner: String(x.SAHIP || ''),
      source: String(x.KAYNAK || ''),
      promise_date: a1IsoDate_(x.ODEME_SOZU_TARIHI),
      promise_amount: a1Money_(x.ODEME_SOZU_TUTARI),
      promisor: String(x.SOZ_VEREN || ''),
      completed_at: String(x.TAMAMLANMA || ''),
      updated_at: String(x.SON_GUNCELLEME || '')
    };
  });
}

function a1SimpleRows_(sheet, rangeA1, maxRows) {
  var values = sheet.getRange(rangeA1).getValues();
  if (!values.length) return [];
  var headers = values[0].map(String);
  return values.slice(1).filter(function (row) { return String(row[0] || '').trim() !== ''; }).slice(0, maxRows).map(function (row) {
    var x = {};
    headers.forEach(function (h, i) { if (h) x[h] = row[i] instanceof Date ? row[i].toISOString() : row[i]; });
    return x;
  });
}

function a1BuildSnapshot_() {
  var props = PropertiesService.getScriptProperties();
  var controlSheetId = props.getProperty('APERION_CONTROL_SHEET_ID') || '155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc';
  var payment = SpreadsheetApp.openById(APERION_PAYMENT_SHEET_ID);
  var control = SpreadsheetApp.openById(controlSheetId);
  var now = new Date();
  var currentTab = a1MonthTab_(now);
  var nextTab = a1MonthTab_(a1NextMonth_(now));
  var currentSheet = payment.getSheetByName(currentTab);
  var nextSheet = payment.getSheetByName(nextTab);
  if (!currentSheet) throw new Error('A1 payment tab missing: ' + currentTab);

  var current = a1PaymentRows_(currentSheet, 'A36:N90');
  var next = nextSheet ? a1PaymentRows_(nextSheet, 'A36:N60') : [];
  var tasks = a1TaskRows_(control.getSheetByName('IS_TAKIP_GIRIS'));
  var approvals = a1SimpleRows_(control.getSheetByName('ONAY KUYRUGU'), 'A1:Z100', 50);
  var events = a1SimpleRows_(control.getSheetByName('EVENT_LEDGER'), 'A1:L100', 30);
  var documents = a1SimpleRows_(control.getSheetByName('BELGE_INDEKSI'), 'A1:L100', 30);
  var today = Utilities.formatDate(now, 'Europe/Istanbul', 'yyyy-MM-dd');
  var end7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  var end7Iso = Utilities.formatDate(end7, 'Europe/Istanbul', 'yyyy-MM-dd');

  var allPayments = current.concat(next);
  var openCurrent = current.filter(function (r) { return r.remaining > 0; });
  var openAll = allPayments.filter(function (r) { return r.remaining > 0; });
  var overdue = openCurrent.filter(function (r) { return r.due && r.due < today; });
  var dueToday = openCurrent.filter(function (r) { return r.due === today; });
  var next7 = openAll.filter(function (r) { return r.due && r.due > today && r.due <= end7Iso; });
  var sum = function (rows, key) { return Math.round(rows.reduce(function (a, r) { return a + Number(r[key] || 0); }, 0) * 100) / 100; };

  var snapshot = {
    protocol: 'aperion-a1-v1',
    snapshot_key: 'a1:' + Utilities.formatDate(now, 'GMT', "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    generated_at: now.toISOString(),
    freshness: {
      payment_source_modified_at: DriveApp.getFileById(APERION_PAYMENT_SHEET_ID).getLastUpdated().toISOString(),
      control_source_modified_at: DriveApp.getFileById(controlSheetId).getLastUpdated().toISOString(),
      current_tab: currentTab,
      next_tab: nextTab
    },
    kpi: {
      overdue_remaining: sum(overdue, 'remaining'),
      today_remaining: sum(dueToday, 'remaining'),
      next7_remaining: sum(next7, 'remaining'),
      open_remaining: sum(openCurrent, 'remaining'),
      open_tasks: tasks.filter(function (t) { return t.category === 'todo' && t.stage < 2; }).length,
      collections: tasks.filter(function (t) { return t.category === 'collect' && t.stage < 2; }).length,
      orders_to_place: tasks.filter(function (t) { return t.category === 'order' && t.stage < 2; }).length,
      received_orders: tasks.filter(function (t) { return t.category === 'received' && t.stage < 3; }).length,
      approvals: approvals.length
    },
    payments: {
      overdue: overdue,
      today: dueToday,
      next7: next7,
      open_total: sum(openCurrent, 'remaining'),
      overdue_accrual: sum(overdue, 'accrual'),
      overdue_paid: sum(overdue, 'paid')
    },
    work: {
      todo: tasks.filter(function (t) { return t.category === 'todo' && t.stage < 2; }),
      collections: tasks.filter(function (t) { return t.category === 'collect' && t.stage < 2; }),
      orders_to_place: tasks.filter(function (t) { return t.category === 'order' && t.stage < 2; }),
      received_orders: tasks.filter(function (t) { return t.category === 'received' && t.stage < 3; }),
      completed_today: tasks.filter(function (t) { return t.completed_at && String(t.completed_at).slice(0, 10) === today; })
    },
    approvals: approvals,
    latest_events: events.slice(-20).reverse(),
    pending_documents: documents.filter(function (d) {
      return String(d.DURUM || '').indexOf('BEKLIYOR') >= 0 || String(d.DURUM || '').indexOf('BEKLİYOR') >= 0;
    }).slice(-20).reverse(),
    source_refs: {
      payment_sheet_id: APERION_PAYMENT_SHEET_ID,
      control_sheet_id: controlSheetId
    }
  };
  return { snapshot: snapshot, control: control };
}

function aperionA1Refresh() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('APERION_BRIDGE_SECRET');
  if (!secret) throw new Error('APERION_BRIDGE_SECRET tanimli degil.');

  var built = a1BuildSnapshot_();
  var snapshot = built.snapshot;
  var jsonText = JSON.stringify(snapshot);
  if (jsonText.length > 48000) throw new Error('A1 snapshot cell limitine yaklasti: ' + jsonText.length);

  var cache = built.control.getSheetByName('A1_SNAPSHOT') || built.control.insertSheet('A1_SNAPSHOT');
  cache.clearContents();
  cache.getRange('A1:B4').setValues([
    ['PROTOCOL', snapshot.protocol],
    ['GENERATED_AT', snapshot.generated_at],
    ['PAYMENT_SOURCE_MODIFIED_AT', snapshot.freshness.payment_source_modified_at],
    ['SNAPSHOT_JSON', jsonText]
  ]);
  cache.setFrozenRows(1);

  var response = UrlFetchApp.fetch(APERION_A1_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: { authorization: 'Bearer ' + secret },
    payload: JSON.stringify({ snapshot: snapshot }),
    muteHttpExceptions: true
  });
  if (response.getResponseCode() >= 300) {
    throw new Error('A1 endpoint HTTP ' + response.getResponseCode() + ': ' + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}


// ============================================================
// BizimHesap -> Google Sheets live sales mirror
// Receives only signed sales events from AperiON Cloudflare.
// Writes operational mirror rows; it does not write back to BizimHesap.
// ============================================================
const APERION_BIZIMHESAP_SALES_SHEET = 'BIZIMHESAP_CANLI_SATIS';

function aperionJson_(data, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(Object.assign({ status: statusCode || 200 }, data)))
    .setMimeType(ContentService.MimeType.JSON);
}

function aperionSalesHeaders_() {
  return [
    'EVENT_KEY','ALINDI_ZAMANI','FATURA_TARIHI','FATURA_NO','CARI_UNVAN','URUN_KODU',
    'BARKOD','URUN','ADET','CIRO','SATIS_KDV_HARIC','SATIS_KDV_DAHIL',
    'FIFO_MALIYET','BRUT_KAR','KAR_MARJI','ISKONTO_PCT','NEGATIF_STOK','KATEGORI',
    'KAYNAK_SATIR','SOURCE_URL','FIRMA_ID','FIRMA_ADI','DURUM','HAM_JSON'
  ];
}

function ensureAperionSalesSheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('APERION_CONTROL_SHEET_ID') || '155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc';
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName(APERION_BIZIMHESAP_SALES_SHEET) || ss.insertSheet(APERION_BIZIMHESAP_SALES_SHEET);
  var headers = aperionSalesHeaders_();
  if (sheet.getLastRow() === 0 || String(sheet.getRange(1, 1).getValue()) !== 'EVENT_KEY') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (payload.action !== 'bizimhesap_sales') {
      return aperionJson_({ ok: false, error: 'unsupported_action' }, 400);
    }

    var props = PropertiesService.getScriptProperties();
    var expected = String(props.getProperty('APERION_SHEET_INGEST_KEY') || '');
    var supplied = String(payload.key || '');
    if (!expected || expected.length < 24 || supplied !== expected) {
      return aperionJson_({ ok: false, error: 'unauthorized' }, 401);
    }

    var records = Array.isArray(payload.records) ? payload.records.slice(0, 500) : [];
    if (!records.length) return aperionJson_({ ok: true, appended: 0, duplicates: 0, sheet: APERION_BIZIMHESAP_SALES_SHEET }, 200);

    var sheet = ensureAperionSalesSheet_();
    var lastRow = sheet.getLastRow();
    var existing = {};
    if (lastRow > 1) {
      var firstRow = Math.max(2, lastRow - 9999);
      var keys = sheet.getRange(firstRow, 1, lastRow - firstRow + 1, 1).getValues();
      keys.forEach(function (r) { if (r[0]) existing[String(r[0])] = true; });
    }

    var rows = [];
    var duplicates = 0;
    records.forEach(function (sale) {
      var eventKey = String(sale.event_key || '');
      if (!eventKey || existing[eventKey]) { duplicates++; return; }

      var exVat = Number(sale.satis_kdv_haric);
      if (!isFinite(exVat)) exVat = Number(sale.ciro) || 0;
      var fifo = sale.fifo_cost == null || sale.fifo_cost === '' ? '' : Number(sale.fifo_cost);
      var gross = fifo === '' || !isFinite(fifo) ? '' : exVat - fifo;
      var margin = gross === '' || !exVat ? '' : gross / exVat;

      rows.push([
        eventKey,
        String(sale.received_at || new Date().toISOString()),
        String(sale.tarih || ''),
        String(sale.fatura_no || ''),
        String(sale.unvan || ''),
        String(sale.urun_kod || ''),
        String(sale.barkod || ''),
        String(sale.urun || ''),
        Number(sale.adet) || 0,
        Number(sale.ciro) || 0,
        exVat,
        Number(sale.satis_kdv_dahil) || Number(sale.ciro) || 0,
        fifo,
        gross,
        margin,
        sale.discount_pct == null ? '' : Number(sale.discount_pct),
        sale.negative_stock === true ? 'EVET' : 'HAYIR',
        String(sale.kategori || ''),
        Number(sale.kaynak_satir) || 0,
        String(sale.source_url || ''),
        String(sale.firma_id || ''),
        String(sale.firma_adi || ''),
        'CANLI',
        JSON.stringify(sale)
      ]);
      existing[eventKey] = true;
    });

    if (rows.length) {
      var start = sheet.getLastRow() + 1;
      sheet.getRange(start, 1, rows.length, 24).setValues(rows);
      sheet.getRange(start, 10, rows.length, 5).setNumberFormat('#,##0.00');
      sheet.getRange(start, 15, rows.length, 1).setNumberFormat('0.00%');
    }

    return aperionJson_({
      ok: true,
      appended: rows.length,
      duplicates: duplicates,
      sheet: APERION_BIZIMHESAP_SALES_SHEET
    }, 200);
  } catch (error) {
    return aperionJson_({ ok: false, error: String(error && error.message ? error.message : error) }, 500);
  }
}
