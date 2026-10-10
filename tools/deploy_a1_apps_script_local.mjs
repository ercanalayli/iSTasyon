import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(process.env.APERION_PROJECT_DIR || 'C:\\AperiON\\iSTasyon');
const CLIENT_VAULT = path.join(ROOT,'.aperion-secrets','google-oauth-rotation-client.dpapi');
const VAULT_SCRIPT = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge\\tools\\google-oauth-dpapi.ps1';

const SCRIPT_ID = '1cLRKKoLaJnIZc0ypC17b72_6Y_6s1TGqv7d3WGhC6T4WoWjlKS9H5z0Y';
const LEGACY_DEPLOYMENT_ID = 'AKfycbyHhULNUaSFkteRSVNNPCARtqh9PTMSyRYOaMsOp2SvnDnQ5OrthACFxrzdD_SNovJUKw';
const CURRENT_A1_DEPLOYMENT_ID = 'AKfycbzm567JGBoRpHX-Sjxr0NKfpzckCEcNcSIiyqUHoND7M734kSk4_TdYFq9RBEzlottUPA';
const CONTROL_ID = '155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc';
const MARKER = 'A1_BIZIMHESAP_SHEET_INGEST_V1';

async function mustExist(file,label) {
  try { await fs.access(file); } catch { throw new Error('missing_' + label + ':' + file); }
}

async function unprotectClient() {
  await mustExist(CLIENT_VAULT,'google_client_vault');
  await mustExist(VAULT_SCRIPT,'dpapi_helper');
  const { stdout } = await execFileAsync('powershell.exe',[
    '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass',
    '-File',VAULT_SCRIPT,'-Mode','unprotect','-Vault',CLIENT_VAULT
  ],{windowsHide:true,timeout:15000,maxBuffer:32768});
  const decoded = Buffer.from(String(stdout).trim(),'base64').toString('utf8');
  const client = JSON.parse(decoded);
  if (!client?.clientId || !client?.clientSecret) throw new Error('google_client_vault_invalid');
  return client;
}

async function jsonFetch(url,options={},stage='api') {
  const response = await fetch(url,options);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const safeDetail = body && typeof body === 'object' ? (body.error?.message || body.error?.status || body.error || '') : String(body || '');
    const error = new Error(stage + '_HTTP_' + response.status + (safeDetail ? ':' + String(safeDetail).slice(0,180) : ''));
    error.body = body;
    throw error;
  }
  return body;
}

const authHeaders = token => ({authorization:'Bearer ' + token,'content-type':'application/json'});

async function getContent(token) {
  return jsonFetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + '/content',{headers:authHeaders(token)},'get_content');
}
async function putContent(token,content) {
  return jsonFetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + '/content',{
    method:'PUT',headers:authHeaders(token),body:JSON.stringify({files:content.files})
  },'put_content');
}
async function createVersion(token,description) {
  return jsonFetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + '/versions',{
    method:'POST',headers:authHeaders(token),body:JSON.stringify({description})
  },'create_version');
}
async function listDeployments(token) {
  return jsonFetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + '/deployments?pageSize=50',{
    headers:authHeaders(token)
  },'list_deployments');
}
async function createDeployment(token,versionNumber,description) {
  return jsonFetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + '/deployments',{
    method:'POST',headers:authHeaders(token),
    body:JSON.stringify({versionNumber,manifestFileName:'appsscript',description})
  },'create_deployment');
}
async function updateDeployment(token,deploymentId,versionNumber,description) {
  return jsonFetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + '/deployments/' + deploymentId,{
    method:'PUT',headers:authHeaders(token),
    body:JSON.stringify({deploymentConfig:{scriptId:SCRIPT_ID,versionNumber,manifestFileName:'appsscript',description}})
  },'update_deployment');
}
function webAppUrl(deploymentId) {
  return 'https://script.google.com/macros/s/' + deploymentId + '/exec';
}

