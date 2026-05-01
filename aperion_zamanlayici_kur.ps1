# AperiON - BizimHesap veri zamanlayici
# Yonetici PowerShell ile bir kez calistirilir.

$ErrorActionPreference = "Continue"

$kullanici = $env:USERNAME
$workDir = "C:\Users\$kullanici\Desktop\ErpaltH"
$botPath = Join-Path $workDir "bizimhesap_bot.js"
$runnerPath = Join-Path $workDir "aperion_bot_run.cmd"
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
$taskName = "AperiON_BizimHesap_Bot"

if (-not $nodePath) {
    Write-Host "Node.js bulunamadi." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $botPath)) {
    Write-Host "Bot dosyasi bulunamadi: $botPath" -ForegroundColor Red
    exit 1
}

@"
@echo off
cd /d $workDir
set NODE_PATH=$workDir\node_modules
node $botPath
"@ | Set-Content -LiteralPath $runnerPath -Encoding ASCII

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
schtasks /Delete /TN "AperiON_BizimHesap_Bot_0910" /F 2>$null | Out-Null
schtasks /Delete /TN "AperiON_BizimHesap_Bot_1230" /F 2>$null | Out-Null
schtasks /Delete /TN "AperiON_BizimHesap_Bot_1830" /F 2>$null | Out-Null
schtasks /Delete /TN "AperiON_BizimHesap_Bot_Acilis" /F 2>$null | Out-Null

$action = New-ScheduledTaskAction `
    -Execute $nodePath `
    -Argument "`"$botPath`"" `
    -WorkingDirectory $workDir

$startup = New-ScheduledTaskTrigger -AtLogOn -User $kullanici
$startup.Delay = "PT2M"

$morning = New-ScheduledTaskTrigger -Daily -At 09:10
$midday = New-ScheduledTaskTrigger -Daily -At 12:30
$evening = New-ScheduledTaskTrigger -Daily -At 18:30

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances IgnoreNew `
    -WakeToRun

try {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger @($startup, $morning, $midday, $evening) `
        -Settings $settings `
        -Description "AperiON BizimHesap satis verilerini acilista ve gun icinde eksik gun kontroluyle ceker." `
        -RunLevel Highest `
        -Force `
        -ErrorAction Stop
} catch {
    schtasks /Create /TN "AperiON_BizimHesap_Bot_0910" /TR $runnerPath /SC DAILY /ST 09:10 /F | Out-Null
    schtasks /Create /TN "AperiON_BizimHesap_Bot_1230" /TR $runnerPath /SC DAILY /ST 12:30 /F | Out-Null
    schtasks /Create /TN "AperiON_BizimHesap_Bot_1830" /TR $runnerPath /SC DAILY /ST 18:30 /F | Out-Null
    schtasks /Create /TN "AperiON_BizimHesap_Bot_Acilis" /TR $runnerPath /SC ONLOGON /F | Out-Null
}

Write-Host "AperiON zamanlayici kuruldu." -ForegroundColor Green
schtasks /query /tn "AperiON_BizimHesap_Bot_0910" /fo LIST 2>$null | findstr "TaskName"
schtasks /query /tn "AperiON_BizimHesap_Bot_1230" /fo LIST 2>$null | findstr "TaskName"
schtasks /query /tn "AperiON_BizimHesap_Bot_1830" /fo LIST 2>$null | findstr "TaskName"
schtasks /query /tn "AperiON_BizimHesap_Bot_Acilis" /fo LIST 2>$null | findstr "TaskName"
