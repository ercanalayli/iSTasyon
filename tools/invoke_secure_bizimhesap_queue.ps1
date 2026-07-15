param(
  [Parameter(Mandatory = $true)][string]$QueueId,
  [switch]$Save,
  [switch]$Retry,
  [switch]$RetryOnly,
  [switch]$ProbeTransfer,
  [switch]$ProbeExpense,
  [switch]$CorrectExpense
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$secretFile = Join-Path $root '.aperion-secrets\supabase_service_role.secure'
$passwordFile = Join-Path $root '.aperion-secrets\bizimhesap_password.secure'
$profileDir = 'C:\Users\HP\Desktop\ErpaltH\.bizimhesap-profile'
if (-not (Test-Path -LiteralPath $secretFile)) { throw 'Sifreli Supabase servis anahtari bulunamadi.' }
if (-not (Test-Path -LiteralPath $passwordFile)) { throw 'Sifreli BizimHesap parolasi bulunamadi.' }
if (-not (Test-Path -LiteralPath $profileDir)) { throw 'BizimHesap kalici oturum profili bulunamadi.' }

$serviceSecure = Get-Content -LiteralPath $secretFile -Raw | ConvertTo-SecureString
$passwordSecure = Get-Content -LiteralPath $passwordFile -Raw | ConvertTo-SecureString
$servicePtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($serviceSecure)
$passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
try {
  $env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($servicePtr)
  $env:BIZIMHESAP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
  $env:BIZIMHESAP_PROFILE_DIR = $profileDir
  $env:BIZIMHESAP_POSTING_LIVE = '1'
  $env:BIZIMHESAP_HEADLESS = 'false'
  $env:NODE_PATH = Join-Path $root 'node_modules'
  Set-Location $root
  if ($ProbeTransfer) {
    & node (Join-Path $root 'tools\probe_bizimhesap_transfer_form_v101.cjs')
    exit $LASTEXITCODE
  }
  if ($ProbeExpense) {
    & node (Join-Path $root 'tools\probe_bizimhesap_expense_record_v102.cjs') $QueueId
    exit $LASTEXITCODE
  }
  if ($CorrectExpense) {
    $correctionArgs = @((Join-Path $root 'tools\correct_bizimhesap_expense_account_v102.cjs'), $QueueId)
    if ($Save) { $correctionArgs += '--save' }
    & node @correctionArgs
    exit $LASTEXITCODE
  }
  if ($Retry) {
    & node (Join-Path $root 'tools\retry_bizimhesap_queue_row.cjs') $QueueId
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  if ($RetryOnly) {
    & node (Join-Path $root 'tools\retry_bizimhesap_queue_row.cjs') $QueueId
    exit $LASTEXITCODE
  }
  $nodeArgs = @((Join-Path $root 'bizimhesap_queue_worker.cjs'), '--firma', 'alayli', '--id', $QueueId, '--commit')
  if ($Save) {
    $env:BIZIMHESAP_POSTING_SAVE = '1'
    $nodeArgs += '--save'
  }
  & node @nodeArgs
  exit $LASTEXITCODE
} finally {
  if ($servicePtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($servicePtr) }
  if ($passwordPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr) }
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:BIZIMHESAP_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:BIZIMHESAP_POSTING_LIVE -ErrorAction SilentlyContinue
  Remove-Item Env:BIZIMHESAP_POSTING_SAVE -ErrorAction SilentlyContinue
}
