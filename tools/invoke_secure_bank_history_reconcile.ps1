param(
  [string[]]$NodeArgs
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$secretFile = Join-Path $root '.aperion-secrets\supabase_service_role.secure'

if (-not (Test-Path -LiteralPath $secretFile)) {
  throw 'Sifreli Supabase servis anahtari yok. Once tools\set_local_supabase_service_role.ps1 calistirilmalidir.'
}

$secure = Get-Content -LiteralPath $secretFile -Raw | ConvertTo-SecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $env:NODE_PATH = Join-Path $root 'node_modules'
  Set-Location $root
  & node (Join-Path $root 'tools\reconcile_historical_bank_statements_v106.cjs') @NodeArgs
  exit $LASTEXITCODE
} finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
}
