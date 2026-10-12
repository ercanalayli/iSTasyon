'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
const psRel = 'tools/Read-AperiON-Local-Safety-20261012.ps1';
const cmdRel = 'tools/AperiON-TekTik-Tani-20261012.cmd';
const ps = fs.readFileSync(path.join(root,psRel),'utf8');
const cmd = fs.readFileSync(path.join(root,cmdRel),'utf8');
const blob = execFileSync('git',['hash-object',psRel],{cwd:root,encoding:'utf8'}).trim();
assert.equal(blob,'2c9c136a72f2aa2f68bb61352ec152d0adc3c9d8','diagnostic source changed; update pinned launcher hash');
assert.ok(cmd.includes(blob),'launcher must authenticate script blob');
assert.ok(cmd.includes('/1542ebdb66605ac5114e0fd3e65cb0d932fa41a5/'),'launcher must pin immutable commit');
assert.ok(cmd.includes('if($sha -ne'),'launcher must fail closed on mismatched Git blob');
assert.ok(ps.includes('$project = \'https://iilfwosoroflzubkaryj.supabase.co\''),'expected Supabase only');
for (const token of [
  'Get-FileHash -LiteralPath $saved', 'Get-FileHash -LiteralPath $file',
  'Copy-Item -LiteralPath $file -Destination $saved',
  'git.exe -C $root ls-files --cached -- $rel',
  'node.exe --check $file',
  'read-only', 'guardSingleInvoiceAttempt',
  'params.approved !== true', 'claimPendingBotCommand(db, cmd.id)',
  "authMode: 'token-header'", 'superviseSupabaseListener',
  'aperion_windows_diagnostics_v1', "Prefer = 'return=minimal'",
  "-UserAgent 'AperiON-Windows-Backend/1.0'",
  'finance_writes = 0', 'ConvertTo-Json -Depth 8',
  'EXISTING_CONFIG_MISMATCH'
]) assert.ok(ps.includes(token),'missing safe diagnostic guarantee '+token);
assert.ok(!/git\.exe\s+(?:reset|checkout|clean)|Stop-Process|Start-ScheduledTask|addinvoice|approve_pending|set-itemproperty/i.test(ps),'no live code/finance/process mutation');
assert.ok(!/git\.exe.*--error-unmatch/i.test(ps),'no unsafe PowerShell native stderr from untracked target');
assert.ok(ps.indexOf('Copy-Item -LiteralPath $file') < ps.indexOf('GetAuth'),'all files are backed up before upload');
console.log('PASS: pinned loader, existing-key private telemetry, no source upload or finance/process mutations');
