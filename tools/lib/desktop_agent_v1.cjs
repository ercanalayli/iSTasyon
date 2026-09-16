'use strict';

// The existing Windows worker imports this capability adapter. It is not a
// second daemon, queue, credential store, or browser profile.
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { createHash } = require('node:crypto');

const run = promisify(execFile);
const ROOT = path.resolve(__dirname, '../..');
const CDP = 'http://127.0.0.1:9222';
const SECRET_NAME = /(?:secret|credential|password|token|cookie|\.dpapi|\.pem|\.key|\.env)/i;
const READABLE_ROOTS = new Set(['docs', 'evidence']);
const READ = new Set(['desktop.health','browser.health','site.session.health']);
// These capabilities can expose local names or content even though they do
// not mutate the machine. Keep them out of remote task execution until a
// payload-scoped consent and output-redaction policy exists.
const SENSITIVE_READ = new Set(['desktop.list_apps','desktop.inspect_screen','browser.list_tabs','browser.inspect','file.read','file.list']);
const MUTATING = new Set(['desktop.open_app','desktop.focus_app','desktop.click','desktop.type','desktop.hotkey','browser.open','browser.focus_tab','browser.click','browser.type','browser.navigate','file.write_safe','site.session.recover']);
const META = new Set(['task.execute','task.status','task.result','task.cancel']);
const ALL = new Set([...READ, ...SENSITIVE_READ, ...MUTATING, ...META]);

function riskClass(capability) {
  if (READ.has(capability)) return 'READ';
  if (SENSITIVE_READ.has(capability)) return 'SENSITIVE_READ';
  if (MUTATING.has(capability)) return 'WRITE_EXTERNAL';
  if (META.has(capability)) return 'CONTROL';
  throw new Error('capability_not_allowed');
}
function hashPayload(payload) {
  return `sha256:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}
function checkedPath(relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\0')) throw new Error('file_path_invalid');
  const resolved = path.resolve(ROOT, relative);
  if (!resolved.toLowerCase().startsWith(`${ROOT.toLowerCase()}${path.sep}`)) throw new Error('file_path_outside_workspace');
  if (!READABLE_ROOTS.has(relative.split(/[\\/]/)[0].toLowerCase())) throw new Error('file_area_not_allowed');
  if (relative.split(/[\\/]/).some(part => SECRET_NAME.test(part))) throw new Error('sensitive_file_blocked');
  return resolved;
}
async function safePath(relative) {
  const resolved = checkedPath(relative);
  const real = await fs.realpath(resolved);
  if (!real.toLowerCase().startsWith(`${ROOT.toLowerCase()}${path.sep}`)) throw new Error('file_symlink_outside_workspace');
  return real;
}
async function cdpTargets() {
  const response = await fetch(`${CDP}/json`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('browser_unavailable');
  return (await response.json()).filter(t => t.type === 'page');
}
function publicTab(target) {
  let host = null;
  let pathName = null;
  try { const url = new URL(target.url); host = url.host; pathName = url.pathname; } catch {}
  return { tab_id: target.id, title: String(target.title || '').slice(0, 120), host, path: pathName };
}
async function inspectTab(tabId) {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(String(tabId || ''))) throw new Error('tab_id_invalid');
  const target = (await cdpTargets()).find(t => t.id === tabId);
  if (!target) throw new Error('tab_not_found');
  // Inspection returns tab metadata only. Page text may contain credentials or
  // private business data and needs a site-specific, field-level adapter.
  return { ...publicTab(target), inspection: 'metadata_only' };
}
async function desktopApps() {
  if (process.platform !== 'win32') return [];
  const { stdout } = await run('tasklist.exe', ['/FO', 'CSV', '/NH'], { windowsHide: true, timeout: 10000, maxBuffer: 1024 * 1024 });
  return [...new Set(stdout.split(/\r?\n/).map(line => /^"([^"]+)"/.exec(line)?.[1]).filter(Boolean))].sort().slice(0, 200);
}
async function executeRead(capability, payload = {}, dependencies = {}) {
  if (!READ.has(capability) && !SENSITIVE_READ.has(capability)) throw new Error('read_capability_required');
  switch (capability) {
    case 'desktop.health': return { platform: process.platform, agent_version: 'desktop-agent-v1', ready: true };
    case 'desktop.list_apps': return { apps: await desktopApps() };
    case 'desktop.inspect_screen': return { available: false, reason: 'screen_capture_not_connected_to_authenticated_worker' };
    case 'browser.health': {
      try { const tabs = await cdpTargets(); return { connected: true, tab_count: tabs.length, profile: 'APERION_BIZIMHESAP' }; }
      catch { return { connected: false, tab_count: 0, profile: 'APERION_BIZIMHESAP' }; }
    }
    case 'browser.list_tabs': return { tabs: (await cdpTargets()).map(publicTab) };
    case 'browser.inspect': return inspectTab(payload.tab_id);
    case 'file.list': {
      const dir = await safePath(payload.path);
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return { path: payload.path, entries: entries.filter(e => !SECRET_NAME.test(e.name)).slice(0, 200).map(e => ({ name: e.name, type: e.isDirectory() ? 'directory' : 'file' })) };
    }
    case 'file.read': {
      const file = await safePath(payload.path);
      const stat = await fs.stat(file);
      if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('file_read_limit');
      const bytes = await fs.readFile(file);
      if (bytes.includes(0)) throw new Error('binary_file_blocked');
      return { path: payload.path, content: bytes.toString('utf8'), sha256: createHash('sha256').update(bytes).digest('hex') };
    }
    case 'site.session.health': {
      if (payload.site_id !== 'bizimhesap') throw new Error('site_not_configured');
      if (typeof dependencies.bizimhesapHealth !== 'function') throw new Error('site_adapter_unavailable');
      const state = await dependencies.bizimhesapHealth();
      return { site_id: 'bizimhesap', authenticated: state.authenticated === true, browser_status: state.status, profile: 'APERION_BIZIMHESAP' };
    }
  }
}
function validateTask(task) {
  if (!task || !ALL.has(task.capability)) throw new Error('capability_not_allowed');
  if (typeof task.task_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(task.task_id)) throw new Error('task_id_invalid');
  if (typeof task.user_binding !== 'string' || task.user_binding.length < 8) throw new Error('user_binding_required');
  if (typeof task.session_binding !== 'string' || task.session_binding.length < 8) throw new Error('session_binding_required');
  if (!task.payload || typeof task.payload !== 'object' || Array.isArray(task.payload)) throw new Error('payload_invalid');
  if (task.payload_hash !== hashPayload(task.payload)) throw new Error('payload_hash_mismatch');
  if (task.risk_class !== riskClass(task.capability)) throw new Error('risk_class_mismatch');
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(task.idempotency_key || '')) throw new Error('idempotency_key_invalid');
  return true;
}
async function execute(task, dependencies = {}) {
  validateTask(task);
  if (!READ.has(task.capability)) return { status: 'blocked', reason: 'exact_approval_and_egress_policy_required', write_performed: false };
  const result = await executeRead(task.capability, task.payload, dependencies);
  return { status: 'completed_verified', result, write_performed: false };
}

module.exports = { ALL, READ, SENSITIVE_READ, MUTATING, riskClass, hashPayload, validateTask, execute, executeRead, checkedPath };
