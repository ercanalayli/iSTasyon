param(
  [Parameter(Mandatory = $true)][string]$File,
  [switch]$Commit
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$secretFile = Join-Path $root '.aperion-secrets\supabase_service_role.secure'
if (-not (Test-Path -LiteralPath $secretFile)) { throw 'Sifreli Supabase servis anahtari bulunamadi.' }

$secure = Get-Content -LiteralPath $secretFile -Raw | ConvertTo-SecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $env:NODE_PATH = Join-Path $root 'node_modules'
  Set-Location $root
  $nodeArgs = @((Join-Path $root 'tools\import_vakifbank_statement_xlsx_v100.cjs'), '--file', $File)
  if ($Commit) { $nodeArgs += '--commit' }
  & node @nodeArgs
  exit $LASTEXITCODE
} finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
}
