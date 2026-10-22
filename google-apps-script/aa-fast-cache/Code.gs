/**
 * AperiON / AA read-only prewarming cache (standalone Google Apps Script).
 *
 * IMPORTANT
 * 1) Separate Apps Script deployment; never paste into a running legacy script.
 * 2) This writes ONLY a derived AA_FAST_CACHE in the canonical control sheet.
 * 3) It never clears a worksheet, never posts to BizimHesap/bank/cash, and
 *    never touches A1_SNAPSHOT or the generic finance A1 refresher.
 * 4) Trigger installation requires an explicit authorized owner run.
 * 5) Cache freshness is not source freshness. Source dates are retained.
 * 6) No doGet/doPost endpoints: do NOT expose this as an anonymous web app.
 */
var AA_FAST_SETTINGS = Object.freeze({
  controlId: '155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc',
  tab: 'AA_FAST_CACHE',
  master: 'A2_SIPARIS_DURUM_MASTER',
  finance: 'A2_BH_FINANS_4_KAYNAK',
  handler: 'aaRefreshFastCache',
  cacheVersion: 'AA_FAST_CACHE_V1',
  targetMinutes: 5,
  maxCacheAgeMinutes: 10,
  timeZone: 'Europe/Istanbul'
});

function aaFastMetricRows_(rows) {
  var d = {};
  rows.forEach(function(r) {
    var key = String(r[0] || '').trim();
    if (key) d[key] = String(r[1] == null ? '' : r[1]).trim();
  });
  ['SIPARIS_ADEDI','FATURA_KANITI_VAR','BELGE_SONUCU_BELIRSIZ','TESLIM_KANITI_VAR'].forEach(function(k) {
    if (!/^\\d+$/.test(d[k] || '')) throw new Error('AA source invalid: ' + k);
  });
  var all = Number(d.SIPARIS_ADEDI);
  var billed = Number(d.FATURA_KANITI_VAR);
  var ambiguous = Number(d.BELGE_SONUCU_BELIRSIZ);
  if (all !== billed + ambiguous) throw new Error('AA source mismatch: billed + ambiguous != orders');
  return {
    orders: all,
    invoice_evidence: billed,
    ambiguous_document: ambiguous,
    delivery_evidence: Number(d.TESLIM_KANITI_VAR)
  };
}

function aaFastSnapshot_(ss, now) {
  var master = ss.getSheetByName(AA_FAST_SETTINGS.master);
  var finance = ss.getSheetByName(AA_FAST_SETTINGS.finance);
  if (!master || !finance) throw new Error('AA canonical source missing');
  var metrics = aaFastMetricRows_(master.getRange('A12:B18').getDisplayValues());
  var observed = master.getRange('N2:N9').getDisplayValues()
    .map(function(r) { return String(r[0] || '').trim(); })
    .filter(function(s) { return /^20\\d{2}-\\d{2}-\\d{2}/.test(s); })
    .sort();
  var rows = finance.getRange('A2:E5').getDisplayValues();
  var expected = ['SATIŞLAR', 'FATURALAR', 'TAHSİLATLAR', 'BANKA-KASA HAREKETLERİ'];
  var streams = rows.map(function(r, i) {
    var name = String(r[1] || '').trim();
    if (name !== expected[i]) throw new Error('AA finance source order changed: ' + name);
    var stated = String(r[4] || '').trim();
    if (!stated) throw new Error('AA source status missing: ' + name);
    return { name: name, recorded_status: stated, last_erp_event: null };
  });
  var nowIso = now.toISOString();
  return {
    schema: AA_FAST_SETTINGS.cacheVersion,
    cache_refreshed_at: nowIso,
    cache_age_does_not_mean_erp_fresh: true,
    source_observed_on: observed.length ? observed[observed.length - 1] : null,
    source: AA_FAST_SETTINGS.master,
    source_truth: 'HISTORICAL_PROOF_ONLY',
    bizimh_esap_live_4_of_4_confirmed: false,
    metrics: metrics,
    finance_streams: streams,
    financial_write_enabled: false,
    warnings: [
      'AA fast cache is derived from Sheets; it is NOT a live BizimHesap API verification',
      'ERP freshness requires a separate authorized real source GET + count/HTTP/idempotency audit',
      'Payments/collections require independent bank and ledger readback'
    ]
  };
}

function aaFastCacheSheet_(ss) {
  var sh = ss.getSheetByName(AA_FAST_SETTINGS.tab);
  if (!sh) {
    sh = ss.insertSheet(AA_FAST_SETTINGS.tab);
    sh.getRange('A1:B3').setValues([
      ['KEY', 'VALUE'],
      ['CACHE_JSON', ''],
      ['HEALTH_JSON', '']
    ]);
    sh.setFrozenRows(1);
  } else if (sh.getRange('A2').getDisplayValue() !== 'CACHE_JSON' ||
             sh.getRange('A3').getDisplayValue() !== 'HEALTH_JSON') {
    throw new Error('AA_FAST_CACHE layout mismatch; refusing overwrite');
  }
  return sh;
}

