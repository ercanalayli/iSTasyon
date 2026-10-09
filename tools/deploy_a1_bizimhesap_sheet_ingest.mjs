const SCRIPT_ID = '1cLRKKoLaJnIZc0ypC17b72_6Y_6s1TGqv7d3WGhC6T4WoWjlKS9H5z0Y';
const DEPLOYMENT_ID = 'AKfycbyHhULNUaSFkteRSVNNPCARtqh9PTMSyRYOaMsOp2SvnDnQ5OrthACFxrzdD_SNovJUKw';
const LIVE_URL = 'https://script.google.com/macros/s/' + DEPLOYMENT_ID + '/exec';
const CONTROL_ID = '155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc';
const MARKER = 'A1_BIZIMHESAP_SHEET_INGEST_V1';

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error('missing_secret:' + name);
  return value;
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const error = new Error('HTTP ' + response.status + ' ' + url);
    error.body = body;
    throw error;
  }
  return body;
}

async function getPendingAuthorizationCode() {
  const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  if (!base || !key) return null;
  const now = new Date().toISOString();
  const url = base + '/rest/v1/automation_oauth_handoff' +
    '?provider=eq.google_apps_script&status=eq.pending&expires_at=gt.' + encodeURIComponent(now) +
    '&select=id,authorization_code&order=created_at.desc&limit=1';
  const rows = await jsonFetch(url, {
    headers: { apikey: key, authorization: 'Bearer ' + key }
  });
  return Array.isArray(rows) && rows[0]?.authorization_code ? rows[0] : null;
}

async function consumeAuthorizationCode(row) {
  const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  if (!base || !key || !row?.id) return;
  await jsonFetch(base + '/rest/v1/automation_oauth_handoff?id=eq.' + encodeURIComponent(String(row.id)), {
    method: 'PATCH',
    headers: {
      apikey: key,
      authorization: 'Bearer ' + key,
      'content-type': 'application/json',
      prefer: 'return=minimal'
    },
    body: JSON.stringify({ authorization_code: null, status: 'consumed', consumed_at: new Date().toISOString() })
  });
}

async function accessToken() {
  const refreshToken = String(process.env.GOOGLE_REFRESH_TOKEN || '');
  if (refreshToken) {
    try {
      const token = await jsonFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: requireEnv('GOOGLE_CLIENT_ID'),
          client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });
      if (token?.access_token) return token.access_token;
    } catch (error) {
      if (error?.body?.error !== 'invalid_grant') throw error;
    }
  }
  const handoff = await getPendingAuthorizationCode();
  if (!handoff) throw new Error('oauth_reauth_required_no_pending_code');
  const token = await jsonFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      code: handoff.authorization_code,
      redirect_uri: 'http://localhost',
      grant_type: 'authorization_code'
    })
  });
  if (!token?.access_token) throw new Error('no_access_token');
  await consumeAuthorizationCode(handoff);
  return token.access_token;
}

const authHeaders = token => ({ authorization: 'Bearer ' + token, 'content-type': 'application/json' });

async function getContent(token) {
  return jsonFetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + '/content', {
    headers: authHeaders(token)
  });
}
async function putContent(token, content) {
  return jsonFetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + '/content', {
    method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ files: content.files })
  });
}
async function createVersion(token, description) {
  return jsonFetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + '/versions', {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify({ description })
  });
}
async function updateDeployment(token, versionNumber, description) {
  return jsonFetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + '/deployments/' + DEPLOYMENT_ID, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({
      deploymentConfig: { scriptId: SCRIPT_ID, versionNumber, manifestFileName: 'appsscript', description }
    })
  });
}

