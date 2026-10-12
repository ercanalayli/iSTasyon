# AperiON | Single-click SAFE Windows update.
# Only updates pinned, Git-hash-verified source files in the existing workspace.
# Never posts an invoice, changes an approval, opens a second Chrome or starts a new daemon.
param([string]$Root = 'C:\AperiON\iSTasyon')
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Commit = '5854d758d25419bc5583067e6e4f43f077f050fa'
$Targets = [ordered]@{
  'tools/aperion_command_listener.cjs'         = 'd06e717ac06a51fea298f81d56bc8ba5b0155b82'
  'tools/bizimhesap_b2b_canonical.cjs'         = 'd52194b2500c7e1719500a965ac50dd249a374ca'
  'tools/lib/bot_command_safety.cjs'           = 'e3f494e4694d99299bfda721e56adce81613acbf'
  'tools/aperion_runtime_7x24.cjs'             = 'a46f16b2087a40f2c2c4e488895f05c1d4a99527'
  'tools/lib/supabase_listener_supervisor.cjs' = 'ccea529c784ddd19ee48bbc15ff95caa672f34e9'
  'tools/test_bot_command_safety.cjs'          = 'c54ef70b22209be83cb2f3342e35f509b6ec8c5e'
  'tools/test_supabase_listener_supervisor.cjs'= 'fdd4583713a5fc7f855cbb38cdae366ec53e9c34'
}
$AllowedPending = @(
  'bizimhesap_fetch', 'bizimhesap_health', 'bizimhesap_verify',
  'bizimhesap_b2b_health', 'bizimhesap_id_dogrula'
)
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$folder = Join-Path $Root ('local-secrets\safe-updates\' + $stamp)
$stage = Join-Path $folder 'stage'
$backup = Join-Path $folder 'backup'
$installed = $false
$sourceVerified = $false
$credentialMode = 'unknown'
$locallyMerged = $false
function Info([string]$s) { Write-Host ('AperiON | ' + $s) }
function Rel([string]$p) { return $p.Replace('/', '\') }
function GetListenerProcesses {
  return @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -like '*aperion_command_listener.cjs*' })
}
function ReadConfig {
  $file = Join-Path $Root 'local-secrets\bizimhesap.local.env'
  if (!(Test-Path -LiteralPath $file)) { throw 'BLOCKED_NO_EXISTING_SUPABASE_CONFIG' }
  $cfg = @{}
  foreach ($line in [IO.File]::ReadAllLines($file)) {
    if ($line -match '^\s*(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*(.+?)\s*$') {
      $cfg[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
    }
  }
  if (!$cfg.SUPABASE_URL -or !$cfg.SUPABASE_SERVICE_ROLE_KEY) {
    throw 'BLOCKED_SUPABASE_CONFIG_INCOMPLETE'
  }
  if ($cfg.SUPABASE_URL.TrimEnd('/') -ne 'https://iilfwosoroflzubkaryj.supabase.co') {
    throw 'BLOCKED_UNEXPECTED_SUPABASE_PROJECT'
  }
  # Secret API keys are opaque, not bearer JWTs.
  $key = [string]$cfg.SUPABASE_SERVICE_ROLE_KEY
  if ($key.StartsWith('sb_secret_')) {
    $cfg.AUTH_MODE = 'secret_apikey_only'
  } elseif ($key -match '^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$') {
    $cfg.AUTH_MODE = 'legacy_service_jwt'
  } else {
    throw 'BLOCKED_SUPABASE_KEY_FORMAT_UNRECOGNIZED'
  }
  $script:credentialMode = $cfg.AUTH_MODE
  return $cfg
}
function QueueSnapshot($cfg) {
  $headers = @{ apikey = $cfg.SUPABASE_SERVICE_ROLE_KEY }
  if ($cfg.AUTH_MODE -eq 'legacy_service_jwt') {
    $headers.Authorization = 'Bearer ' + $cfg.SUPABASE_SERVICE_ROLE_KEY
  } elseif ($cfg.AUTH_MODE -ne 'secret_apikey_only') {
    throw 'BLOCKED_SUPABASE_AUTH_MODE_NOT_SUPPORTED'
  }
  $uri = $cfg.SUPABASE_URL.TrimEnd('/') +
    '/rest/v1/bot_commands?select=id,command,status&status=in.%28pending,processing%29&limit=201'
  try {
    # Windows PowerShell's default User-Agent starts with Mozilla/5.0.
    # Supabase intentionally returns 401 for sb_secret_ keys used with
    # browser-looking User-Agents. This is a trusted LOCAL backend installer,
    # not a browser/client. Keep the real apikey + server-side privileges.
    return @(Invoke-RestMethod -Method Get -Uri $uri -Headers $headers -UserAgent 'AperiON-Windows-Backend/1.0' -TimeoutSec 18)
  } catch {
    $statusCode = 0
    try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
    if ($statusCode -eq 401) {
      throw ('BLOCKED_SUPABASE_QUEUE_AUTH_401_' + $cfg.AUTH_MODE + '_CHECK_EXISTING_LOCAL_CREDENTIAL')
    }
    if ($statusCode -eq 403) {
      throw ('BLOCKED_SUPABASE_QUEUE_FORBIDDEN_403_' + $cfg.AUTH_MODE)
    }
    # Never include API response: it could contain credentials.
    throw ('BLOCKED_SUPABASE_QUEUE_READ_HTTP_' + $statusCode)
  }
}
function AssertSafeQueue($cfg) {
  $rows = @(QueueSnapshot $cfg)
  if ($rows.Count -gt 200) { throw 'BLOCKED_TOO_MANY_QUEUED_COMMANDS' }
  $processing = @($rows | Where-Object { $_.status -eq 'processing' })
  if ($processing.Count) { throw 'BLOCKED_COMMAND_CURRENTLY_PROCESSING' }
  $unsafe = @($rows | Where-Object {
    $_.status -eq 'pending' -and ($AllowedPending -notcontains [string]$_.command)
  })
  if ($unsafe.Count) { throw 'BLOCKED_UNREVIEWED_PENDING_FINANCIAL_OR_UNKNOWN_COMMAND' }
  return $rows
}
function WriteResult([string]$state, [string]$detail) {
  $result = @{
    status=$state; detail=$detail; checkedAt=(Get-Date).ToString('o');
    source_commit=$Commit; source_verified=$sourceVerified; backup_path=$backup;
    credential_mode=$credentialMode; local_listener_merged=$locallyMerged;
    financial_writes=0; approvals_changed=0; new_browser_logins=0
  }
  $result | ConvertTo-Json -Depth 4 |
    Set-Content -LiteralPath (Join-Path $folder 'result.json') -Encoding UTF8
}
try {
  if (!(Test-Path (Join-Path $Root 'tools\aperion_command_listener.cjs'))) {
    throw 'BLOCKED_CANONICAL_WORKSPACE_NOT_FOUND'
  }
  if (!(Test-Path (Join-Path $Root 'tools\aperion_listener_watchdog.ps1'))) {
    throw 'BLOCKED_EXISTING_LISTENER_WATCHDOG_MISSING'
  }
  foreach ($binary in @('git.exe','node.exe','powershell.exe')) {
    if (!(Get-Command $binary -ErrorAction SilentlyContinue)) {
      throw ('BLOCKED_MISSING_' + $binary)
    }
  }
  New-Item -ItemType Directory -Path $folder -Force | Out-Null
  $cfg = ReadConfig
  $initialProcesses = @(GetListenerProcesses)
  if ($initialProcesses.Count -gt 1) { throw 'BLOCKED_MULTIPLE_EXISTING_LISTENERS' }
  $null = AssertSafeQueue $cfg
  $repoCheck = (& git.exe -C $Root rev-parse --is-inside-work-tree 2>$null)
  if ($LASTEXITCODE -ne 0 -or $repoCheck.Trim() -ne 'true') {
    throw 'BLOCKED_WORKSPACE_IS_NOT_GIT_CHECKOUT'
  }
  # A locally modified listener is not discarded: if possible, merge ONLY
  # non-conflicting edits from the existing Git checkout into a staged copy.
  # Staged/index changes cannot be safely reconstructed from the worktree.
  $dirtyListener = $false
  foreach ($rel in $Targets.Keys) {
    $target = Join-Path $Root (Rel $rel)
    if (!(Test-Path -LiteralPath $target)) { continue }
    $changes = @(& git.exe -C $Root status --porcelain -- $rel)
    if ($LASTEXITCODE -ne 0) { throw ('BLOCKED_LOCAL_GIT_STATUS_FAILED: ' + $rel) }
    if (($changes -join '').Trim()) {
      if ($rel -ne 'tools/aperion_command_listener.cjs') {
        throw ('BLOCKED_LOCAL_CHANGES_PRESERVED: ' + $rel)
      }
      & git.exe -C $Root diff --cached --quiet -- $rel
      if ($LASTEXITCODE -ne 0) { throw 'BLOCKED_STAGED_LISTENER_CHANGES_PRESERVED' }
      & git.exe -C $Root ls-files --error-unmatch -- $rel 1>$null 2>$null
      if ($LASTEXITCODE -ne 0) { throw 'BLOCKED_UNTRACKED_LISTENER_PRESERVED' }
      $dirtyListener = $true
      Info 'Local listener edits detected; trying conflict-free 3-way merge into STAGE only.'
    }
  }
  New-Item -ItemType Directory -Path $stage,$backup -Force | Out-Null
  foreach ($rel in $Targets.Keys) {
    $dest = Join-Path $stage (Rel $rel)
    New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force | Out-Null
    $url = 'https://raw.githubusercontent.com/ercanalayli/iSTasyon/' + $Commit + '/' + $rel
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $dest -TimeoutSec 30
    $sha = (& git.exe hash-object $dest).Trim()
    if ($LASTEXITCODE -ne 0 -or $sha -ne $Targets[$rel]) {
      throw ('BLOCKED_PINNED_SOURCE_HASH_MISMATCH: ' + $rel)
    }
  }
  if ($dirtyListener) {
    $rel = 'tools/aperion_command_listener.cjs'
    $local = Join-Path $Root (Rel $rel)
    $theirs = Join-Path $stage (Rel $rel)
    $ours = Join-Path $stage 'listener-user-merged.cjs'
    $base = Join-Path $stage 'listener-HEAD-base.cjs'
    Copy-Item -LiteralPath $local -Destination $ours -Force
    # Node saves the exact binary Git blob. PowerShell 5.1 redirection would
    # transform it to UTF-16, invalidating a textual 3-way merge.
    $saveBase = "const fs=require('fs');const cp=require('child_process');fs.writeFileSync(process.argv[1],cp.execFileSync('git',['-C',process.argv[2],'show','HEAD:tools/aperion_command_listener.cjs'],{maxBuffer:16*1024*1024}));"
    & node.exe -e $saveBase $base $Root
    if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $base)) {
      throw 'BLOCKED_LOCAL_GIT_BASE_UNAVAILABLE'
    }
    # Windows checkout may use CRLF while pinned Git blobs use LF.
    # Normalize only temporary copies, never the user's original file.
    $normalize = "const fs=require('fs');for(const file of process.argv.slice(1)){const s=fs.readFileSync(file,'utf8');if(s.includes('\u0000'))process.exit(3);fs.writeFileSync(file,s.replace(/\r\n/g,'\n'),'utf8')}"
    & node.exe -e $normalize $ours $base $theirs
    if ($LASTEXITCODE -ne 0) { throw 'BLOCKED_LISTENER_MERGE_NORMALIZATION_FAILED' }
    # git merge-file modifies OUR STAGED COPY, never the user's local file.
    & git.exe merge-file $ours $base $theirs
    if ($LASTEXITCODE -ne 0) {
      throw 'BLOCKED_LISTENER_MERGE_CONFLICT_LOCAL_FILE_UNTOUCHED'
    }
    $mergedText = [IO.File]::ReadAllText($ours)
    if (!$mergedText.Contains('claimPendingBotCommand(db, cmd.id)') -or
        !$mergedText.Contains('bizimhesapB2BPostApprovedInvoice')) {
      throw 'BLOCKED_LISTENER_MERGE_SAFETY_GUARDS_MISSING'
    }
    if ($mergedText.Contains('<<<<<<< ') -or $mergedText.Contains('>>>>>>> ')) {
      throw 'BLOCKED_LISTENER_MERGE_CONFLICT_MARKERS'
    }
    Copy-Item -LiteralPath $ours -Destination $theirs -Force
    $locallyMerged = $true
    Info 'Conflict-free listener merge prepared. User changes kept in staged candidate.'
  }
  foreach ($rel in $Targets.Keys) {
    & node.exe --check (Join-Path $stage (Rel $rel))
    if ($LASTEXITCODE -ne 0) { throw ('BLOCKED_SYNTAX_CHECK: ' + $rel) }
  }
  Push-Location $stage
  try {
    & node.exe 'tools/test_bot_command_safety.cjs'
    if ($LASTEXITCODE -ne 0) { throw 'BLOCKED_COMMAND_SAFETY_TEST' }
    & node.exe 'tools/test_supabase_listener_supervisor.cjs'
    if ($LASTEXITCODE -ne 0) { throw 'BLOCKED_SUPERVISOR_TEST' }
  } finally { Pop-Location }
  $sourceVerified = $true
  $null = AssertSafeQueue $cfg
  if (@(GetListenerProcesses).Count -gt 1) { throw 'BLOCKED_MULTIPLE_LISTENERS_BEFORE_INSTALL' }
  foreach ($rel in $Targets.Keys) {
    $target = Join-Path $Root (Rel $rel)
    if (Test-Path -LiteralPath $target) {
      $destination = Join-Path $backup (Rel $rel)
      New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
      Copy-Item -LiteralPath $target -Destination $destination -Force
    }
  }
  foreach ($rel in $Targets.Keys) {
    $target = Join-Path $Root (Rel $rel)
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $stage (Rel $rel)) -Destination $target -Force
  }
  $installed = $true
  Info 'Pinned source verified; original files backed up; security tests passed.'
  # No write-like pending work is permitted while performing a controlled restart.
  $null = AssertSafeQueue $cfg
  $running = @(GetListenerProcesses)
  if ($running.Count -gt 1) { throw 'BLOCKED_MULTIPLE_LISTENERS_BEFORE_RESTART' }
  if ($running.Count -eq 1) {
    Stop-Process -Id $running[0].ProcessId -Force
    Start-Sleep -Seconds 2
  }
  if (@(GetListenerProcesses).Count) { throw 'BLOCKED_LISTENER_DID_NOT_STOP' }
  # Start-ScheduledTask would not inherit ATTACH-ONLY from this process.
  # Launch the already installed watchdog directly with its scoped setting.
  $task = Get-ScheduledTask -TaskName 'AperiON_Watchdog_1Min' -ErrorAction Stop
  if ($task.State -eq 'Disabled') { throw 'BLOCKED_UNIFIED_WATCHDOG_DISABLED' }
  $env:APERION_CHROME_ATTACH_MODE = 'ATTACH-ONLY'
  try {
    & (Join-Path $Root 'tools\aperion_listener_watchdog.ps1')
    if (!$?) { throw 'BLOCKED_EXISTING_WATCHDOG_START_FAILED' }
    $alive = $false
    for ($i = 0; $i -lt 24; $i++) {
      Start-Sleep -Seconds 5
      if (@(GetListenerProcesses).Count -eq 1) { $alive = $true; break }
    }
    if (!$alive) { throw 'BLOCKED_LISTENER_NOT_RUNNING_AFTER_EXISTING_WATCHDOG' }
  } finally { Remove-Item Env:APERION_CHROME_ATTACH_MODE -ErrorAction SilentlyContinue }
  # Unified supervisor resumes on the normal schedule; no new task created.
  # A process health check is NOT ERP/queue proof: report this honestly.
  $remaining = @(QueueSnapshot $cfg)
  WriteResult 'UPDATED_PROCESS_RUNNING_QUEUE_NOT_YET_VERIFIED' (
    'Existing listener process observed. Pending queue count: ' + @($remaining).Count
  )
  Info 'Code deployed, listener process running. Queue and ERP readback remain separate verification.'
  Info ('Evidence: ' + (Join-Path $folder 'result.json'))
  exit 0
} catch {
  $reason = [string]$_.Exception.Message
  Info ('STOPPED: ' + $reason)
  if (Test-Path -LiteralPath $folder) {
    WriteResult $(if ($installed) { 'INSTALLED_BUT_HEALTH_NOT_VERIFIED' } else { 'NO_LIVE_FILES_CHANGED' }) $reason
    Info ('Evidence: ' + (Join-Path $folder 'result.json'))
  }
  exit 1
}
