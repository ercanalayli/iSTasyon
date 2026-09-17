'use strict';

const fs = require('node:fs');
const path = require('node:path');

const POLICY_PATH = path.resolve(__dirname, '..', '..', 'config', 'bizimhesap_write_policy.json');

function bizimHesapWriteEnabled() {
  try {
    const policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
    return policy?.bizimhesap_writes_enabled === true;
  } catch {
    return false;
  }
}

function assertBizimHesapWriteEnabled() {
  if (!bizimHesapWriteEnabled()) {
    throw new Error('bizimhesap_write_suspended_by_user');
  }
}

module.exports = { POLICY_PATH, bizimHesapWriteEnabled, assertBizimHesapWriteEnabled };
