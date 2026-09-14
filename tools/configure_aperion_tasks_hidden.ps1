$ErrorActionPreference = 'Stop'

function Set-VbsHiddenAction {
    param([string]$Name, [string]$Mode)
    $runner = 'C:\AperiON\iSTasyon\tools\aperion_hidden_task_runner.vbs'
    $task = Get-ScheduledTask -TaskName $Name -ErrorAction Stop
    $action = New-ScheduledTaskAction -Execute 'C:\Windows\System32\wscript.exe' -Argument "//B //Nologo `"$runner`" $Mode"
    $settings = $task.Settings
    $settings.Hidden = $true
    Set-ScheduledTask -TaskName $Name -Action $action -Settings $settings | Out-Null
}

Set-VbsHiddenAction 'AperiON BizimHesap Senkron' 'bizimhesap-sync'
Set-VbsHiddenAction 'AperiON_BizimHesap_D1_Satis_Saatlik' 'd1-sales-sync'
Set-VbsHiddenAction 'AperiON_BizimHesap_Listener_Watchdog' 'listener-watchdog'
Set-VbsHiddenAction 'AperiON_BizimHesap_Session_5Min' 'session-watchdog'
Set-VbsHiddenAction 'AperiON_EndToEnd_Monitor_5Min' 'e2e-monitor'
Set-VbsHiddenAction 'AperiON_Hermes_Watchdog_1Min' 'hermes-watchdog'
Set-VbsHiddenAction 'AperiON_Watchdog_1Min' 'watchdog'

foreach ($name in @(
    'AperiON_Startup',
    'Hermes_Gateway',
    'AperiON_BizimHesap_Listener_Watchdog',
    'AperiON_BizimHesap_Session_5Min',
    'AperiON_EndToEnd_Monitor_5Min',
    'AperiON_Hermes_Watchdog_1Min',
    'AperiON_Watchdog_1Min'
)) {
    $task = Get-ScheduledTask -TaskName $name -ErrorAction Stop
    $settings = $task.Settings
    $settings.Hidden = $true
    Set-ScheduledTask -TaskName $name -Settings $settings | Out-Null
}

foreach ($name in @(
    'AperiON Evening Check',
    'AperiON Morning Startup',
    'AperiON_Always_On',
    'AperiON_BizimHesap_Sabah_Ac',
    'AperiON_BizimHesap_Worker',
    'AperiON_Background_Worker',
    'AperiON_BizimHesap_ReadOnly_Retry_Once',
    'AperiON_BizimHesap_Realtime_Monitor',
    'AperiON_Morning_0730',
    'AperiON_Ofis_0800_Uyandir'
)) {
    Disable-ScheduledTask -TaskName $name -ErrorAction Stop | Out-Null
}

$resultPath = 'C:\AperiON\iSTasyon\state\windows-task-popup-fix-v4-result.json'
[ordered]@{
    completed_at = [DateTimeOffset]::Now.ToString('o')
    elevated = $true
    converted_to_hidden = @('AperiON BizimHesap Senkron', 'AperiON_BizimHesap_D1_Satis_Saatlik', 'AperiON_BizimHesap_Listener_Watchdog', 'AperiON_BizimHesap_Session_5Min', 'AperiON_EndToEnd_Monitor_5Min', 'AperiON_Hermes_Watchdog_1Min', 'AperiON_Watchdog_1Min')
    active_keep_hidden = @('AperiON_Startup', 'Hermes_Gateway')
    disabled_unneeded = @('AperiON Evening Check', 'AperiON Morning Startup', 'AperiON_Always_On', 'AperiON_BizimHesap_Sabah_Ac', 'AperiON_BizimHesap_Worker', 'AperiON_Background_Worker', 'AperiON_BizimHesap_ReadOnly_Retry_Once', 'AperiON_BizimHesap_Realtime_Monitor', 'AperiON_Morning_0730', 'AperiON_Ofis_0800_Uyandir')
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $resultPath -Encoding UTF8
