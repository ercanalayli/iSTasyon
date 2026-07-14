$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$secretFile = Join-Path $root '.aperion-secrets\supabase_service_role.secure'
$legacyProfile = 'C:\Users\HP\Desktop\ErpaltH\.bizimhesap-profile'
$logDir = Join-Path $root 'logs'
$logFile = Join-Path $logDir 'aperion_clone_task_stdout.log'

New-Item -ItemType Directory -Path $logDir -Force | Out-Null
if (-not (Test-Path -LiteralPath $secretFile)) {
  Add-Content -LiteralPath $logFile -Value "[$(Get-Date -Format s)] BLOCKED: encrypted Supabase service role secret is missing"
  throw 'Sifreli Supabase servis anahtari yok. Once tools\set_local_supabase_service_role.ps1 calistirilmalidir.'
}
if (-not (Test-Path -LiteralPath $legacyProfile)) {
  Add-Content -LiteralPath $logFile -Value "[$(Get-Date -Format s)] BLOCKED: BizimHesap persistent profile is missing"
  throw 'BizimHesap kalici oturum profili bulunamadi.'
}

$secure = Get-Content -LiteralPath $secretFile -Raw | ConvertTo-SecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $env:BIZIMHESAP_PROFILE_DIR = $legacyProfile
  $env:APERION_PROJECT_DIR = $root
  $env:NODE_PATH = Join-Path $root 'node_modules'
  Set-Location $root
  Add-Content -LiteralPath $logFile -Value "[$(Get-Date -Format s)] START: secure BizimHesap clone"
  & node (Join-Path $root 'local_bot\aperion_clone_retry_runner.js') *>> $logFile
  exit $LASTEXITCODE
} finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
}
