$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$secretDir = Join-Path $root '.aperion-secrets'
$secretFile = Join-Path $secretDir 'supabase_service_role.secure'

if ((Test-Path -LiteralPath $secretFile) -and -not $Force) {
  Write-Host 'Sifreli Supabase servis anahtari zaten kayitli. Yenilemek icin -Force kullanin.' -ForegroundColor Yellow
  exit 0
}

New-Item -ItemType Directory -Path $secretDir -Force | Out-Null
$secret = Read-Host 'Supabase service_role key' -AsSecureString
if ($secret.Length -eq 0) { throw 'Bos servis anahtari kaydedilemez.' }

$secret | ConvertFrom-SecureString | Set-Content -LiteralPath $secretFile -NoNewline -Encoding ascii
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls $secretDir /inheritance:r /grant:r "${currentUser}:(OI)(CI)F" | Out-Null

Write-Host 'OK: Servis anahtari bu Windows kullanicisi icin sifreli kaydedildi.' -ForegroundColor Green
Write-Host 'Dosya: .aperion-secrets\supabase_service_role.secure'
