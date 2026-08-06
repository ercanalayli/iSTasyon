$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$taskName = 'AperiON_BizimHesap_Listener_Watchdog'
$runner = Join-Path $PSScriptRoot 'aperion_listener_watchdog.ps1'
if (-not (Test-Path -LiteralPath $runner)) { throw "Watchdog script bulunamadi: $runner" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runner`"" -WorkingDirectory $root

# Her 5 dakikada bir, sinirsiz tekrar (365 gun boyunca) + PC acilista/logonda da tetiklenir.
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$repeatTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 3)
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($logonTrigger, $repeatTrigger) -Settings $settings -Principal $principal `
  -Description 'AperiON: BizimHesap komut dinleyicisi (aperion_command_listener.cjs) her zaman ayakta kalsin diye 5 dakikada bir saglik kontrolu yapar, dusmusse yeniden baslatir.' -Force | Out-Null
Enable-ScheduledTask -TaskName $taskName | Out-Null

Write-Host "OK: $taskName kuruldu ve etkin." -ForegroundColor Green
Start-ScheduledTask -TaskName $taskName
Write-Host 'Ilk kontrol tetiklendi.'
