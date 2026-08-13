/**
 * AperiON Google Bridge
 * Phase 1: no Gmail scope, no financial writes, no outbound messaging.
 */
const APERION_ENDPOINT = 'https://aperion-istasyon.pages.dev/api/google-bridge';

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
    return trigger.getHandlerFunction() === 'aperionHealthCheck';
  }).forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });

  ScriptApp.newTrigger('aperionHealthCheck')
    .timeBased()
    .atHour(8)
    .nearMinute(30)
    .everyDays(1)
    .inTimezone('Europe/Istanbul')
    .create();
}
