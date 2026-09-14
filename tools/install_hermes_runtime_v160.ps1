$ErrorActionPreference = 'Stop'
$runner = 'C:\AperiON\iSTasyon\tools\aperion_hidden_task_runner.vbs'
$primary = 'AperiON_Watchdog_1Min'
$action = New-ScheduledTaskAction -Execute 'C:\Windows\System32\wscript.exe' -Argument "//B //Nologo `"$runner`" runtime"
$task = Get-ScheduledTask -TaskName $primary -ErrorAction Stop
$settings = $task.Settings
$settings.Hidden = $true
$settings.MultipleInstances = 'IgnoreNew'
$settings.RestartCount = 3
$settings.RestartInterval = 'PT1M'
Set-ScheduledTask -TaskName $primary -Action $action -Settings $settings | Out-Null

$disabled = @(
  'AperiON_BizimHesap_Listener_Watchdog',
  'AperiON_BizimHesap_Session_5Min',
  'AperiON_EndToEnd_Monitor_5Min',
  'AperiON_Hermes_Watchdog_1Min'
)
foreach ($name in $disabled) { Disable-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue | Out-Null }

$proof = [ordered]@{
  installedAt = [DateTimeOffset]::Now.ToString('o')
  primaryTask = $primary
  action = 'wscript hidden -> aperion_runtime_7x24.cjs'
  consolidatedDisabled = $disabled
  preserved = @('AperiON_Startup','Hermes_Gateway','AperiON BizimHesap Senkron','AperiON_BizimHesap_D1_Satis_Saatlik')
  popupFree = $true
}
$proof | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath 'C:\AperiON\iSTasyon\state\hermes-runtime-task-install-v160.json' -Encoding UTF8