/** Precompute cached derived proof. Never touches the authoritative sources. */
function aaRefreshFastCache() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error('AA_FAST_REFRESH_BUSY');
  var now = new Date();
  try {
    var ss = SpreadsheetApp.openById(AA_FAST_SETTINGS.controlId);
    var sh = aaFastCacheSheet_(ss);
    try {
      var result = aaFastSnapshot_(ss, now);
      var payload = JSON.stringify(result);
      if (payload.length > 45000) throw new Error('AA cache payload too large');
      sh.getRange('B2').setValue(payload);
      sh.getRange('B3').setValue(JSON.stringify({
        status: 'CACHE_REFRESH_OK_SOURCE_FRESHNESS_SEPARATE',
        last_attempt_at: now.toISOString(),
        last_cache_success_at: now.toISOString(),
        source_as_of: result.source_observed_on,
        version: AA_FAST_SETTINGS.cacheVersion
      }));
      SpreadsheetApp.flush();
      return { status: 'OK', cache_refreshed_at: now.toISOString(),
               source_observed_on: result.source_observed_on };
    } catch (err) {
      // Do not silently convert an old source to a fresh/live financial claim.
      sh.getRange('B3').setValue(JSON.stringify({
        status: 'BLOCKED_SOURCE_NOT_VERIFIED',
        last_attempt_at: now.toISOString(),
        error: String(err && err.message || err).slice(0,240),
        version: AA_FAST_SETTINGS.cacheVersion
      }));
      throw err;
    }
  } finally {
    lock.releaseLock();
  }
}

/** Internal authorized reader. No public GET endpoint or artificial live claim. */
function aaReadFastCache() {
  var sh = SpreadsheetApp.openById(AA_FAST_SETTINGS.controlId)
    .getSheetByName(AA_FAST_SETTINGS.tab);
  if (!sh) return { status: 'NOT_CONFIGURED' };
  var cache, health;
  try {
    cache = JSON.parse(sh.getRange('B2').getDisplayValue() || '{}');
    health = JSON.parse(sh.getRange('B3').getDisplayValue() || '{}');
  } catch (_) { return { status: 'CORRUPT_CACHE' }; }
  var stamp = Date.parse(cache.cache_refreshed_at || '');
  var age = Number.isFinite(stamp) ? Math.max(0, (Date.now()-stamp)/60000) : null;
  var healthy = age !== null && age <= AA_FAST_SETTINGS.maxCacheAgeMinutes &&
    health.status === 'CACHE_REFRESH_OK_SOURCE_FRESHNESS_SEPARATE';
  return {
    status: healthy ? 'CACHE_READY_SOURCE_NOT_LIVE' : 'STALE_OR_UNVERIFIED',
    cache_age_minutes: age === null ? null : Math.round(age * 10)/10,
    source_observed_on: cache.source_observed_on || null,
    financial_write_enabled: false,
    snapshot: cache
  };
}

/**
 * One-time manual action AFTER owner verifies this isolated script.
 * Installs only this script's five-minute trigger; does not remove other jobs.
 */
function aaInstallFastCacheTrigger() {
  var existing = ScriptApp.getProjectTriggers().filter(function(t) {
    return t.getHandlerFunction() === AA_FAST_SETTINGS.handler;
  });
  if (existing.length > 1) throw new Error('Duplicate AA triggers detected: investigate');
  if (!existing.length) {
    ScriptApp.newTrigger(AA_FAST_SETTINGS.handler)
      .timeBased().everyMinutes(AA_FAST_SETTINGS.targetMinutes).create();
  }
  return aaRefreshFastCache();
}

/** Pure isolated sanity test; neither opens a Sheet nor installs a trigger. */
function aaFastCacheSelfTest() {
  var valid = aaFastMetricRows_([
    ['SIPARIS_ADEDI','8'], ['FATURA_KANITI_VAR','7'],
    ['BELGE_SONUCU_BELIRSIZ','1'], ['TESLIM_KANITI_VAR','0']
  ]);
  if (valid.orders !== 8 || valid.invoice_evidence !== 7) throw new Error('Self test failed');
  var failed = false;
  try {
    aaFastMetricRows_([
      ['SIPARIS_ADEDI','8'],['FATURA_KANITI_VAR','7'],
      ['BELGE_SONUCU_BELIRSIZ','2'],['TESLIM_KANITI_VAR','0']
    ]);
  } catch (_) { failed = true; }
  if (!failed) throw new Error('Fail-closed guard failed');
  return 'AA_FAST_SELF_TEST_PASS';
}
