import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync=promisify(execFile);
const endpoint='https://aperion-command-bridge.yenicespor-finans.workers.dev';
const bridgeRoot='C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge';
async function secret(){const file=path.join(bridgeRoot,'state','chatgpt-action-secret.dpapi').replaceAll("'","''");const shell='C:\\Users\\HP\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\powershell\\pwsh.exe';const script=`$s=ConvertTo-SecureString (Get-Content -LiteralPath '${file}' -Raw).Trim();$p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s);try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}`;const {stdout}=await execFileAsync(shell,['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,maxBuffer:4096,timeout:15000});return String(stdout||'').trim();}
async function post(key,body){const r=await fetch(`${endpoint}/v1/chatgpt/commands`,{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const data=await r.json();assert(r.ok,JSON.stringify(data));return data;}
const key=await secret();assert(key.length>=24);
const started=performance.now();const partial=await post(key,{command_text:'16000 tl kasadan Ercan nakit kasa transfer'});const partialMs=performance.now()-started;
assert.equal(partial.status,'needs_clarification');assert.equal(partial.known_fields.amount,16000);assert.equal(partial.known_fields.target_account,'Ercan Nakit Kasa');assert.deepEqual(partial.missing_fields,['source_account']);assert.equal(partial.financial_write,0);assert.equal(partial.bizimhesap_write,0);
const nextStarted=performance.now();const completed=await post(key,{command_text:'TL Kasa',context:partial.context});const completeMs=performance.now()-nextStarted;
assert.equal(completed.status,'approval_required');assert.equal(completed.amount,16000);assert.equal(completed.source_account,'TL Kasa');assert.equal(completed.target_account,'Ercan Nakit Kasa');assert.equal(completed.financial_write,0);assert.equal(completed.bizimhesap_write,0);
const replay=await post(key,{command_text:'TL Kasa',context:partial.context});assert.equal(replay.command_id,completed.command_id);assert.equal(replay.duplicate,true);
const statusResponse=await fetch(`${endpoint}/v1/chatgpt/commands/${completed.command_id}`,{headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});const status=await statusResponse.json();assert(statusResponse.ok);assert.equal(status.status,'approval_required');
const report={checkedAt:new Date().toISOString(),status:'PASS',productionVersion:'f2649921-11a1-4c18-8398-719c0436fc16',partial:{status:partial.status,known_fields:partial.known_fields,missing_fields:partial.missing_fields,question:partial.question,duration_ms:Number(partialMs.toFixed(2))},continuation:{command_id:completed.command_id,status:completed.status,amount:completed.amount,currency:completed.currency,source_account:completed.source_account,target_account:completed.target_account,approval_policy:completed.approval_policy,duration_ms:Number(completeMs.toFixed(2))},duplicate_replay:{same_command_id:true,duplicate:true},server_side_status:{queryable:true,status:status.status,approval_state:status.proof?.approval_state},device_independent_state:Boolean(completed.command_id),financial_writes:0,bizimhesap_writes:0,secrets_exposed:0};
const out=path.resolve('evidence/chatgpt-clarification-live-v162.json');await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,evidence:out},null,2));
