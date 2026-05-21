$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$envPath = Join-Path $root ".env"

if (-not (Test-Path -LiteralPath $envPath)) {
  @"
BIZIMHESAP_EMAIL=alaylimedikal@gmail.com
BIZIMHESAP_PASSWORD=
BIZIMHESAP_PROFILE_DIR=C:\Users\HP\Desktop\ErpaltH\.bizimhesap-profile
BIZIMHESAP_HEADLESS=true
"@ | Set-Content -LiteralPath $envPath -Encoding UTF8
}

$secure = Read-Host "Yeni BizimHesap sifresi" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

$lines = Get-Content -LiteralPath $envPath -ErrorAction SilentlyContinue
$found = $false
$updated = foreach ($line in $lines) {
  if ($line -match '^BIZIMHESAP_PASSWORD=') {
    $found = $true
    "BIZIMHESAP_PASSWORD=$password"
  } else {
    $line
  }
}

if (-not $found) {
  $updated += "BIZIMHESAP_PASSWORD=$password"
}

$updated | Set-Content -LiteralPath $envPath -Encoding UTF8
Write-Host "OK: .env guncellendi"
