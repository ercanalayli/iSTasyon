import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
const endpoint='https://aperion-command-bridge.yenicespor-finans.workers.dev';
const bridgeRoot='C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge';
async function secret(){const file=path.join(bridgeRoot,'state','chatgpt-action-secret.dpapi').replaceAll("'","''");const shell='C:\\Users\\HP\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\powershell\\pwsh.exe';const script=`$s=ConvertTo-SecureString (Get-Content -LiteralPath '${file}' -Raw).Trim();$p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s);try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}`;const {stdout}=await execFileAsync(shell,['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,maxBuffer:4096,timeout:15000});return String(stdout||'').trim();}
const key=await secret();assert(key.length>=24);
async function post(){const started=performance.now();const response=await fetch(`${endpoint}/v1/chatgpt/commands`,{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({command_text:'10 TL Ercan nakit kasa dan Akbank a'}),signal:AbortSignal.timeout(15000)});const data=await response.json();assert(response.ok,JSON.stringify(data));return {data,ms:performance.now()-started};}
const first=await post();const replay=await post();
assert.equal(first.data.amount,10);assert.equal(first.data.source_account,'Ercan Nakit Kasa');assert.equal(first.data.target_account,'Akbank Şirket');assert.equal(first.data.status,'approval_required');assert.match(first.data.final_summary,/Ercan Nakit Kasa → Akbank Şirket/);assert.equal(first.data.actions[0].label,'ONAYLA');assert.equal(first.data.financial_write,0);assert.equal(first.data.bizimhesap_write,0);assert.equal(replay.data.command_id,first.data.command_id);assert.equal(replay.data.duplicate,true);
const report={checked_at:new Date().toISOString(),status:'PASS',production_version:'bf7ad6f5-a9a6-4fa7-84d2-d8634f2d9f5d',command_id:first.data.command_id,amount:first.data.amount,currency:first.data.currency,source_account:first.data.source_account,target_account:first.data.target_account,final_summary:first.data.final_summary,approval_policy:first.data.approval_policy,approval_expires_at:first.data.approval_expires_at,duplicate_replay:{same_command_id:true,duplicate:true},duration_ms:+first.ms.toFixed(2),financial_writes:0,bizimhesap_writes:0,secrets_exposed:0};
const out=path.resolve('evidence/finance-selection-live-v163.json');await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,evidence:out},null,2));
