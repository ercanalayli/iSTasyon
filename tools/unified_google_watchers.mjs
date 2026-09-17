import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { memoryRequest } from './lib/memory_transport.mjs';
import { containsSecret } from '../functions/shared/project-memory.js';
import { contentVault, loadVault as loadContentVault, refresh as refreshContentToken } from './google_drive_readonly_oauth.mjs';

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
const normalize = value => String(value || '').toLocaleLowerCase('tr-TR');
function classifyScope(text) {
  const value = normalize(text);
  if (/alayli|alaylı|medikal|bizimhesap|moka|sgk|vergi|tedarik|fatura/.test(value)) return 'ALAYLI';
  if (/şahsi|sahsi|kişisel|kisisel|ercan alayli|ercan alaylı/.test(value)) return 'ŞAHSİ';
  return 'BELİRSİZ';
}
function parseAmount(text) {
  const match = String(text || '').match(/(?:₺|TL|TRY)\s*([0-9.]+(?:,[0-9]{2})?)|([0-9.]+(?:,[0-9]{2})?)\s*(?:₺|TL|TRY)/i);
  if (!match) return null;
  const amount = Number(String(match[1] || match[2]).replaceAll('.', '').replace(',', '.'));
  return Number.isFinite(amount) ? amount : null;
}
function parseDueDate(text) {
  const match = String(text || '').match(/(?:son ödeme|son odeme|vade)(?:\s+tarihi)?[^0-9]{0,20}(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i);
  return match?.[1] || null;
}
function gmailSignal(item, meta, headers) {
  const text = `${headers.subject || ''} ${headers.from || ''} ${meta.snippet || ''}`;
  const value = normalize(text);
  const card = /kredi kart|ekstre|dönem borcu|donem borcu|asgari/.test(value);
  const due = parseDueDate(text);
  const amount = parseAmount(text);
  const eventType = card ? 'credit_card_statement' : /sgk/.test(value) ? 'sgk' : /vergi/.test(value) ? 'tax' : /fast|dekont/.test(value) ? 'bank_transfer_notice' : /fatura/.test(value) ? 'supplier_invoice' : /moka/.test(value) ? 'moka' : 'finance_operation_mail';
  const risk = due || card || /gecik|ödenmemiş|odenmemis|bloke|redded|başarısız|basarisiz/.test(value) ? 'high' : 'medium';
  return {
    event_id: hash(item.id), source: 'gmail', scope: classifyScope(text), importance: risk === 'high' ? 'critical' : 'important', risk,
    event_type: eventType, amount, due_date: due, required_action: risk === 'high' ? 'review' : 'none',
    summary: `${eventType} algılandı${amount != null ? '; tutar ayrıştırıldı' : ''}${due ? '; vade ayrıştırıldı' : ''}.`,
    provenance: { message_fingerprint: hash(item.id), thread_fingerprint: hash(meta.threadId || item.id), observed_at: now() }, confidence: card || due ? 0.9 : 0.75
  };
}

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

async function readDriveContent(token, file, revision) {
  const mime = file.mimeType || '';
  let url;
  if (revision && mime === 'application/vnd.google-apps.document') {
    const rev = await api(token, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/revisions/${encodeURIComponent(revision)}?fields=id,modifiedTime,exportLinks`);
    url = rev.exportLinks?.['text/plain'];
    if (!url) throw new Error('drive_revision_export_unavailable');
  } else if (mime === 'application/vnd.google-apps.document') url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=text%2Fplain`;
  else if (mime === 'application/vnd.google-apps.spreadsheet') url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=text%2Fcsv`;
  else if (!mime.startsWith('application/vnd.google-apps.')) url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`;
  else return null;
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`drive_content_http_${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 10_000_000) throw new Error('drive_content_too_large');
  const contentHash = crypto.createHash('sha256').update(bytes).digest('hex');
  const plain = /text\/|application\/(?:json|csv|xml)/.test(mime) || mime === 'application/vnd.google-apps.document' || mime === 'application/vnd.google-apps.spreadsheet';
  const content = plain ? bytes.toString('utf8') : '';
  const facts = [];
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:FACT|OLGU)\s*:\s*([^|]{1,160})\|([^|]{1,80})\|(.{1,240})\s*$/i);
    if (!match) continue;
    const [subject,predicate,object_value] = match.slice(1).map(value => value.trim());
    if (!/\b(?:password|parola|sifre|şifre|token|secret|api[_ -]?key|otp|cvv|cvc)\b/i.test(predicate) &&
        ![subject,predicate,object_value].some(containsSecret)) facts.push({ subject,predicate,object_value });
  }
  const acceptanceCode = content.match(/\bAPN-MEM-[0-9]{8}(?:-V[0-9]+)?\b/)?.[0] || null;
  return { contentHash, facts: facts.slice(0,30), acceptanceCode };
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
    important.push({ fingerprint: hash(item.id), threadFingerprint: hash(meta.threadId || item.id), subjectHash: hash(headers.subject || ''), fromDomainHash: hash(String(headers.from || '').split('@').at(-1) || ''), internalDate: meta.internalDate || null, hasAttachmentHint: /attachment/i.test(JSON.stringify(meta.payload || {})), signal: gmailSignal(item, meta, headers) });
  }
  state.gmail = { fingerprints: [...new Set([...(state.gmail?.fingerprints || []), ...(list.messages || []).map(item => hash(item.id))])].slice(-500), lastRunAt: now() };
  return { status: 'healthy', last_success: now(), last_error: null, duration_ms: Date.now() - started, next_due: nextDue(30), source_health: 'connected_readonly', scanned_metadata: (list.messages || []).length, new_important: important.length, unchanged: important.length === 0, signals: important.map(item => item.signal), provenance: important.map(({ signal, ...item }) => item) };
}

async function driveWatcher(token, contentToken, state) {
  const started = Date.now();
  let changes = [];
  let pageToken = state.drive?.pageToken || null;
  let baselineInitialized = false;
  if (!pageToken) {
    const start = await api(token, 'https://www.googleapis.com/drive/v3/changes/startPageToken?supportsAllDrives=true');
    pageToken = start.startPageToken;
    baselineInitialized = true;
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const recent = await api(token, `https://www.googleapis.com/drive/v3/files?pageSize=100&orderBy=modifiedTime%20desc&q=${encodeURIComponent(`modifiedTime > '${since}' and trashed = false`)}&fields=${encodeURIComponent('files(id,name,mimeType,modifiedTime,md5Checksum,size,parents,trashed),nextPageToken')}`);
    changes = (recent.files || []).map(file => ({ fileId: file.id, file }));
  } else {
    let cursor = pageToken;
    do {
      const page = await api(token, `https://www.googleapis.com/drive/v3/changes?pageSize=100&includeRemoved=true&supportsAllDrives=true&fields=${encodeURIComponent('changes(fileId,removed,file(id,name,mimeType,modifiedTime,md5Checksum,size,parents,trashed)),newStartPageToken,nextPageToken')}&pageToken=${encodeURIComponent(cursor)}`);
      changes.push(...(page.changes || []));
      cursor = page.nextPageToken || null;
      if (page.newStartPageToken) pageToken = page.newStartPageToken;
    } while (cursor);
  }
  const acceptanceId = process.argv.find(arg => arg.startsWith('--acceptance-file-id='))?.split('=')[1];
  if (acceptanceId && /^[a-zA-Z0-9_-]+$/.test(acceptanceId)) {
    const file = await api(token, `https://www.googleapis.com/drive/v3/files/${acceptanceId}?fields=id,name,mimeType,modifiedTime,md5Checksum,size,parents,trashed`);
    changes.push({ fileId: file.id, file });
    const revision = process.argv.find(arg => arg.startsWith('--acceptance-revision='))?.split('=')[1];
    if (revision && /^[a-zA-Z0-9_-]+$/.test(revision)) {
      const rev = await api(contentToken, `https://www.googleapis.com/drive/v3/files/${acceptanceId}/revisions/${revision}?fields=id,modifiedTime`);
      changes.push({ fileId: file.id, file: { ...file, modifiedTime: rev.modifiedTime }, revision });
    }
  }
  let ingested = 0;
  let duplicates = 0;
  let contentReads = 0;
  let insertedFacts = 0;
  for (const change of changes) {
    const file = change.file;
    if (change.removed || !file || file.trashed || !file.name || !file.modifiedTime || containsSecret(file.name)) continue;
    if (!/aperion|apeiron|alayl[ıi]|medikal|bizimhesap|ekstre|fatura|makbuz|dekont|mutabakat|s[oö]zle[sş]me|karar|banka/i.test(file.name)) continue;
    const extracted = contentToken ? await readDriveContent(contentToken,file,change.revision) : null;
    if (extracted) contentReads += 1;
    const versionHash = extracted?.contentHash || hash(`${file.id}|${file.modifiedTime}|${file.md5Checksum || file.size || ''}`);
    const result = await memoryRequest('/v1/memory', { method: 'POST', body: { kind: 'drive_change', document: {
      drive_file_id: file.id, canonical_name: file.name, document_type: file.mimeType || 'application/octet-stream',
      modified_at: file.modifiedTime, version_hash: versionHash, content_hash: extracted?.contentHash,
      acceptance_code: extracted?.acceptanceCode, facts: extracted?.facts || [], cursor: pageToken,
    } } });
    if (result.duplicate) duplicates += 1;
    else ingested += 1;
    insertedFacts += result.inserted_facts || 0;
  }
  // Commit the Drive cursor only after every selected change was persisted.
  state.drive = { pageToken, lastRunAt: now() };
  const provenance = changes.map(change => ({ fileFingerprint: hash(change.fileId), removed: Boolean(change.removed), mimeType: change.file?.mimeType || null, modifiedTime: change.file?.modifiedTime || null, contentHashPresent: Boolean(change.file?.md5Checksum), size: change.file?.size || null })).slice(0, 100);
  return { status: 'healthy', last_success: now(), last_error: null, duration_ms: Date.now() - started, next_due: nextDue(60), source_health: contentToken ? 'connected_content_readonly' : 'connected_metadata_only', baseline_initialized: baselineInitialized, changed_metadata: changes.length, ingested_metadata_versions: ingested, duplicate_versions: duplicates, content_reads: contentReads, inserted_facts: insertedFacts, content_extraction: contentToken ? 'enabled' : 'blocked_by_drive_metadata_only_oauth_scope', unchanged: changes.length === 0, signals: baselineInitialized ? [] : provenance.map(item => ({ event_id: item.fileFingerprint, source: 'google_drive', scope: 'BELİRSİZ', importance: 'important', risk: 'low', event_type: item.removed ? 'file_removed' : 'file_metadata_changed', amount: null, due_date: null, required_action: 'none', summary: 'ApeirON operasyon dosyası metadata değişikliği algılandı.', provenance: { file_fingerprint: item.fileFingerprint, observed_at: now() }, confidence: 0.7 })), provenance };
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
let contentToken;
for (const name of ['gmail', 'drive']) {
  if (!(runAll || requested.has(`--${name}`))) continue;
  const started = Date.now();
  try {
    token ||= await accessToken(await loadVault());
    if (name === 'drive') {
      try { contentToken = (await refreshContentToken(await loadContentVault(contentVault))).access_token; }
      catch (error) { if (error.code !== 'ENOENT') throw new Error('drive_content_oauth_unavailable'); }
    }
    result.watchers[name] = name === 'gmail' ? await gmailWatcher(token, state) : await driveWatcher(token, contentToken, state);
  } catch (error) {
    result.watchers[name] = { status: 'unhealthy', last_success: state[name]?.lastRunAt || null, last_error: String(error.message || error).slice(0, 160), duration_ms: Date.now() - started, next_due: nextDue(15), source_health: 'blocked_retry_backoff' };
  }
}
if (runAll || requested.has('--chatgpt-state')) {
  try { result.watchers.chatgpt_project_memory = await chatgptStateWatcher(); }
  catch (error) { result.watchers.chatgpt_project_memory = { status: 'unhealthy', last_success: null, last_error: String(error.message || error).slice(0, 160), duration_ms: 0, next_due: nextDue(60), source_health: 'blocked_retry_backoff' }; }
}
await fs.writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
const previousEvidence = await readJson(EVIDENCE_FILE, { watchers: {} });
result.watchers = { ...(previousEvidence.watchers || {}), ...result.watchers };
await fs.writeFile(EVIDENCE_FILE, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(result)}\n`);
if (Object.values(result.watchers).some(watcher => watcher.status !== 'healthy')) process.exitCode = 2;
