$ErrorActionPreference = 'Stop'

$TaskName = 'AperiON BizimHesap Saatlik Veri Cekme'
$ProjectDir = 'C:\Users\HP\Desktop\ErpaltH'
$BotFile = Join-Path $ProjectDir 'bizimhesap_bot.js'
$LogDir = Join-Path $ProjectDir 'logs'
$RunFile = Join-Path $ProjectDir 'run_bizimhesap_hourly.bat'

if (!(Test-Path $ProjectDir)) {
  New-Item -ItemType Directory -Path $ProjectDir | Out-Null
}

if (!(Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}

$bat = @"
@echo off
cd /d "$ProjectDir"
echo [%date% %time%] AperiON BizimHesap bot basladi >> "$LogDir\bizimhesap_hourly.log"
node "$BotFile" >> "$LogDir\bizimhesap_hourly.log" 2>&1
echo [%date% %time%] AperiON BizimHesap bot bitti >> "$LogDir\bizimhesap_hourly.log"
"@

Set-Content -Path $RunFile -Value $bat -Encoding ASCII

$Action = New-ScheduledTaskAction -Execute $RunFile
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(7) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 3650)
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description 'AperiON icin BizimHesap verisini her saat bilgisayardan ceker.' -Force | Out-Null

Write-Host 'OK - AperiON BizimHesap saatlik gorev kuruldu.'
Write-Host "Task: $TaskName"
Write-Host "ProjectDir: $ProjectDir"
Write-Host "BotFile: $BotFile"
Write-Host "RunFile: $RunFile"
Write-Host "Log: $LogDir\bizimhesap_hourly.log"
