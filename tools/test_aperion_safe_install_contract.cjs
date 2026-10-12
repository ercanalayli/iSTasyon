'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const ps = fs.readFileSync(path.join(root, 'tools/Install-AperiON-Safe-OneClick-20261012.ps1'), 'utf8');
const cmd = fs.readFileSync(path.join(root, 'tools/AperiON-TekTik-Guncelle-20261012.cmd'), 'utf8');
const sha = file => execFileSync('git', ['hash-object', file], { cwd: root, encoding: 'utf8' }).trim();
const manifests = [...ps.matchAll(/'([^']+\.(?:cjs|mjs))'\s*=\s*'([a-f0-9]{40})'/g)];
assert.equal(manifests.length, 7, 'seven code/test files are explicitly pinned');
for (const [, p, hash] of manifests) {
  const file = path.join(root, p);
  assert.ok(fs.existsSync(file), p);
  assert.equal(sha(file), hash, 'pinned content does not match ' + p);
}
assert.match(cmd, /2debade7b07734b03f997f1569b197eb38c22c25/);
assert.ok(cmd.includes(sha(path.join(root, 'tools/Install-AperiON-Safe-OneClick-20261012.ps1'))),
  'bootstrap must pin installer git blob hash');
for (const fragment of [
  'AssertSafeQueue $cfg', 'BLOCKED_COMMAND_CURRENTLY_PROCESSING',
  'BLOCKED_UNREVIEWED_PENDING_FINANCIAL_OR_UNKNOWN_COMMAND',
  'BLOCKED_LOCAL_CHANGES_PRESERVED', 'Stop-Process',
  'Start-ScheduledTask', "APERION_CHROME_ATTACH_MODE",
  'FINANCIAL', 'GetListenerProcesses', 'source_verified=$sourceVerified'
]) assert.ok(ps.includes(fragment), 'missing protection: ' + fragment);
assert.ok(!/addinvoice|cancelinvoice|approve_pending|update\s+bot_commands/i.test(ps),
  'safe installer must never call the finance write API or approve queue records');
console.log('PASS: seven pinned blobs, fixed launcher fingerprint, fail-closed finance checks (no write)');
