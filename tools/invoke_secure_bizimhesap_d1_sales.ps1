param(
  [datetime]$StartDate = (Get-Date).Date.AddDays(-7),
  [datetime]$EndDate = (Get-Date).Date
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$bridgeSecretFile = Join-Path $root '.aperion-secrets\aperion_bridge_secret.secure'
$bizimHesapPasswordFile = Join-Path $root '.aperion-secrets\bizimhesap_password.secure'
$legacyProfile = 'C:\Users\HP\Desktop\ErpaltH\.bizimhesap-profile'
$logDir = Join-Path $root 'logs'
$logFile = Join-Path $logDir 'aperion_bizimhesap_d1_sales.log'

New-Item -ItemType Directory -Path $logDir -Force | Out-Null
foreach ($requiredPath in @($bridgeSecretFile, $legacyProfile)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    Add-Content -LiteralPath $logFile -Value "[$(Get-Date -Format s)] BLOCKED: required secure input is missing"
    throw "Gerekli guvenli girdi bulunamadi: $requiredPath"
  }
}

$bridgeSecure = Get-Content -LiteralPath $bridgeSecretFile -Raw | ConvertTo-SecureString
$bridgePtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($bridgeSecure)
$passwordPtr = [IntPtr]::Zero
try {
  $env:APERION_BRIDGE_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bridgePtr)
  if (Test-Path -LiteralPath $bizimHesapPasswordFile) {
    $passwordSecure = Get-Content -LiteralPath $bizimHesapPasswordFile -Raw | ConvertTo-SecureString
    $passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
    $env:BIZIMHESAP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
  }
  $env:BIZIMHESAP_PROFILE_DIR = $legacyProfile
  $env:APERION_PROJECT_DIR = $root
  $env:NODE_PATH = 'C:\Users\HP\Desktop\ErpaltH\node_modules'
  Set-Location $root

  $start = $StartDate.ToString('yyyy-MM-dd')
  $end = $EndDate.ToString('yyyy-MM-dd')
  Add-Content -LiteralPath $logFile -Value "[$(Get-Date -Format s)] START: BizimHesap -> D1 sales sync $start..$end"
  $ErrorActionPreference = 'Continue'
  & node (Join-Path $root 'tools\run_commonjs_file.cjs') (Join-Path $root 'bizimhesap_bot.js') --firma alayli --gecmis $start $end *>> $logFile
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  Add-Content -LiteralPath $logFile -Value "[$(Get-Date -Format s)] END: exit=$exitCode"
  exit $exitCode
} finally {
  if ($bridgePtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bridgePtr) }
  if ($passwordPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr) }
  Remove-Item Env:APERION_BRIDGE_SECRET -ErrorAction SilentlyContinue
  Remove-Item Env:BIZIMHESAP_PASSWORD -ErrorAction SilentlyContinue
}
