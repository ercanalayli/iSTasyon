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
  if ($cfg.SUPABASE_URL -notmatch '^https://[a-z0-9-]+\.supabase\.co/?$') {
    throw 'BLOCKED_UNEXPECTED_DATABASE_URL'
  }
  return $cfg
}
function QueueSnapshot($cfg) {
  $headers = @{
    apikey = $cfg.SUPABASE_SERVICE_ROLE_KEY
    Authorization = 'Bearer ' + $cfg.SUPABASE_SERVICE_ROLE_KEY
  }
  $uri = $cfg.SUPABASE_URL.TrimEnd('/') +
    '/rest/v1/bot_commands?select=id,command,status&status=in.%28pending,processing%29&limit=201'
  return @(Invoke-RestMethod -Method Get -Uri $uri -Headers $headers -TimeoutSec 18)
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
  $cfg = ReadConfig
  $initialProcesses = @(GetListenerProcesses)
  if ($initialProcesses.Count -gt 1) { throw 'BLOCKED_MULTIPLE_EXISTING_LISTENERS' }
  $null = AssertSafeQueue $cfg
  $repoCheck = (& git.exe -C $Root rev-parse --is-inside-work-tree 2>$null)
  if ($LASTEXITCODE -ne 0 -or $repoCheck.Trim() -ne 'true') {
    throw 'BLOCKED_WORKSPACE_IS_NOT_GIT_CHECKOUT'
  }
  foreach ($rel in $Targets.Keys) {
    $path = Join-Path $Root (Rel $rel)
    if (Test-Path -LiteralPath $path) {
      $changes = @(& git.exe -C $Root status --porcelain -- $rel)
      if ($LASTEXITCODE -ne 0 -or ($changes -join '').Trim()) {
        throw ('BLOCKED_LOCAL_CHANGES_PRESERVED: ' + $rel)
      }
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
  $task = Get-ScheduledTask -TaskName 'AperiON_Watchdog_1Min' -ErrorAction Stop
  if ($task.State -eq 'Disabled') { throw 'BLOCKED_UNIFIED_WATCHDOG_DISABLED' }
  # Startup uses existing configured supervisor and only an authenticated
  # Chrome broker (ATTACH-ONLY). No second login or new browser profile.
  $env:APERION_CHROME_ATTACH_MODE = 'ATTACH-ONLY'
  try {
    Start-ScheduledTask -TaskName 'AperiON_Watchdog_1Min'
    $alive = $false
    for ($i = 0; $i -lt 24; $i++) {
      Start-Sleep -Seconds 5
      if (@(GetListenerProcesses).Count -eq 1) { $alive = $true; break }
    }
    if (!$alive) { throw 'BLOCKED_LISTENER_NOT_RUNNING_AFTER_UNIFIED_WATCHDOG' }
  } finally { Remove-Item Env:APERION_CHROME_ATTACH_MODE -ErrorAction SilentlyContinue }
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
