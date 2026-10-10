'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(root,'config','site_access_registry.json'),'utf8'));

assert.equal(registry.mode,'chatgpt_command_center');
assert.equal(registry.defaults.credential_storage,'windows_dpapi');
assert.equal(registry.defaults.final_write,'explicit_single_use_approval');
assert.equal(registry.defaults.verify_after_write,true);
assert.equal(registry.defaults.idempotency_required,true);
assert.equal(registry.sites.bizimhesap.enabled,true);
assert.equal(registry.sites.bizimhesap.final_write_requires_approval,true);

const serialized = JSON.stringify(registry);
for (const forbidden of ['password','secret','token']) {
  assert.equal(new RegExp('"' + forbidden + '"\s*:', 'i').test(serialized), false);
}

console.log(JSON.stringify({
  ok:true,
  status:'PASS',
  mode:registry.mode,
  enabled_sites:Object.entries(registry.sites).filter(([,v])=>v.enabled).map(([k])=>k),
  credential_storage:registry.defaults.credential_storage,
  final_write:registry.defaults.final_write,
  secrets_in_registry:0
}));
