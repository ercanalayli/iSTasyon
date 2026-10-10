'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

const policy=JSON.parse(fs.readFileSync(path.join(root,'config','bizimhesap_write_policy.json'),'utf8'));
const contract=JSON.parse(fs.readFileSync(path.join(root,'config','site_action_contract_v1.json'),'utf8'));
const registry=JSON.parse(fs.readFileSync(path.join(root,'config','site_access_registry.json'),'utf8'));

assert.equal(policy.mode,'approval_gated_live');
assert.equal(policy.bizimhesap_writes_enabled,true);
assert.equal(policy.safeguards.final_write_requires_approval,true);
assert.equal(policy.safeguards.approval_policy,'explicit_single_use');
assert.equal(policy.safeguards.idempotency_required,true);
assert.equal(policy.safeguards.duplicate_check_required,true);
assert.equal(policy.safeguards.verify_after_write,true);

assert.equal(contract.risk_classes.read.approval,false);
assert.equal(contract.risk_classes.prepare.approval,false);
assert.equal(contract.risk_classes.write.approval,true);
assert.equal(contract.risk_classes.destructive.approval,true);
assert(contract.required_execution_guards.includes('post_action_readback'));
assert(contract.stop_conditions.includes('captcha'));
assert(contract.stop_conditions.includes('mfa_required'));

assert.equal(registry.sites.bizimhesap.enabled,true);
assert.equal(registry.sites.bizimhesap.final_write_requires_approval,true);

console.log(JSON.stringify({
  ok:true,
  status:'PASS',
  bizimhesap_live_writes:'APPROVAL_GATED',
  read:'AUTOMATIC',
  prepare:'AUTOMATIC',
  final_write:'EXPLICIT_SINGLE_USE_APPROVAL',
  duplicate_guard:'REQUIRED',
  readback:'REQUIRED',
  captcha_mfa:'STOP_AND_REQUEST_USER'
}));
