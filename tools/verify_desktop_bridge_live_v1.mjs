import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const run = promisify(execFile);
const root = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge';
const secretFile = path.join(root, 'state', 'chatgpt-action-secret.dpapi').replaceAll("'", "''");
const ps = 'C:\\Users\\HP\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\powershell\\pwsh.exe';
const script = `$s=ConvertTo-SecureString (Get-Content -LiteralPath '${secretFile}' -Raw).Trim();$p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s);try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}`;
const { stdout } = await run(ps, ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide:true, maxBuffer:4096, timeout:15000 });
const secret = stdout.trim();
if (!secret) throw new Error('action_credential_unavailable');
const endpoint = 'https://aperion-command-bridge.yenicespor-finans.workers.dev';
const headers = { authorization:`Bearer ${secret}`, 'content-type':'application/json' };
const capability = process.argv[2] === 'site' ? 'site.session.health' : 'desktop.health';
const conversationKey = `desktop-live-${randomUUID()}`;
const eventId = `health-${randomUUID()}`;
const post = await fetch(`${endpoint}/v1/chatgpt/desktop/tasks`, { method:'POST', headers,
  body:JSON.stringify({capability,event_id:eventId,conversation_key:conversationKey,
    ...(capability === 'site.session.health' ? {site_id:'bizimhesap'} : {})}), signal:AbortSignal.timeout(15000) });
const created = await post.json();
if (!post.ok || !created.task_id) throw new Error(`enqueue_failed:${post.status}:${created.error || 'unknown'}`);
let result = null;
for (let attempt=0; attempt<30; attempt++) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const response = await fetch(`${endpoint}/v1/chatgpt/desktop/tasks/${created.task_id}/result?conversation_key=${encodeURIComponent(conversationKey)}`,
    { headers:{authorization:`Bearer ${secret}`}, signal:AbortSignal.timeout(15000) });
  result = await response.json();
  if (result.status === 'completed' || ![200,202].includes(response.status)) break;
}
const ok = result?.status === 'completed' && (capability === 'desktop.health'
  ? result?.result?.ready === true && result?.result?.platform === 'windows'
  : result?.result?.site_id === 'bizimhesap' && result?.result?.authenticated === true);
console.log(JSON.stringify({ status:ok?'PASS':'FAIL', path:'authenticated client → gateway D1 → Windows worker → gateway result',
  capability, queued:post.ok, result_status:result?.status || null,
  ready:capability === 'desktop.health' ? result?.result?.ready === true : result?.result?.authenticated === true,
  financial_writes:0, bizimhesap_writes:0, secrets_exposed:0 }));
if (!ok) process.exitCode = 1;
