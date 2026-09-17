import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const endpoint = 'https://aperion-memory-ingest.yenicespor-finans.workers.dev';
const defaultVault = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge\\state\\hermes-ingest-secret.dpapi';

async function secret() {
  const vault = process.env.APERION_MEMORY_SECRET_VAULT || defaultVault;
  const escaped = vault.replaceAll("'", "''");
  const script = `Import-Module Microsoft.PowerShell.Security -ErrorAction Stop;$s=ConvertTo-SecureString (Get-Content -LiteralPath '${escaped}' -Raw).Trim();$p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s);try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}`;
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  let stdout;
  try {
    ({ stdout } = await execFileAsync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { windowsHide: true, timeout: 15000, maxBuffer: 16384,
        env: { ...process.env, PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules' } }));
  } catch (error) {
    const detail = String(error.stderr || '').replace(/\x1b\[[0-9;]*m/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200);
    throw new Error(`memory_credential_unprotect_failed:${detail}`);
  }
  const value = stdout.trim();
  if (value.length < 32) throw new Error('memory_transport_credential_unavailable');
  return value;
}

export async function memoryRequest(pathname, { method = 'GET', body } = {}) {
  const credential = await secret();
  const response = await fetch(`${endpoint}${pathname}`, {
    method,
    headers: { authorization: `Bearer ${credential}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`memory_transport_http_${response.status}_${String(data.error || 'unknown').slice(0, 80)}_${String(data.message || '').replace(/[^a-z0-9_ .():-]/gi, '').slice(0,120)}`);
  return data;
}