function patchSource(source, secret) {
  if (source.includes(MARKER)) return source;
  const needle = 'function doPost(e)';
  if (!source.includes(needle)) throw new Error('legacy_doPost_not_found');
  let patched = source.replace(needle, 'function legacyDoPost(e)');
  const secretLiteral = JSON.stringify(secret);
  patched += `

// ${MARKER}
const APERION_A1_INGEST_SECRET = ${secretLiteral};
const APERION_A1_CONTROL_ID = '${CONTROL_ID}';
const APERION_A1_SALES_SHEET = 'BIZIMHESAP_CANLI_SATIS';

function aperionA1Json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function aperionA1EnsureSalesSheet_() {
  var ss = SpreadsheetApp.openById(APERION_A1_CONTROL_ID);
  var sh = ss.getSheetByName(APERION_A1_SALES_SHEET) || ss.insertSheet(APERION_A1_SALES_SHEET);
  var h = ['EVENT_KEY','ALINDI_ZAMANI','FATURA_TARIHI','FATURA_NO','CARI_UNVAN','URUN_KODU','BARKOD','URUN','ADET','CIRO','SATIS_KDV_HARIC','SATIS_KDV_DAHIL','FIFO_MALIYET','BRUT_KAR','KAR_MARJI','ISKONTO_PCT','NEGATIF_STOK','KATEGORI','KAYNAK_SATIR','SOURCE_URL','FIRMA_ID','FIRMA_ADI','DURUM','HAM_JSON'];
  if (sh.getLastRow() === 0 || String(sh.getRange(1,1).getValue()) !== 'EVENT_KEY') {
    sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function aperionA1BizimHesapSales_(payload) {
  if (String(payload.key || '') !== APERION_A1_INGEST_SECRET) {
    return aperionA1Json_({ok:false,error:'unauthorized'});
  }
  var records = Array.isArray(payload.records) ? payload.records.slice(0,500) : [];
  if (!records.length) return aperionA1Json_({ok:true,appended:0,duplicates:0,sheet:APERION_A1_SALES_SHEET});

  var sh = aperionA1EnsureSalesSheet_();
  var last = sh.getLastRow();
  var existing = {};
  if (last > 1) {
    var first = Math.max(2,last-9999);
    sh.getRange(first,1,last-first+1,1).getValues().forEach(function(r){ if (r[0]) existing[String(r[0])] = true; });
  }

  var rows = [];
  var duplicates = 0;
  records.forEach(function(sale) {
    var k = String(sale.event_key || '');
    if (!k || existing[k]) { duplicates++; return; }
    var ex = Number(sale.satis_kdv_haric);
    if (!isFinite(ex)) ex = Number(sale.ciro) || 0;
    var fifo = sale.fifo_cost == null || sale.fifo_cost === '' ? '' : Number(sale.fifo_cost);
    var gross = fifo === '' || !isFinite(fifo) ? '' : ex - fifo;
    var margin = gross === '' || !ex ? '' : gross / ex;
    rows.push([
      k,String(sale.received_at || new Date().toISOString()),String(sale.tarih || ''),String(sale.fatura_no || ''),
      String(sale.unvan || ''),String(sale.urun_kod || ''),String(sale.barkod || ''),String(sale.urun || ''),
      Number(sale.adet)||0,Number(sale.ciro)||0,ex,Number(sale.satis_kdv_dahil)||Number(sale.ciro)||0,
      fifo,gross,margin,sale.discount_pct==null?'':Number(sale.discount_pct),sale.negative_stock===true?'EVET':'HAYIR',
      String(sale.kategori || ''),Number(sale.kaynak_satir)||0,String(sale.source_url || ''),String(sale.firma_id || ''),
      String(sale.firma_adi || ''),'CANLI',JSON.stringify(sale)
    ]);
    existing[k] = true;
  });
  if (rows.length) {
    var start = sh.getLastRow()+1;
    sh.getRange(start,1,rows.length,24).setValues(rows);
    sh.getRange(start,10,rows.length,5).setNumberFormat('#,##0.00');
    sh.getRange(start,15,rows.length,1).setNumberFormat('0.00%');
  }
  return aperionA1Json_({ok:true,appended:rows.length,duplicates:duplicates,sheet:APERION_A1_SALES_SHEET});
}

function doPost(e) {
  try {
    var raw = e && e.postData ? e.postData.contents : '';
    var payload = raw ? JSON.parse(raw) : {};
    if (payload && payload.action === 'bizimhesap_sales') return aperionA1BizimHesapSales_(payload);
  } catch (error) {
    return aperionA1Json_({ok:false,error:String(error && error.message ? error.message : error)});
  }
  return legacyDoPost(e);
}
`;
  return patched;
}

async function verifyLive(secret) {
  await new Promise(resolve => setTimeout(resolve, 6000));
  const response = await fetch(LIVE_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'bizimhesap_sales', key: secret, records: [] })
  });
  const text = await response.text();
  if (!response.ok) throw new Error('live_http_' + response.status);
  let body = null;
  try { body = JSON.parse(text); } catch {}
  if (!body?.ok || body?.sheet !== 'BIZIMHESAP_CANLI_SATIS') {
    throw new Error('live_ingest_verify_failed:' + text.slice(0,300));
  }
}

async function main() {
  const secret = requireEnv('APERION_BRIDGE_SECRET');
  const token = await accessToken();
  const original = await getContent(token);
  const files = original.files || [];
  const target = files.find(f => f.type === 'SERVER_JS' && typeof f.source === 'string' && f.source.includes('function doPost(e)')) ||
    files.find(f => f.type === 'SERVER_JS' && typeof f.source === 'string' && f.source.includes(MARKER));
  if (!target) throw new Error('apps_script_server_file_not_found');

  const changed = JSON.parse(JSON.stringify(original));
  const changedTarget = changed.files.find(f => f.name === target.name && f.type === target.type);
  changedTarget.source = patchSource(changedTarget.source, secret);

  await putContent(token, changed);
  const version = await createVersion(token, 'A1 BizimHesap -> Sheets live ingest 2026-10-09');
  if (!version?.versionNumber) throw new Error('version_create_failed');
  await updateDeployment(token, version.versionNumber, 'A1 BizimHesap live sales mirror');
  await verifyLive(secret);
  console.log('A1_BIZIMHESAP_SHEET_INGEST_DEPLOY=PASS');
  console.log('LIVE_URL=' + LIVE_URL);
}

main().catch(error => {
  console.error('A1_BIZIMHESAP_SHEET_INGEST_DEPLOY=FAIL');
  console.error(error?.message || String(error));
  if (error?.body) console.error(JSON.stringify(error.body));
  process.exitCode = 1;
});
