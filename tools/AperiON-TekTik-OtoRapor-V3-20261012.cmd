@echo off
setlocal DisableDelayedExpansion
title AperiON - Oto Rapor Tek Tik V3
rem Secret-free CMD launch beacon. An HTTP access log can prove only reachability,
rem not the device identity or full diagnostic completion.
if exist "%SystemRoot%\System32\curl.exe" (
  "%SystemRoot%\System32\curl.exe" --silent --max-time 8 --user-agent "AperiON-OneClick-Win-V3-Start" "https://iilfwosoroflzubkaryj.supabase.co/auth/v1/health?aperion_probe=v3_cmd_start" >nul 2>nul
)
set "APERION_SELF_FILE=%~f0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $all=[IO.File]::ReadAllText($env:APERION_SELF_FILE); $tag=':APERION_EMBEDDED_PAYLOAD_START'; $start=$all.LastIndexOf($tag); if($start -lt 0){exit 7}; $ps=$all.Substring($start+$tag.Length); & ([scriptblock]::Create($ps))"
exit /b %ERRORLEVEL%
:APERION_EMBEDDED_PAYLOAD_START
# AperiON / Windows read-only diagnosis and receipt
# Runs only on the existing user's Windows PC. No finance API, browser, daemon or source updates.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = 'C:\AperiON\iSTasyon'
$project = 'https://iilfwosoroflzubkaryj.supabase.co'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$runId = [guid]::NewGuid().ToString()
$folder = Join-Path $root ('local-secrets\safe-updates\diagnostic-' + $stamp)
$backup = Join-Path $folder 'backup'
$reportPath = Join-Path $folder 'diagnostic.json'
$targets = @(
  'tools/aperion_command_listener.cjs',
  'tools/aperion_runtime_7x24.cjs',
  'tools/bizimhesap_b2b_canonical.cjs'
)
function Info([string]$value) { Write-Host ('AperiON | ' + $value) }
function SafeFileReport([string]$rel) {
  $file = Join-Path $root ($rel.Replace('/', '\'))
  if (!(Test-Path -LiteralPath $file -PathType Leaf)) {
    return [pscustomobject]@{ file = $rel; present = $false; backed_up = $false; git_tracked = $false; git_hash = $null; git_head_hash = $null; syntax_ok = $false; guards_ok = $false }
  }
  $saved = Join-Path $backup ($rel.Replace('/', '\'))
  New-Item -ItemType Directory -Path (Split-Path -Parent $saved) -Force | Out-Null
  Copy-Item -LiteralPath $file -Destination $saved -ErrorAction Stop
  $savedHash = (Get-FileHash -LiteralPath $saved -Algorithm SHA256).Hash
  $sourceHash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
  if ($savedHash -ne $sourceHash) { throw 'BACKUP_HASH_MISMATCH' }

  $index = @(& git.exe -C $root ls-files --cached -- $rel)
  if ($LASTEXITCODE -ne 0) { throw 'GIT_INDEX_QUERY_FAILED' }
  $tracked = @($index | Where-Object { [string]$_ -ceq $rel }).Count -eq 1
  $sha = (& git.exe hash-object $file).Trim()
  if ($LASTEXITCODE -ne 0 -or !$sha) { throw 'GIT_HASH_FAILED' }
  $headHash = $null
  if ($tracked) {
    # Avoid exposing native Git errors or source content to the receipt.
    $headOutput = @(& git.exe -C $root rev-parse --verify ("HEAD:" + $rel) 2>$null)
    if ($LASTEXITCODE -eq 0 -and $headOutput.Count) { $headHash = [string]$headOutput[0] }
  }
  $syntax = $false
  try {
    & node.exe --check $file 1>$null 2>$null
    $syntax = ($LASTEXITCODE -eq 0)
  } catch { $syntax = $false }
  $safety = $false
  $content = [IO.File]::ReadAllText($file)
  if ($rel -eq 'tools/bizimhesap_b2b_canonical.cjs') {
    $safety = $content.Contains('guardSingleInvoiceAttempt') -and
      $content.Contains('params.approved !== true') -and
      $content.Contains("authMode: 'token-header'")
  } elseif ($rel -eq 'tools/aperion_command_listener.cjs') {
    $safety = $content.Contains('claimPendingBotCommand(db, cmd.id)') -and
      $content.Contains('bizimhesapB2BPostApprovedInvoice')
  } else {
    $safety = $content.Contains('superviseSupabaseListener')
  }
  return [pscustomobject]@{ file = $rel; present = $true; backed_up = $true; git_tracked = $tracked; git_hash = $sha; git_head_hash = $headHash; syntax_ok = $syntax; guards_ok = [bool]$safety }
}
function GetAuth {
  $envFile = Join-Path $root 'local-secrets\bizimhesap.local.env'
  if (!(Test-Path -LiteralPath $envFile -PathType Leaf)) { throw 'EXISTING_CONFIG_MISSING' }
  $values = @{}
  foreach ($line in [IO.File]::ReadAllLines($envFile)) {
    if ($line -match '^\s*(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*(.+?)\s*$') {
      $values[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
    }
  }
  if (!$values.SUPABASE_URL -or !$values.SUPABASE_SERVICE_ROLE_KEY -or $values.SUPABASE_URL.TrimEnd('/') -ne $project) { throw 'EXISTING_CONFIG_MISMATCH' }
  $headers = @{ apikey = $values.SUPABASE_SERVICE_ROLE_KEY; Prefer = 'return=minimal' }
  if ($values.SUPABASE_SERVICE_ROLE_KEY -match '^eyJ[^.]+\.[^.]+\.[^.]+$') {
    $headers.Authorization = 'Bearer ' + $values.SUPABASE_SERVICE_ROLE_KEY
  } elseif (!$values.SUPABASE_SERVICE_ROLE_KEY.StartsWith('sb_secret_')) {
    throw 'EXISTING_KEY_MODE_UNKNOWN'
  }
  return $headers
}
# Earliest possible authenticated signal: if the file runs and the existing
# service key works, the operator can observe STARTED before file checks.
# Never include local source, key, token, file content or exception text.
$headers = $null
try {
  $headers = GetAuth
  $startReceipt = @{
    run_id = [guid]::NewGuid().ToString()
    report_version = '2026-10-12-v3'
    result_kind = 'SAFE_READ_ONLY_DIAGNOSTIC'
    backup_ok = $false
    files = @()
    message_code = 'STARTED'
    finance_writes = 0
  }
  $startBody = [Text.Encoding]::UTF8.GetBytes(($startReceipt | ConvertTo-Json -Depth 5 -Compress))
  $null = Invoke-RestMethod -Uri ($project + '/rest/v1/aperion_windows_diagnostics_v1') -Method Post -Headers $headers -UserAgent 'AperiON-Windows-Backend/1.0' -MaximumRedirection 0 -ContentType 'application/json; charset=utf-8' -Body $startBody -TimeoutSec 12
} catch {
  # Nonfatal: final receipt retry stays enabled. Never echo response/credentials.
}
$reports = @()
$code = 'OK'
try {
  foreach ($binary in @('git.exe','node.exe')) {
    if (!(Get-Command $binary -ErrorAction SilentlyContinue)) { throw ('MISSING_' + $binary) }
  }
  New-Item -ItemType Directory -Path $backup -Force | Out-Null
  foreach ($rel in $targets) { $reports += SafeFileReport $rel }
} catch {
  # Deliberately never upload untrusted exception text (may contain file/secret data).
  $code = 'LOCAL_READ_OR_BACKUP_FAILED'
}
$backupOk = @($reports | Where-Object { !$_.backed_up }).Count -eq 0 -and $reports.Count -eq 3
$receipt = @{
  run_id = $runId
  report_version = '2026-10-12-v3'
  result_kind = $(if ($code -eq 'OK') { 'SAFE_READ_ONLY_DIAGNOSTIC' } else { 'LOCAL_CHECK_FAILED' })
  backup_ok = [bool]$backupOk
  files = @($reports)
  message_code = $code
  finance_writes = 0
}
try {
  New-Item -ItemType Directory -Path $folder -Force | Out-Null
  # Local receipt is explicitly allowlisted, no credentials, source, file contents or logs.
  ($receipt | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath $reportPath -Encoding UTF8
  $headers = GetAuth
  $uri = $project + '/rest/v1/aperion_windows_diagnostics_v1'
  $json = $receipt | ConvertTo-Json -Depth 8 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $delivered = $false
  foreach ($retryWait in @(0,2,5,10)) {
    if ($retryWait -gt 0) { Start-Sleep -Seconds $retryWait }
    try {
      $null = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -UserAgent 'AperiON-Windows-Backend/1.0' -MaximumRedirection 0 -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 20
      $delivered = $true
      break
    } catch {
      # Do not echo server errors, response bodies or secrets.
    }
  }
  if (!$delivered) { throw 'AUTOMATIC_DELIVERY_FAILED' }
  Info 'TANI RAPORU SUPABASE UZERINDEN ILETILDI.'
  Info 'Sonraki mesajinizda yalniz DEVAM yazin; raporu bagli veritabanindan okuyacagim.'
  Info 'Yerel kaynak dosyalari degistirilmedi. Finansal islem yok.'
} catch {
  Info 'TANI RAPORU UZAGA ILETILEMEDI. Yerel rapor saklandi.'
  Info ('Kayit: ' + $reportPath)
  Info 'API anahtari, kod veya sifre paylasmayin.'
  exit 1
}
