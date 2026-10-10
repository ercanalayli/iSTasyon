param(
  [string]$Repo = "C:\AperiON\iSTasyon"
)
$ErrorActionPreference = "Stop"
$taskName = "AperiON_BizimHesap_Live_Reader"
$node = (Get-Command node.exe -ErrorAction Stop).Source
$script = Join-Path $Repo "tools\bizimhesap_live_reader.cjs"
if (!(Test-Path $script)) { throw "Script bulunamadi: $script" }
$action = New-ScheduledTaskAction -Execute $node -Argument ('"' + $script + '"') -WorkingDirectory $Repo
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 3
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName,State
