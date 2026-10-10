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
// A health check must be read-only, without a new login/relaunch.
assert.match(listener, /cmd\.command === 'bizimhesap_health'/);
assert.match(listener, /probeAuthenticatedBizimHesapSession\(\)/);
const probe = listener.slice(listener.indexOf('async function probeAuthenticatedBizimHesapSession()'), listener.indexOf('function log(msg)'));
assert.ok(probe.includes('connectAuthenticatedSessionBroker()'));
assert.ok(!probe.includes('puppeteer.launch('));
assert.ok(!probe.includes('loginBizimHesap('));
assert.ok(!probe.includes('.goto('));

// Financial writes must not auto-replay when an interrupted process restarts.
const recovery = listener.slice(listener.lastIndexOf("const { data: yarimKalanlar"));
assert.match(recovery, /nonReplayable/);
for (const command of ['bizimhesap_process', 'bizimhesap_expense', 'bizimhesap_diaper_proforma',
    'bizimhesap_sil_bir', 'bizimhesap_masraf_sil', 'bizimhesap_sil_tumu']) {
  assert.ok(recovery.includes(command), command + ': protected from automatic retry');
}
assert.match(recovery, /FINANSAL_YENIDEN_YAZMA_ENGELLENDI/);
assert.ok(!recovery.includes("update({ status: 'pending' }).eq('status', 'processing')"));
console.log('BizimHesap port fallback, safe health probe and financial replay protection: PASS');
