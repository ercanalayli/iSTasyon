import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const STATE_DIR = path.join(ROOT, 'state', 'hermes-runtime');
// Versioned files avoid clashing with a still-running pre-v160 collector handle.
const STATE_FILE = path.join(STATE_DIR, 'google-watchers-state-v160.json');
const EVIDENCE_FILE = path.join(STATE_DIR, 'google-watchers-last-run-v160.json');
const VAULT_ROOT = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge';
const VAULT = path.join(VAULT_ROOT, 'state', 'google-oauth.dpapi');
const VAULT_SCRIPT = path.join(VAULT_ROOT, 'tools', 'google-oauth-dpapi.ps1');
const requested = new Set(process.argv.slice(2));
const runAll = requested.size === 0 || requested.has('--all');

const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const now = () => new Date().toISOString();
const nextDue = minutes => new Date(Date.now() + minutes * 60000).toISOString();
async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; } }

async function loadVault() {
  const { stdout } = await execFileAsync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', VAULT_SCRIPT, '-Mode', 'unprotect', '-Vault', VAULT], { windowsHide: true, timeout: 15000, maxBuffer: 16384 });
  const value = JSON.parse(Buffer.from(String(stdout).trim(), 'base64').toString('utf8'));
  if (!value.clientId || !value.clientSecret || !value.refreshToken) throw new Error('google_oauth_vault_incomplete');
  return value;
}

async function accessToken(vault) {
  const body = new URLSearchParams({ client_id: vault.clientId, client_secret: vault.clientSecret, refresh_token: vault.refreshToken, grant_type: 'refresh_token' });
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(15000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(`google_token_refresh_${response.status}`);
  return data.access_token;
}

async function api(token, url) {
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = data?.error?.details?.[0]?.reason || data?.error?.errors?.[0]?.reason || data?.error?.status || 'unknown';
    throw new Error(`google_api_${response.status}_${String(reason).replace(/[^a-z0-9_-]/gi, '').slice(0, 80)}`);
  }
  return data;
}

