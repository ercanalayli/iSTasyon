$ErrorActionPreference='Stop'
$Here=Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Here
npm install
npm run preflight
powershell -ExecutionPolicy Bypass -File .\install-windows-mail-bot.ps1
powershell -ExecutionPolicy Bypass -File .\install-windows-mail-bot-every15.ps1
npm run mail:check
Write-Host 'OK: AperiON mail bot kurulum tamamlandi'
