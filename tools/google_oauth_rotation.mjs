import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname,'..');
const secrets = path.join(root,'.aperion-secrets');
const clientVault = path.join(secrets,'google-oauth-rotation-client.dpapi');
const stagedVault = path.join(secrets,'google-oauth-rotation-staged.dpapi');
const legacyVault = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge\\state\\google-oauth.dpapi';
const contentVault = path.join(secrets,'drive-content-oauth.dpapi');
const legacyBackup = path.join(secrets,'google-oauth-pre-rotation-backup.dpapi');
const contentBackup = path.join(secrets,'drive-content-pre-rotation-backup.dpapi');
const vaultScript = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge\\tools\\google-oauth-dpapi.ps1';
const mode = process.argv[2];

async function protect(value, target) {
  await fs.mkdir(path.dirname(target),{recursive:true});
  const payload = Buffer.from(JSON.stringify(value),'utf8').toString('base64');
  await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',vaultScript,'-Mode','protect','-Vault',target,'-Payload',payload],
    {windowsHide:true,timeout:15000,maxBuffer:16384});
}
async function unprotect(target) {
  const {stdout} = await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',vaultScript,'-Mode','unprotect','-Vault',target],
    {windowsHide:true,timeout:15000,maxBuffer:16384});
  return JSON.parse(Buffer.from(stdout.trim(),'base64').toString('utf8'));
}
async function token(credentials) {
  const response = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:credentials.clientId,client_secret:credentials.clientSecret,refresh_token:credentials.refreshToken,grant_type:'refresh_token'}),
    signal:AbortSignal.timeout(15000)});
  const data = await response.json().catch(()=>({}));
  if (!response.ok || !data.access_token) throw new Error(`oauth_refresh_http_${response.status}`);
  return data.access_token;
}
async function probe(accessToken,url) {
  const response = await fetch(url,{headers:{authorization:`Bearer ${accessToken}`},signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error(`health_http_${response.status}`);
  return true;
}
async function health(vaultPath) {
  const credentials = await unprotect(vaultPath);
  const accessToken = await token(credentials);
  const checks = {};
  checks.gmail = await probe(accessToken,'https://gmail.googleapis.com/gmail/v1/users/me/profile');
  checks.sheets = await probe(accessToken,'https://sheets.googleapis.com/v4/spreadsheets/155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc?fields=spreadsheetId');
  checks.drive = await probe(accessToken,'https://www.googleapis.com/drive/v3/files/1q7VIN8DOmi_zjpFcCdFkLL-1V3QfIP3sAHilADevoIg?fields=id,name,mimeType,modifiedTime');
  const exportResponse = await fetch('https://www.googleapis.com/drive/v3/files/1q7VIN8DOmi_zjpFcCdFkLL-1V3QfIP3sAHilADevoIg/export?mimeType=text%2Fplain',
    {headers:{authorization:`Bearer ${accessToken}`},signal:AbortSignal.timeout(15000)});
  checks.drive_content = exportResponse.ok;
  if (!checks.drive_content) throw new Error(`drive_content_http_${exportResponse.status}`);
  return {credentials,checks};
}

if (mode === '--stage-client') {
  const input = path.resolve(process.argv[3] || '');
  const downloads = path.resolve('C:\\Users\\HP\\Downloads').toLowerCase();
  if (path.dirname(input).toLowerCase() !== downloads || !/^client_secret_[a-zA-Z0-9.-]+\.json$/.test(path.basename(input)))
    throw new Error('download_path_not_allowed');
  const config = JSON.parse(await fs.readFile(input,'utf8'));
  const client = config.installed || config.web;
  if (!client?.client_id || !client?.client_secret) throw new Error('client_json_invalid');
  await protect({clientId:client.client_id,clientSecret:client.client_secret},clientVault);
  const check = await unprotect(clientVault);
  if (check.clientId !== client.client_id || check.clientSecret !== client.client_secret) throw new Error('vault_readback_failed');
  await fs.rm(input);
  console.log(JSON.stringify({ok:true,client_staged:true,plaintext_download_removed:true,secrets_printed:false}));
} else if (mode === '--authorize') {
  const client = await unprotect(clientVault);
  const port = 53684;
  const redirectUri = `http://127.0.0.1:${port}/oauth2/callback`;
  const state = randomBytes(24).toString('hex');
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly',
  ];
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({client_id:client.clientId,redirect_uri:redirectUri,response_type:'code',access_type:'offline',prompt:'consent',state,scope:scopes.join(' ')});
  let done = false;
  const server = http.createServer(async (request,response) => {
    try {
      const callback = new URL(request.url,redirectUri);
      if (callback.pathname !== '/oauth2/callback' || callback.searchParams.get('state') !== state) throw new Error('oauth_callback_invalid');
      const code = callback.searchParams.get('code');
      if (!code) throw new Error('oauth_consent_not_granted');
      const exchange = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({code,client_id:client.clientId,client_secret:client.clientSecret,redirect_uri:redirectUri,grant_type:'authorization_code'}),signal:AbortSignal.timeout(15000)});
      const tokens = await exchange.json().catch(()=>({}));
      if (!exchange.ok || !tokens.refresh_token) throw new Error(`oauth_exchange_http_${exchange.status}`);
      await protect({...client,refreshToken:tokens.refresh_token,scope:tokens.scope || ''},stagedVault);
      done = true;
      response.writeHead(200,{'content-type':'text/plain; charset=utf-8'});
      response.end('AperiON OAuth onayı alındı. Pencereyi kapatabilirsiniz.');
      console.log(JSON.stringify({ok:true,staged_refresh_token:true,scope_count:String(tokens.scope||'').split(' ').filter(Boolean).length,secrets_printed:false}));
    } catch (error) {
      response.writeHead(400,{'content-type':'text/plain; charset=utf-8'}); response.end('OAuth tamamlanamadı.');
      console.error(JSON.stringify({ok:false,error:String(error.message||error).slice(0,80)}));
    } finally { server.close(); }
  });
  server.listen(port,'127.0.0.1',()=>{
    spawn('rundll32.exe',['url.dll,FileProtocolHandler',url.toString()],{detached:true,stdio:'ignore',windowsHide:true}).unref();
    console.log(JSON.stringify({ok:true,awaiting_google_consent:true,project:'aperion-506810',scopes:scopes.map(x=>x.split('/').at(-1)),secrets_printed:false}));
  });
  setTimeout(()=>{if (!done) server.close();},10*60*1000).unref();
} else if (mode === '--health') {
  const {credentials,checks} = await health(stagedVault);
  console.log(JSON.stringify({ok:true,checks,scope_count:String(credentials.scope||'').split(' ').filter(Boolean).length,secrets_printed:false}));
} else if (mode === '--activate-local') {
  const staged = await health(stagedVault);
  if (!Object.values(staged.checks).every(Boolean)) throw new Error('staged_health_failed');
  await fs.copyFile(legacyVault,legacyBackup);
  await fs.copyFile(contentVault,contentBackup);
  try {
    await fs.copyFile(stagedVault,legacyVault);
    await fs.copyFile(stagedVault,contentVault);
    const [legacy,content] = await Promise.all([health(legacyVault),health(contentVault)]);
    if (!Object.values(legacy.checks).every(Boolean) || !Object.values(content.checks).every(Boolean) ||
      legacy.credentials.clientId !== staged.credentials.clientId || content.credentials.clientId !== staged.credentials.clientId)
      throw new Error('active_health_failed');
    console.log(JSON.stringify({ok:true,local_activated:true,checks:legacy.checks,content_checks:content.checks,old_encrypted_backups_retained:true,secrets_printed:false}));
  } catch (error) {
    await fs.copyFile(legacyBackup,legacyVault);
    await fs.copyFile(contentBackup,contentVault);
    throw error;
  }
} else if (mode === '--health-active') {
  const [legacy,content] = await Promise.all([health(legacyVault),health(contentVault)]);
  const staged = await unprotect(stagedVault);
  console.log(JSON.stringify({ok:true,legacy_consumer_new_client:legacy.credentials.clientId===staged.clientId,
    drive_consumer_new_client:content.credentials.clientId===staged.clientId,checks:legacy.checks,content_checks:content.checks,secrets_printed:false}));
} else if (mode === '--verify-retired') {
  const old = await unprotect(legacyBackup);
  const response = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:old.clientId,client_secret:old.clientSecret,refresh_token:old.refreshToken,grant_type:'refresh_token'}),
    signal:AbortSignal.timeout(15000)});
  if (response.ok) throw new Error('old_client_still_works');
  const active = await health(legacyVault);
  if (!Object.values(active.checks).every(Boolean)) throw new Error('active_health_failed');
  console.log(JSON.stringify({ok:true,old_client_rejected:true,new_client_healthy:true,secrets_printed:false}));
} else throw new Error('usage: --stage-client <downloaded-client-json> | --authorize | --health');
