param(
  [string]$Account = '*IS BANKASI',
  [int]$MaxPages = 25,
  [string]$Out = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$passwordFile = Join-Path $root '.aperion-secrets\bizimhesap_password.secure'
$profile = 'C:\Users\HP\Desktop\ErpaltH\.bizimhesap-profile'

if (-not (Test-Path -LiteralPath $passwordFile)) { throw 'Sifreli BizimHesap parolasi bulunamadi.' }
if (-not (Test-Path -LiteralPath $profile)) { throw 'BizimHesap kalici oturum profili bulunamadi.' }

$secure = Get-Content -LiteralPath $passwordFile -Raw | ConvertTo-SecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:BIZIMHESAP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $env:BIZIMHESAP_PROFILE_DIR = $profile
  Set-Location $root
  $nodeArgs = @((Join-Path $root 'bizimhesap_banka_gecmis_oku.cjs'), '--account', $Account, '--max-pages', $MaxPages)
  if ($Out) { $nodeArgs += @('--out', $Out) }
  & node @nodeArgs
  exit $LASTEXITCODE
} finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  Remove-Item Env:BIZIMHESAP_PASSWORD -ErrorAction SilentlyContinue
}
