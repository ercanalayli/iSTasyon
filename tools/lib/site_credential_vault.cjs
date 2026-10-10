'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY_PATH = path.join(ROOT, 'config', 'site_access_registry.json');
const VAULT_DIR = path.join(ROOT, '.aperion-secrets', 'site-credentials');

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function normalizeSiteKey(siteKey) {
  const key = String(siteKey || '').trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,64}$/.test(key)) throw new Error('invalid_site_key');
  return key;
}

function siteConfig(siteKey) {
  const key = normalizeSiteKey(siteKey);
  const registry = loadRegistry();
  const site = registry?.sites?.[key];
  if (!site) throw new Error('site_not_registered');
  return { key, registry, site };
}

function metadataPath(siteKey) {
  return path.join(VAULT_DIR, normalizeSiteKey(siteKey) + '.json');
}

function passwordPath(siteKey) {
  return path.join(VAULT_DIR, normalizeSiteKey(siteKey) + '.secure');
}

function readMetadata(siteKey) {
  try {
    const value = JSON.parse(fs.readFileSync(metadataPath(siteKey), 'utf8'));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function unprotectPassword(siteKey) {
  if (process.platform !== 'win32') return '';
  const file = passwordPath(siteKey);
  if (!fs.existsSync(file)) return '';
  const escaped = file.replace(/'/g, "''");
  const script = [
    "$s=ConvertTo-SecureString (Get-Content -LiteralPath '" + escaped + "' -Raw).Trim()",
    "$p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)",
    "try {[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p)} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}"
  ].join(';');
  try {
    return String(execFileSync('powershell.exe',[
      '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',script
    ],{windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:15000,maxBuffer:16384}) || '').trim();
  } catch {
    return '';
  }
}

function getSiteCredential(siteKey) {
  const { key, site } = siteConfig(siteKey);
  const metadata = readMetadata(key);
  return {
    site_key: key,
    username: String(metadata.username || '').trim(),
    password: unprotectPassword(key),
    credential_key: String(site.credential_key || key),
    has_local_password: fs.existsSync(passwordPath(key)),
    metadata
  };
}

function assertSiteEnabled(siteKey) {
  const { site } = siteConfig(siteKey);
  if (site.enabled !== true) throw new Error('site_access_disabled');
  return site;
}

module.exports = {
  REGISTRY_PATH,
  VAULT_DIR,
  assertSiteEnabled,
  getSiteCredential,
  loadRegistry,
  passwordPath,
  metadataPath,
  siteConfig
};
