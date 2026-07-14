$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$taskName = 'AperiON_BizimHesap_Klon_Saatlik'
$runner = Join-Path $PSScriptRoot 'invoke_secure_bizimhesap_clone.ps1'
if (-not (Test-Path -LiteralPath $runner)) { throw "Runner bulunamadi: $runner" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`"" -WorkingDirectory $root
# A separate daily trigger for every hour survives reboots and avoids a
# fragile endless repetition trigger. :05 leaves room for other hourly jobs.
$hourlyTriggers = foreach ($hour in 0..23) {
  New-ScheduledTaskTrigger -Daily -At ('{0:D2}:05' -f $hour)
}
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $hourlyTriggers -Settings $settings -Principal $principal -Description 'AperiON: kalici BizimHesap oturumu ve sifreli Supabase yazma anahtariyla her saat veri klonu.' -Force | Out-Null
Enable-ScheduledTask -TaskName $taskName

Write-Host "OK: $taskName kuruldu ve etkin." -ForegroundColor Green
Write-Host 'Calisma saatleri: her saat :05 (Turkiye saati)'
Write-Host "Kod kok: $root"
