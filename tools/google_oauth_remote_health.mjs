import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadVault, contentVault } from './google_drive_readonly_oauth.mjs';

const key = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge\\state\\ssh\\aperion-hermes-ed25519';
const staged = await loadVault(contentVault);
const expectedHash = createHash('sha256').update(staged.clientId).digest('hex');
const source = `import {createHash} from 'node:crypto';
const p=process.env;
const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:p.GOOGLE_OAUTH_CLIENT_ID,client_secret:p.GOOGLE_OAUTH_CLIENT_SECRET,refresh_token:p.GOOGLE_OAUTH_REFRESH_TOKEN,grant_type:'refresh_token'})});
const t=await r.json().catch(()=>({}));
if(!r.ok||!t.access_token)throw new Error('remote_refresh_failed');
const get=async u=>{const x=await fetch(u,{headers:{authorization:'Bearer '+t.access_token}});return x.ok};
const checks={gmail:await get('https://gmail.googleapis.com/gmail/v1/users/me/profile'),sheets:await get('https://sheets.googleapis.com/v4/spreadsheets/155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc?fields=spreadsheetId'),drive:await get('https://www.googleapis.com/drive/v3/files/1q7VIN8DOmi_zjpFcCdFkLL-1V3QfIP3sAHilADevoIg?fields=id')};
console.log(JSON.stringify({checks,client_hash:createHash('sha256').update(p.GOOGLE_OAUTH_CLIENT_ID).digest('hex')}));`;
const child = spawn('ssh',['-i',key,'-o','BatchMode=yes','root@srv1929456.hstgr.cloud',
  'set -a; . /opt/aperion/secrets/google-oauth.env; set +a; node --input-type=module'],
  {stdio:['pipe','pipe','pipe'],windowsHide:true});
let stdout='',stderr='';
child.stdout.on('data',chunk=>stdout+=chunk);
child.stderr.on('data',chunk=>stderr+=chunk);
child.stdin.end(source);
const exit = await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve)});
if (exit !== 0) throw new Error(`remote_health_process_${exit}:${stderr.replace(/[^a-z0-9_ .:-]/gi,'').slice(0,80)}`);
const result = JSON.parse(stdout.trim());
const newClient = result.client_hash === expectedHash;
if (!newClient || !Object.values(result.checks).every(Boolean)) throw new Error('remote_health_failed');
console.log(JSON.stringify({ok:true,remote_new_client:true,checks:result.checks,secrets_printed:false}));
