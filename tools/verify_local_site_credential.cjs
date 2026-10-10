'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getSiteCredential, metadataPath, passwordPath } = require('./lib/site_credential_vault.cjs');

const site = String(process.argv[2] || 'bizimhesap').toLowerCase();
let result = {
  ok:false,
  site,
  metadata_present:false,
  sealed_password_present:false,
  dpapi_decryptable:false,
  secret_printed:false
};

try {
  result.metadata_present = fs.existsSync(metadataPath(site));
  result.sealed_password_present = fs.existsSync(passwordPath(site));
  const cred = getSiteCredential(site);
  result.dpapi_decryptable = Boolean(cred.password && cred.password.length >= 4);
  result.ok = result.metadata_present && result.sealed_password_present && result.dpapi_decryptable;
} catch (error) {
  result.error = String(error?.message || error).slice(0,160);
}

console.log(JSON.stringify(result));
if (!result.ok) process.exitCode = 1;
