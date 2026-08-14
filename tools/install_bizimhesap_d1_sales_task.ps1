$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$taskName = 'AperiON_BizimHesap_D1_Satis_Saatlik'
$runner = Join-Path $PSScriptRoot 'invoke_secure_bizimhesap_d1_sales.ps1'
if (-not (Test-Path -LiteralPath $runner)) { throw "Runner bulunamadi: $runner" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`"" -WorkingDirectory $root
$hourlyTriggers = foreach ($hour in 0..23) {
  New-ScheduledTaskTrigger -Daily -At ('{0:D2}:35' -f $hour)
}
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 20)
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $hourlyTriggers -Settings $settings -Principal $principal -Description 'AperiON: BizimHesap satislarini sifreli kasa ile Cloudflare D1 e saatlik aktarir.' -Force | Out-Null
Enable-ScheduledTask -TaskName $taskName

Write-Host "OK: $taskName kuruldu ve etkin." -ForegroundColor Green
Write-Host 'Calisma saatleri: her saat :35 (Turkiye saati)'
