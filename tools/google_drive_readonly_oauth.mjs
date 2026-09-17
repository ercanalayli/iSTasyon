import http from 'node:http';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';

const run = promisify(execFile);
const bridge = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge';
const script = path.join(bridge, 'tools', 'google-oauth-dpapi.ps1');
const legacy = path.join(bridge, 'state', 'google-oauth.dpapi');
export const contentVault = path.resolve(import.meta.dirname, '..', '.aperion-secrets', 'drive-content-oauth.dpapi');
const ps = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const scope = 'https://www.googleapis.com/auth/drive.readonly';

export async function loadVault(vaultPath) {
  const { stdout } = await run(ps, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Mode', 'unprotect', '-Vault', vaultPath],
    { windowsHide: true, timeout: 15000, maxBuffer: 16384 });
  const vault = JSON.parse(Buffer.from(stdout.trim(), 'base64').toString('utf8'));
  if (!vault.clientId || !vault.clientSecret || !vault.refreshToken) throw new Error('oauth_vault_incomplete');
  return vault;
}

export async function refresh(vault) {
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: vault.clientId, client_secret: vault.clientSecret, refresh_token: vault.refreshToken, grant_type: 'refresh_token' }), signal: AbortSignal.timeout(15000) });
  const token = await response.json().catch(() => ({}));
  if (!response.ok || !token.access_token) throw new Error(`oauth_refresh_${response.status}`);
  return token;
}

async function available(pathname) { try { await fs.access(pathname); return true; } catch { return false; } }

if (process.argv.includes('--probe')) {
  const source = await loadVault(await available(contentVault) ? contentVault : legacy);
  const token = await refresh(source);
  const scopes = String(token.scope || '').split(' ').filter(Boolean).sort();
  process.stdout.write(`${JSON.stringify({ driveContentRead: scopes.includes(scope), scopes })}\n`);
} else if (process.argv.includes('--authorize')) {
  const source = await loadVault(legacy);
  const port = 53683;
  const redirectUri = `http://127.0.0.1:${port}/oauth2/callback`;
  const state = randomBytes(32).toString('hex');
  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  auth.search = new URLSearchParams({ client_id: source.clientId, redirect_uri: redirectUri, response_type: 'code',
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'false', state, scope });
  let completed = false;
  const server = http.createServer(async (request, response) => {
    if (new URL(request.url, redirectUri).pathname !== '/oauth2/callback' || completed) {
      response.writeHead(404); response.end(); return;
    }
    completed = true;
    try {
      const url = new URL(request.url, redirectUri);
      if (url.searchParams.get('state') !== state) throw new Error('oauth_state_invalid');
      const code = url.searchParams.get('code');
      if (!code) throw new Error('oauth_not_approved');
      const exchanged = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: source.clientId, client_secret: source.clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }), signal: AbortSignal.timeout(15000) });
      const token = await exchanged.json().catch(() => ({}));
      if (!exchanged.ok || !token.refresh_token || !String(token.scope || '').split(' ').includes(scope)) throw new Error(`oauth_scope_or_refresh_missing_${exchanged.status}`);
      await fs.mkdir(path.dirname(contentVault), { recursive: true });
      const payload = Buffer.from(JSON.stringify({ clientId: source.clientId, clientSecret: source.clientSecret, refreshToken: token.refresh_token })).toString('base64');
      await run(ps, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Mode', 'protect', '-Vault', contentVault, '-Payload', payload],
        { windowsHide: true, timeout: 15000, maxBuffer: 4096 });
      response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('AperiON Drive salt-okunur icerik yetkisi kaydedildi.');
      process.stdout.write('DRIVE_READONLY_OAUTH_SAVED\n');
    } catch (error) {
      response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' }); response.end('OAuth tamamlanamadi.');
      process.stderr.write(`${String(error.message).slice(0,100)}\n`); process.exitCode = 1;
    } finally { server.close(); }
  });
  server.listen(port, '127.0.0.1', () => {
    spawn('rundll32.exe', ['url.dll,FileProtocolHandler', auth.toString()], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    process.stdout.write('GOOGLE_OAUTH_BROWSER_OPENED\n');
  });
} else if (process.argv[1]?.endsWith('google_drive_readonly_oauth.mjs')) {
  throw new Error('usage: --probe | --authorize');
}