function patchSource(source) {
  const secretLine = "function aperionA1Verify_(payload){ try { var records=Array.isArray(payload.records)?payload.records:[]; if(!records.length)return true; var r=UrlFetchApp.fetch('https://aperion-istasyon.pages.dev/api/a1-sale-record-verify',{method:'post',contentType:'application/json',muteHttpExceptions:true,payload:JSON.stringify({records:records})}); if(r.getResponseCode()!==200)return false; var b=JSON.parse(r.getContentText()||'{}'); return b&&b.ok===true&&Number(b.verified||0)===records.length; } catch(e){ return false; } }";
  if (source.includes(MARKER)) {
    let upgraded = source;
    if (/const APERION_A1_INGEST_SECRET\s*=\s*[^;]+;/.test(upgraded)) {
      upgraded = upgraded.replace(/const APERION_A1_INGEST_SECRET\s*=\s*[^;]+;/,secretLine);
    } else if (!upgraded.includes('function aperionA1Verify_(')) {
      upgraded = upgraded.replace('// ' + MARKER, '// ' + MARKER + '\n' + secretLine);
    }
    upgraded = upgraded.replace(
      /if \(!aperionA1Secret_\(\) \|\| String\(payload\.key \|\| ''\) !== aperionA1Secret_\(\)\) return aperionA1Json_\(\{ok:false,error:'unauthorized'\}\);/,
      "if (!aperionA1Verify_(payload)) return aperionA1Json_({ok:false,error:'unverified_sale'});"
    );
    return upgraded;
  }
  const needle = 'function doPost(e)';
  if (!source.includes(needle)) throw new Error('legacy_doPost_not_found');
  let patched = source.replace(needle,'function legacyDoPost(e)');
  patched += `

// ${MARKER}
${secretLine}
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
  if (!aperionA1Verify_(payload)) return aperionA1Json_({ok:false,error:'unverified_sale'});
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

async function verifyLive(liveUrl) {
  let lastStatus = 0;
  let lastText = '';
  for (let attempt = 1; attempt <= 12; attempt++) {
    await new Promise(resolve=>setTimeout(resolve, attempt === 1 ? 8000 : 5000));
    const response = await fetch(liveUrl,{
      method:'POST',redirect:'follow',headers:{'content-type':'application/json'},
      body:JSON.stringify({action:'bizimhesap_sales',records:[]}),
      signal:AbortSignal.timeout(30000)
    });
    const text = await response.text();
    lastStatus = response.status;
    lastText = text;
    if (response.ok) return true;
    if (response.status !== 404) break;
  }
  throw new Error('live_http_' + lastStatus + (lastText ? ':' + String(lastText).replace(/\s+/g,' ').slice(0,120) : ''));
}

async function deploy(accessToken) {
  const original = await getContent(accessToken);
  const files = original.files || [];
  const target = files.find(f=>f.type==='SERVER_JS' && typeof f.source==='string' && f.source.includes(MARKER)) ||
    files.find(f=>f.type==='SERVER_JS' && typeof f.source==='string' && f.source.includes('function doPost(e)'));
  if (!target) throw new Error('apps_script_server_file_not_found');

  const changed = JSON.parse(JSON.stringify(original));
  const changedTarget = changed.files.find(f=>f.name===target.name && f.type===target.type);
  changedTarget.source = patchSource(changedTarget.source);

  await putContent(accessToken,changed);
  const version = await createVersion(accessToken,'A1 BizimHesap -> Sheets live ingest local deploy 2026-10-09');
  if (!version?.versionNumber) throw new Error('version_create_failed');

  const listed = await listDeployments(accessToken);
  const deployments = Array.isArray(listed?.deployments) ? listed.deployments : [];
  let selected = deployments.find(d => d.deploymentId === CURRENT_A1_DEPLOYMENT_ID) ||
    deployments.find(d => String(d.deploymentConfig?.description || '').includes('A1 BizimHesap live sales mirror')) ||
    deployments.find(d => Array.isArray(d.entryPoints) && d.entryPoints.some(ep => ep.entryPointType === 'WEB_APP') && d.deploymentId !== LEGACY_DEPLOYMENT_ID) ||
    deployments.find(d => d.deploymentId === LEGACY_DEPLOYMENT_ID) ||
    deployments[0] || null;

  if (selected?.deploymentId) {
    try {
      await updateDeployment(accessToken,selected.deploymentId,version.versionNumber,'A1 BizimHesap live sales mirror');
    } catch (error) {
      if (!String(error?.message || '').includes('Read-only deployments may not be modified')) throw error;
      selected = await createDeployment(accessToken,version.versionNumber,'A1 BizimHesap live sales mirror');
    }
  } else {
    selected = await createDeployment(accessToken,version.versionNumber,'A1 BizimHesap live sales mirror');
  }
  const deploymentId = selected?.deploymentId;
  if (!deploymentId) throw new Error('deployment_id_missing');
  const webEntry = Array.isArray(selected?.entryPoints) ? selected.entryPoints.find(ep => ep?.entryPointType === 'WEB_APP' && ep?.webApp?.url) : null;
  const liveUrl = webEntry?.webApp?.url || webAppUrl(deploymentId);
  await verifyLive(liveUrl);
  console.log(JSON.stringify({ok:true,a1_apps_script_deploy:'PASS',deployment_id:deploymentId,live_url:liveUrl,secrets_printed:false}));
}

async function main() {
  const client = await unprotectClient();
  const state = randomBytes(24).toString('hex');
  const scopes = [
    'https://www.googleapis.com/auth/script.projects',
    'https://www.googleapis.com/auth/script.deployments'
  ];
  let redirectUri = '';
  let completed = false;

  const server = http.createServer(async (request,response)=>{
    try {
      const callback = new URL(request.url,redirectUri);
      if (callback.pathname !== '/oauth2/callback') { response.writeHead(204); response.end(); return; }
      if (callback.searchParams.get('state') !== state) throw new Error('oauth_state_invalid');
      const code = callback.searchParams.get('code');
      if (!code) throw new Error('oauth_consent_not_granted');

      const exchange = await fetch('https://oauth2.googleapis.com/token',{
        method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({
          code,client_id:client.clientId,client_secret:client.clientSecret,redirect_uri:redirectUri,grant_type:'authorization_code'
        }),
        signal:AbortSignal.timeout(20000)
      });
      const tokens = await exchange.json().catch(()=>({}));
      if (!exchange.ok || !tokens.access_token) throw new Error('oauth_exchange_http_' + exchange.status);

      await deploy(tokens.access_token);
      completed = true;
      response.writeHead(200,{'content-type':'text/plain; charset=utf-8'});
      response.end('A1 Apps Script kurulumu tamamlandi. Bu pencereyi kapatabilirsiniz.');
    } catch (error) {
      console.error(JSON.stringify({ok:false,error:String(error?.message||error).slice(0,220),secrets_printed:false}));
      response.writeHead(400,{'content-type':'text/plain; charset=utf-8'});
      response.end('A1 kurulumu tamamlanamadi. PowerShell ciktisina bakin.');
    } finally {
      server.close();
    }
  });

  server.listen(0,'127.0.0.1',()=>{
    const addr = server.address();
    const port = addr && typeof addr === 'object' ? addr.port : 0;
    if (!port) throw new Error('oauth_dynamic_port_missing');
    redirectUri = 'http://127.0.0.1:' + port + '/oauth2/callback';
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id:client.clientId,redirect_uri:redirectUri,response_type:'code',access_type:'online',
      prompt:'consent',state,scope:scopes.join(' ')
    }).toString();
    spawn('rundll32.exe',['url.dll,FileProtocolHandler',url.toString()],{detached:true,stdio:'ignore',windowsHide:true}).unref();
    console.log(JSON.stringify({ok:true,awaiting_google_consent:true,purpose:'A1 Apps Script deployment',secrets_printed:false}));
  });

  setTimeout(()=>{
    if (!completed) {
      try { server.close(); } catch {}
    }
  },10*60*1000).unref();
}

main().catch(error=>{
  console.error(JSON.stringify({ok:false,error:String(error?.message||error).slice(0,220),secrets_printed:false}));
  process.exitCode=1;
});
