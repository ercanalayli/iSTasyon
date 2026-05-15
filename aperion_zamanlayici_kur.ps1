# AperiON - BizimHesap saatlik klon veri zamanlayici
# Yonetici PowerShell ile bir kez calistirilir.

$ErrorActionPreference = "Continue"

$kullanici = $env:USERNAME
$workDir = "C:\Users\$kullanici\Desktop\ErpaltH"
$syncPath = Join-Path $workDir "aperion_veri_senkron.js"
$runnerPath = Join-Path $workDir "aperion_bot_run.cmd"
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
$taskName = "AperiON_BizimHesap_Klon_Saatlik"

if (-not $nodePath) {
    Write-Host "Node.js bulunamadi." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $syncPath)) {
    Write-Host "Senkron dosyasi bulunamadi: $syncPath" -ForegroundColor Red
    exit 1
}

@"
@echo off
cd /d $workDir
set NODE_PATH=$workDir\node_modules
node $syncPath --firma alayli
"@ | Set-Content -LiteralPath $runnerPath -Encoding ASCII

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "AperiON_BizimHesap_Bot" -Confirm:$false -ErrorAction SilentlyContinue
schtasks /Delete /TN "AperiON_BizimHesap_Bot_0910" /F 2>$null | Out-Null
schtasks /Delete /TN "AperiON_BizimHesap_Bot_1230" /F 2>$null | Out-Null
schtasks /Delete /TN "AperiON_BizimHesap_Bot_1830" /F 2>$null | Out-Null
schtasks /Delete /TN "AperiON_BizimHesap_Bot_Acilis" /F 2>$null | Out-Null
schtasks /Delete /TN "AperiON_BizimHesap_Klon_Saatlik" /F 2>$null | Out-Null

$action = New-ScheduledTaskAction `
    -Execute $nodePath `
    -Argument "`"$syncPath`" --firma alayli" `
    -WorkingDirectory $workDir

$startup = New-ScheduledTaskTrigger -AtLogOn -User $kullanici
$startup.Delay = "PT2M"

$hourly = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date).Date.AddMinutes(5) `
    -RepetitionInterval (New-TimeSpan -Hours 1) `
    -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances IgnoreNew `
    -WakeToRun `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries

try {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger @($startup, $hourly) `
        -Settings $settings `
        -Description "AperiON BizimHesap klon verilerini acilista ve her saat satis, masraf, stok ve banka hazirliklariyla senkronlar." `
        -Force `
        -ErrorAction Stop
} catch {
    schtasks /Create /TN "AperiON_BizimHesap_Klon_Saatlik" /TR $runnerPath /SC HOURLY /MO 1 /F | Out-Null
    schtasks /Create /TN "AperiON_BizimHesap_Bot_Acilis" /TR $runnerPath /SC ONLOGON /F | Out-Null
}

Write-Host "AperiON saatlik BizimHesap klon zamanlayici kuruldu." -ForegroundColor Green
schtasks /query /tn "AperiON_BizimHesap_Klon_Saatlik" /fo LIST 2>$null | findstr "TaskName"
schtasks /query /tn "AperiON_BizimHesap_Bot_Acilis" /fo LIST 2>$null | findstr "TaskName"
