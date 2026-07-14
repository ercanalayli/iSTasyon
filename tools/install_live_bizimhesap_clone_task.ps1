$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$taskName = 'AperiON_BizimHesap_Klon_Saatlik'
$runner = Join-Path $PSScriptRoot 'invoke_secure_bizimhesap_clone.ps1'
if (-not (Test-Path -LiteralPath $runner)) { throw "Runner bulunamadi: $runner" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`"" -WorkingDirectory $root
$morning = New-ScheduledTaskTrigger -Daily -At 10:00
$evening = New-ScheduledTaskTrigger -Daily -At 17:00
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($morning, $evening) -Settings $settings -Principal $principal -Description 'AperiON: kalici BizimHesap oturumu ve sifreli Supabase yazma anahtariyla 10:00/17:00 veri klonu.' -Force | Out-Null
Enable-ScheduledTask -TaskName $taskName

Write-Host "OK: $taskName kuruldu ve etkin." -ForegroundColor Green
Write-Host 'Calisma saatleri: 10:00 ve 17:00 (Turkiye saati)'
Write-Host "Kod kok: $root"
