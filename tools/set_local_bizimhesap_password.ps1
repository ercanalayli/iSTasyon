$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$secretDir = Join-Path $root '.aperion-secrets'
$secretFile = Join-Path $secretDir 'bizimhesap_password.secure'

New-Item -ItemType Directory -Path $secretDir -Force | Out-Null
$password = Read-Host 'BizimHesap parolasini girin (ekranda gorunmez)' -AsSecureString
if ($password.Length -eq 0) { throw 'Bos parola kaydedilemez.' }

$password | ConvertFrom-SecureString | Set-Content -LiteralPath $secretFile -Encoding ascii -NoNewline
& icacls $secretDir /inheritance:r /grant:r "$env:USERNAME:(OI)(CI)F" | Out-Null
Write-Host 'BizimHesap parolasi bu Windows kullanicisi icin sifreli kasaya kaydedildi.' -ForegroundColor Green