async function gmailWatcher(token, state) {
  const started = Date.now();
  const query = 'newer_than:7d (has:attachment OR subject:(ekstre OR dekont OR fatura OR sipariş OR ödeme OR tahsilat OR banka))';
  const list = await api(token, `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=${encodeURIComponent(query)}`);
  const known = new Set(state.gmail?.fingerprints || []);
  const fresh = (list.messages || []).filter(item => !known.has(hash(item.id)));
  const important = [];
  for (const item of fresh.slice(0, 25)) {
    const meta = await api(token, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`);
    const headers = Object.fromEntries((meta.payload?.headers || []).map(header => [header.name.toLowerCase(), header.value]));
    important.push({ fingerprint: hash(item.id), threadFingerprint: hash(meta.threadId || item.id), subjectHash: hash(headers.subject || ''), fromDomainHash: hash(String(headers.from || '').split('@').at(-1) || ''), internalDate: meta.internalDate || null, hasAttachmentHint: /attachment/i.test(JSON.stringify(meta.payload || {})) });
  }
  state.gmail = { fingerprints: [...new Set([...(state.gmail?.fingerprints || []), ...(list.messages || []).map(item => hash(item.id))])].slice(-500), lastRunAt: now() };
  return { status: 'healthy', last_success: now(), last_error: null, duration_ms: Date.now() - started, next_due: nextDue(30), source_health: 'connected_readonly', scanned_metadata: (list.messages || []).length, new_important: important.length, unchanged: important.length === 0, provenance: important };
}

async function driveWatcher(token, state) {
  const started = Date.now();
  let changes = [];
  let pageToken = state.drive?.pageToken || null;
  let baselineInitialized = false;
  if (!pageToken) {
    const start = await api(token, 'https://www.googleapis.com/drive/v3/changes/startPageToken?supportsAllDrives=true');
    pageToken = start.startPageToken;
    baselineInitialized = true;
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const recent = await api(token, `https://www.googleapis.com/drive/v3/files?pageSize=100&orderBy=modifiedTime%20desc&q=${encodeURIComponent(`modifiedTime > '${since}' and trashed = false`)}&fields=${encodeURIComponent('files(id,mimeType,modifiedTime,md5Checksum,size),nextPageToken')}`);
    changes = (recent.files || []).map(file => ({ fileId: file.id, file }));
  } else {
    let cursor = pageToken;
    do {
      const page = await api(token, `https://www.googleapis.com/drive/v3/changes?pageSize=100&includeRemoved=true&supportsAllDrives=true&fields=${encodeURIComponent('changes(fileId,removed,file(id,mimeType,modifiedTime,md5Checksum,size,trashed)),newStartPageToken,nextPageToken')}&pageToken=${encodeURIComponent(cursor)}`);
      changes.push(...(page.changes || []));
      cursor = page.nextPageToken || null;
      if (page.newStartPageToken) pageToken = page.newStartPageToken;
    } while (cursor);
  }
  state.drive = { pageToken, lastRunAt: now() };
  const provenance = changes.map(change => ({ fileFingerprint: hash(change.fileId), removed: Boolean(change.removed), mimeType: change.file?.mimeType || null, modifiedTime: change.file?.modifiedTime || null, contentHashPresent: Boolean(change.file?.md5Checksum), size: change.file?.size || null })).slice(0, 100);
  return { status: 'healthy', last_success: now(), last_error: null, duration_ms: Date.now() - started, next_due: nextDue(60), source_health: 'connected_metadata_only', baseline_initialized: baselineInitialized, changed_metadata: changes.length, unchanged: changes.length === 0, provenance };
}

async function chatgptStateWatcher() {
  const started = Date.now();
  const syncFile = path.join(ROOT, 'data', 'chatgpt-project-sync-v158.json');
  const sync = await readJson(syncFile, null);
  if (!sync) throw new Error('chatgpt_sync_state_missing');
  return { status: 'healthy', last_success: now(), last_error: null, duration_ms: Date.now() - started, next_due: nextDue(720), source_health: 'metadata_sync_state_available', discovered_threads: sync.threads?.length || 0, fingerprint_first: true, unchanged_threads_read: 0, rate_limit_policy: 'background_exponential_backoff_interactive_priority' };
}

await fs.mkdir(STATE_DIR, { recursive: true });
const state = await readJson(STATE_FILE, {});
const result = { schemaVersion: 'unified-google-watchers-v160', observedAt: now(), financialWrites: 0, bizimHesapWrites: 0, messagesSent: 0, secretsExposed: 0, watchers: {} };
let token;
for (const name of ['gmail', 'drive']) {
  if (!(runAll || requested.has(`--${name}`))) continue;
  const started = Date.now();
  try {
    token ||= await accessToken(await loadVault());
    result.watchers[name] = name === 'gmail' ? await gmailWatcher(token, state) : await driveWatcher(token, state);
  } catch (error) {
    result.watchers[name] = { status: 'unhealthy', last_success: state[name]?.lastRunAt || null, last_error: String(error.message || error).slice(0, 160), duration_ms: Date.now() - started, next_due: nextDue(15), source_health: 'blocked_retry_backoff' };
  }
}
if (runAll || requested.has('--chatgpt-state')) {
  try { result.watchers.chatgpt_project_memory = await chatgptStateWatcher(); }
  catch (error) { result.watchers.chatgpt_project_memory = { status: 'unhealthy', last_success: null, last_error: String(error.message || error).slice(0, 160), duration_ms: 0, next_due: nextDue(60), source_health: 'blocked_retry_backoff' }; }
}
await fs.writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
await fs.writeFile(EVIDENCE_FILE, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(result)}\n`);
if (Object.values(result.watchers).some(watcher => watcher.status !== 'healthy')) process.exitCode = 2;
