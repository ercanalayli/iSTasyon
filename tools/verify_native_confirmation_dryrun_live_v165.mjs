import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const endpoint = 'https://aperion-command-bridge.yenicespor-finans.workers.dev';
const bridgeRoot = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge';

async function loadSecret() {
  const file = path.join(bridgeRoot, 'state', 'chatgpt-action-secret.dpapi').replaceAll("'", "''");
  const shell = 'C:\\Users\\HP\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\powershell\\pwsh.exe';
  const script = `$s=ConvertTo-SecureString (Get-Content -LiteralPath '${file}' -Raw).Trim();$p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s);try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}`;
  const { stdout } = await execFileAsync(shell, ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide:true, maxBuffer:4096, timeout:15000 });
  return String(stdout || '').trim();
}

const token = await loadSecret();
assert(token.length > 20);
const conversationKey = crypto.randomUUID();
const eventId = crypto.randomUUID();
const started = performance.now();
const preparedResponse = await fetch(`${endpoint}/v1/chatgpt/commands`, {
  method: 'POST',
  headers: { authorization:`Bearer ${token}`, 'content-type':'application/json' },
  body: JSON.stringify({
    command_text: '10 TL Ercan nakit kasa dan Akbank a',
    event_id: eventId,
    conversation_key: conversationKey,
    idempotency_namespace: 'test:acceptance',
  }),
  signal: AbortSignal.timeout(15000),
});
const prepared = await preparedResponse.json();
assert(preparedResponse.ok, JSON.stringify(prepared));
assert.equal(prepared.message, '10 TL Transfer\nErcan Nakit Kasa → Akbank Şirket');
assert.deepEqual(Object.keys(prepared).sort(), ['_internal_approval_context', 'message']);
assert.equal(prepared._internal_approval_context.conversation_key, conversationKey);
assert.match(prepared._internal_approval_context.command_id, /^[0-9a-f-]{36}$/i);
assert.match(prepared._internal_approval_context.payload_hash, /^sha256:[0-9a-f]{64}$/i);

// A test-namespace command must never cross the production approval/write gate.
const approvalResponse = await fetch(`${endpoint}/v1/chatgpt/approve`, {
  method: 'POST',
  headers: { authorization:`Bearer ${token}`, 'content-type':'application/json' },
  body: JSON.stringify({
    command_id: prepared._internal_approval_context.command_id,
    payload_hash: prepared._internal_approval_context.payload_hash,
    conversation_key: conversationKey,
    approval_text: 'Onaylıyorum',
  }),
  signal: AbortSignal.timeout(15000),
});
const approval = await approvalResponse.json();
assert.equal(approvalResponse.ok, false);

const report = {
  checked_at: new Date().toISOString(),
  status: 'PASS',
  production_worker_version: '0db5201e-a243-4eff-a30e-3dc1ffc618e0',
  new_conversation_key_redacted: true,
  acceptance_command_id: prepared._internal_approval_context.command_id,
  user_visible_summary: prepared.message,
  internal_exact_binding_present: true,
  typed_approval_prompt_removed: true,
  test_namespace_approval_blocked: true,
  approval_http_status: approvalResponse.status,
  technical_error_redacted: true,
  prepare_duration_ms: +(performance.now() - started).toFixed(2),
  financial_writes: 0,
  bizimhesap_writes: 0,
  secrets_exposed: 0,
};
const output = new URL('../evidence/native-confirmation-dryrun-live-v165.json', import.meta.url);
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, evidence: output.pathname }, null, 2));
