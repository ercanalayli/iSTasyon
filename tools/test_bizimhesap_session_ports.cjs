'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { brokerCandidateURLs, attachOnly } = require('./lib/bizimhesap_session_ports.cjs');

assert.deepEqual(brokerCandidateURLs({}), [
  'http://127.0.0.1:9223', 'http://127.0.0.1:9222'
]);
assert.deepEqual(
  brokerCandidateURLs({ APERION_BIZIMHESAP_BROWSER_URL: 'http://127.0.0.1:9222' }),
  ['http://127.0.0.1:9222', 'http://127.0.0.1:9223']
);
assert.deepEqual(
  brokerCandidateURLs({ APERION_BIZIMHESAP_BROWSER_URL: 'http://127.0.0.1:9333' }),
  ['http://127.0.0.1:9333', 'http://127.0.0.1:9223', 'http://127.0.0.1:9222']
);
assert.equal(attachOnly({ APERION_CHROME_ATTACH_MODE: 'attach-only' }), true);
assert.equal(attachOnly({ APERION_CHROME_ATTACH_MODE: 'ATTACH-ONLY' }), true);
assert.equal(attachOnly({}), false);

const listener = fs.readFileSync(path.join(__dirname, 'aperion_command_listener.cjs'), 'utf8');
assert.match(listener, /for \(const browserURL of brokerCandidateURLs\(\)\)/);
assert.match(listener, /hasAuthenticatedBizimHesapPage\(candidate\)/);
assert.match(listener, /getcurrentfirm/);
assert.match(listener, /if \(attachOnly\(\)\)/);
console.log('BizimHesap 9223/9222 broker and attach-only safety checks: PASS');
