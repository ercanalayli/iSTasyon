'use strict';
const fs = require('node:fs'), assert = require('node:assert/strict'), path = require('node:path');
const cmd = fs.readFileSync(path.join(__dirname, 'AperiON-TekTik-OtoRapor-20261012.cmd'), 'utf8');
const marker=':APERION_EMBEDDED_PAYLOAD_START';
const last=cmd.lastIndexOf(marker);
assert.ok(last > 0 && cmd.indexOf(marker)!==last,'embedded payload marker must follow launcher');
const ps=cmd.slice(last+marker.length);
assert.ok(cmd.includes('set "APERION_SELF_FILE=%~f0"'), 'launcher must execute its own file');
assert.ok(!cmd.includes('Invoke-WebRequest'), 'bootstrap must work without downloading a second file');
assert.ok(!cmd.includes('raw.githubusercontent.com'), 'no GitHub fetch during execution');
for(const s of ['aperion_windows_diagnostics_v1', 'GetExistingHeaders','Get-FileHash','Copy-Item -LiteralPath $file',
'git.exe -C $root ls-files --cached -- $rel','node.exe --check $file','finance_writes = 0',
'params.approved !== true','claimPendingBotCommand(db, cmd.id)',"authMode: 'token-header'",
"Invoke-RestMethod -Uri $uri -Method Post","-MaximumRedirection 0", "AperiON-Windows-Backend/1.0",
'if (!$delivered)', 'GetAuth']) assert.ok(ps.includes(s),'missing safety: '+s);
assert.ok(!/git(?:\.exe)?\s+(?:reset|checkout|clean)|Stop-Process|Start-ScheduledTask|addInvoice\s*\(|approve_pending/i.test(ps),'forbidden write');
assert.ok(ps.includes("'https://iilfwosoroflzubkaryj.supabase.co'"),'fixed Supabase project');
assert.ok(!ps.includes('TELEGRAM_BOT_TOKEN') && !ps.includes('GITHUB_TOKEN'),'no new external services');
assert.ok(cmd.indexOf('exit /b %ERRORLEVEL%') < last,'CMD must exit before payload');
console.log('PASS: self-contained launcher, fixed private destination, no source/finance writes');
