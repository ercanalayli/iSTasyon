'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const ps = fs.readFileSync(path.join(root, 'tools/Install-AperiON-Safe-OneClick-20261012.ps1'), 'utf8');
const cmd = fs.readFileSync(path.join(root, 'tools/AperiON-TekTik-Guncelle-20261012.cmd'), 'utf8');
// On Windows Git can convert checked-out LF to CRLF. Compare canonical
// tracked blob identities and check that the worktree remains clean, rather
// than hashing autocrlf-transformed checkout bytes.
const canonicalSha = rel => execFileSync('git', ['rev-parse', 'HEAD:' + rel.replaceAll('\\', '/')], { cwd: root, encoding: 'utf8' }).trim();
const assertClean = rel => assert.equal(
  execFileSync('git', ['status', '--porcelain', '--', rel], { cwd: root, encoding: 'utf8' }).trim(),
  '', 'checkout differs from canonical tracked content: ' + rel
);
const manifests = [...ps.matchAll(/'([^']+\.(?:cjs|mjs))'\s*=\s*'([a-f0-9]{40})'/g)];
assert.equal(manifests.length, 7, 'seven code/test files are explicitly pinned');
for (const [, p, hash] of manifests) {
  const file = path.join(root, p);
  assert.ok(fs.existsSync(file), p);
  assertClean(p);
  assert.equal(canonicalSha(p), hash, 'pinned content does not match ' + p);
}
assert.match(cmd, /56dde134b6623bde13e208b2e843b97d6df6ea9e/);
assertClean('tools/Install-AperiON-Safe-OneClick-20261012.ps1');
assert.ok(cmd.includes(canonicalSha('tools/Install-AperiON-Safe-OneClick-20261012.ps1')),
  'bootstrap must pin installer git blob hash');
for (const fragment of [
  'AssertSafeQueue $cfg', 'BLOCKED_COMMAND_CURRENTLY_PROCESSING',
  'BLOCKED_UNREVIEWED_PENDING_FINANCIAL_OR_UNKNOWN_COMMAND',
  'BLOCKED_LOCAL_CHANGES_PRESERVED', 'Stop-Process',
  'Start-ScheduledTask', "APERION_CHROME_ATTACH_MODE",
  'FINANCIAL', 'GetListenerProcesses', 'source_verified=$sourceVerified',
  "StartsWith('sb_secret_')", "AUTH_MODE = 'secret_apikey_only'",
  'BLOCKED_SUPABASE_QUEUE_AUTH_401_',
  "& (Join-Path $Root 'tools\\aperion_listener_watchdog.ps1')"
]) assert.ok(ps.includes(fragment), 'missing protection: ' + fragment);
assert.ok(!/addinvoice|cancelinvoice|approve_pending|update\s+bot_commands/i.test(ps),
  'safe installer must never call the finance write API or approve queue records');

const queueRegion = ps.slice(ps.indexOf('function QueueSnapshot($cfg) {'),
  ps.indexOf('function AssertSafeQueue($cfg) {'));
assert.ok(queueRegion.includes("$headers = @{ apikey = $cfg.SUPABASE_SERVICE_ROLE_KEY }"));
assert.ok(queueRegion.includes("if ($cfg.AUTH_MODE -eq 'legacy_service_jwt')"));
assert.ok(queueRegion.includes("-UserAgent 'AperiON-Windows-Backend/1.0'"),
  'a non-browser server UA is essential: sb_secret_ rejects Mozilla/WindowsPowerShell default');
const requestLine = queueRegion.split('\n').find(line => line.includes('Invoke-RestMethod -Method Get'));
assert.ok(requestLine.includes("-UserAgent 'AperiON-Windows-Backend/1.0'"));
assert.ok(!requestLine.includes('Mozilla/5.0'));
assert.ok(queueRegion.includes("$headers.Authorization = 'Bearer ' + $cfg.SUPABASE_SERVICE_ROLE_KEY"));
assert.ok(!queueRegion.includes('Start-ScheduledTask'));
const initialRegion = ps.slice(ps.indexOf('  $cfg = ReadConfig'), ps.indexOf('  $repoCheck'));
assert.ok(initialRegion.includes('AssertSafeQueue'), 'fail closed before updating local code');


for (const token of [
  "BLOCKED_STAGED_LISTENER_CHANGES_PRESERVED",
  "BLOCKED_UNTRACKED_LISTENER_PRESERVED",
  "BLOCKED_LISTENER_MERGE_CONFLICT_LOCAL_FILE_UNTOUCHED",
  "BLOCKED_LISTENER_MERGE_SAFETY_GUARDS_MISSING",
  "git.exe merge-file",
  "Copy-Item -LiteralPath $local -Destination $ours -Force",
  "Copy-Item -LiteralPath $ours -Destination $theirs -Force",
  "$locallyMerged = $true"
]) assert.ok(ps.includes(token), 'missing local-edits safety: ' + token);
const stageMerge = ps.indexOf('& git.exe merge-file $ours $base $theirs');
const installCopy = ps.indexOf('Copy-Item -LiteralPath (Join-Path $stage (Rel $rel)) -Destination $target -Force');
assert.ok(stageMerge > 0 && installCopy > stageMerge, 'merge must precede any local file replacement');
// Smoke-test Git's 3-way merge behavior on fixtures WITHOUT running the installer.
const os = require('node:os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'aperion-safe-merge-'));
try {
 const b=path.join(tmp,'base.cjs'), o=path.join(tmp,'ours.cjs'), t=path.join(tmp,'theirs.cjs');
 fs.writeFileSync(b,'module.exports = {name: "orig", role: "base"};\n');
 fs.writeFileSync(o,'module.exports = {name: "ours", role: "base"};\n');
 fs.writeFileSync(t,'module.exports = {name: "theirs", role: "base"};\n');
 const cp=require('node:child_process');
 const x=cp.spawnSync('git',['merge-file',o,b,t],{encoding:'utf8'});
 assert.notEqual(x.status,0, 'conflicting local edits must stop instead of overwriting');
 assert.ok(fs.readFileSync(o,'utf8').includes('<<<<<<<'), 'conflict stays in stage only');
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }

console.log('PASS: seven pinned blobs, fixed launcher fingerprint, fail-closed finance checks (no write)');
