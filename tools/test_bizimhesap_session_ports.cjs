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

// Restart recovery must fail closed for all unknown and write-like commands.
const recovery = listener.slice(listener.lastIndexOf("const { data: yarimKalanlar"));
assert.match(recovery, /safeToReplay/);
assert.match(recovery, /if \(!safeToReplay\.has\(cmd\.command\)\)/);
for (const command of ['bizimhesap_health', 'bizimhesap_fetch', 'bizimhesap_verify',
    'bizimhesap_row_menu', 'bizimhesap_table_diag', 'bizimhesap_scroll_diag',
    'bizimhesap_id_dogrula', 'bizimhesap_hesap_ekstre_dump']) {
  assert.ok(recovery.includes(command), command + ': explicit safe replay whitelist');
}
assert.match(recovery, /FINANSAL_YENIDEN_YAZMA_ENGELLENDI/);
assert.ok(!recovery.includes("update({ status: 'pending' }).eq('status', 'processing')"));
assert.ok(probe.includes("if (browserOwnedByListener && browser)"));
console.log('BizimHesap safe health and read-only-only restart replay: PASS');
