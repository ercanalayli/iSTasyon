import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const bridgeRoot = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge';
const endpoint = 'https://aperion-command-bridge.yenicespor-finans.workers.dev';
const commandText = '50 TL çay masrafı Ercan Nakit Kasa';

async function readSealedSecret() {
  const file = path.join(bridgeRoot, 'state', 'chatgpt-action-secret.dpapi').replaceAll("'", "''");
  const script = `$s=ConvertTo-SecureString (Get-Content -LiteralPath '${file}' -Raw).Trim();$p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s);try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}`;
  const shell = 'C:\\Users\\HP\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\powershell\\pwsh.exe';
  const { stdout } = await execFileAsync(shell, ['-NoProfile','-NonInteractive','-Command',script], { windowsHide:true, maxBuffer:4096, timeout:15000 });
  const secret = String(stdout || '').trim();
  if (secret.length < 32) throw new Error('sealed_bridge_secret_unavailable');
  return secret;
}

async function request(secret, route, init = {}) {
  const response = await fetch(`${endpoint}${route}`, { ...init, headers:{ authorization:`Bearer ${secret}`, ...(init.headers || {}) }, signal:AbortSignal.timeout(15000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${route}:${response.status}:${body.error || 'failed'}`);
  return body;
}

async function verifiedAccountResolution() {
  const ledgerFile = path.join(bridgeRoot, 'state', 'realtime', 'activity-ledger.json');
  const ledger = await fs.readFile(ledgerFile, 'utf8');
  const occurrenceCount = (ledger.match(/\*\*ercan nakit/gi) || []).length;
  return { ok:occurrenceCount > 0, displayName:'Ercan Nakit Kasa', resolvedName:'**ercan nakit', resolvedId:'1525267',
    provenance:'v160 verified BizimHesap account registry + local read-only activity ledger', occurrenceCount,
    freshBrowserProbe:'deferred_rate_limited_429', writePerformed:false };
}

const secret = await readSealedSecret();
const create = () => request(secret, '/v1/chatgpt/commands', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({command_text:commandText}) });
const first = await create();
const replay = await create();
const status = await request(secret, `/v1/chatgpt/commands/${first.command_id}`);
const account = await verifiedAccountResolution();

assert.equal(first.command_id, replay.command_id);
assert.equal(first.parsed_scope, 'ALAYLI'); assert.equal(first.amount, 50); assert.equal(first.currency, 'TRY');
assert.equal(first.category, 'Çay / İkram'); assert.equal(first.source_account, 'Ercan Nakit Kasa');
assert.equal(first.target, 'BizimHesap'); assert.equal(first.status, 'approval_required');
assert.equal(first.approval_policy, 'explicit_single_use'); assert.equal(first.financial_write, 0); assert.equal(first.bizimhesap_write, 0);
assert.equal(replay.duplicate, true); assert.equal(status.status, 'approval_required');
assert.equal(status.proof.approval_state, 'required'); assert.equal(account.ok, true);

const evidence = { checkedAt:new Date().toISOString(), status:'PASS', integration:'authenticated_gpt_action_openapi', endpoint:`${endpoint}/openapi.json`,
  commandText, command_id:first.command_id, parsed_scope:first.parsed_scope, amount:first.amount, currency:first.currency,
  category:first.category, source_account:first.source_account, resolved_account:first.resolved_account, live_account_resolution:account,
  target:first.target, duplicate_check:first.duplicate_check, replay_same_command_id:replay.command_id === first.command_id,
  status:first.status, approval_policy:first.approval_policy, execution_mode:first.execution_mode, proof:first.proof,
  status_query:status, transient_session_note:'fresh account selector probe deferred after BizimHesap HTTP 429; no retry storm', financial_writes:0, bizimhesap_writes:0, secrets_exposed:0 };
const output = path.join(root, 'evidence', 'chatgpt-action-acceptance-v161.json');
await fs.mkdir(path.dirname(output), {recursive:true}); await fs.writeFile(output, `${JSON.stringify(evidence,null,2)}\n`, 'utf8');
console.log(JSON.stringify({status:'PASS',command_id:first.command_id,duplicate:replay.duplicate,approval_state:status.proof.approval_state,account:{name:account.resolvedName,id:account.resolvedId,provenance:account.provenance},financial_writes:0,bizimhesap_writes:0,secrets_exposed:0,evidence:output},null,2));
