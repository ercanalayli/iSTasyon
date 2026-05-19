$ErrorActionPreference = 'Stop'

$ProjectDir = 'C:\Users\HP\Desktop\ErpaltH'
$LogDir = Join-Path $ProjectDir 'logs'
$MorningBat = Join-Path $ProjectDir 'aperion_morning_start.bat'
$ShutdownBat = Join-Path $ProjectDir 'aperion_evening_shutdown.bat'
$SyncScript = Join-Path $ProjectDir 'aperion_veri_senkron.js'

if (!(Test-Path $ProjectDir)) { New-Item -ItemType Directory -Path $ProjectDir | Out-Null }
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

$morning = @"
@echo off
cd /d "$ProjectDir"
echo [%date% %time%] AperiON sabah kontrol basladi >> "$LogDir\aperion_office_pc.log"
node "$SyncScript" --firma alayli >> "$LogDir\aperion_office_pc.log" 2>&1
echo [%date% %time%] AperiON sabah kontrol bitti >> "$LogDir\aperion_office_pc.log"
"@
Set-Content -Path $MorningBat -Value $morning -Encoding ASCII

$shutdown = @"
@echo off
echo [%date% %time%] AperiON ofis bilgisayari kapanis komutu >> "$LogDir\aperion_office_pc.log"
shutdown /s /f /t 60 /c "AperiON ofis otomasyonu: 20:00 guvenli kapanis"
"@
Set-Content -Path $ShutdownBat -Value $shutdown -Encoding ASCII

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

$morningAction = New-ScheduledTaskAction -Execute $MorningBat
$morningTrigger = New-ScheduledTaskTrigger -Daily -At 09:05
Register-ScheduledTask -TaskName 'AperiON_Ofis_Sabah_Klon_Kontrol' -Action $morningAction -Trigger $morningTrigger -Settings $settings -Description '09:05 AperiON BizimHesap klon kontrolu ve veri senkronu.' -Force | Out-Null

$shutdownAction = New-ScheduledTaskAction -Execute $ShutdownBat
$shutdownTrigger = New-ScheduledTaskTrigger -Daily -At 20:00
Register-ScheduledTask -TaskName 'AperiON_Ofis_Aksam_Kapanis' -Action $shutdownAction -Trigger $shutdownTrigger -Settings $settings -Description '20:00 AperiON ofis bilgisayari guvenli kapanis.' -Force | Out-Null

Write-Host 'OK - AperiON ofis PC zamanlayici kuruldu.'
Write-Host 'Kurulan gorevler:'
Write-Host '- AperiON_Ofis_Sabah_Klon_Kontrol 09:05'
Write-Host '- AperiON_Ofis_Aksam_Kapanis 20:00'
Write-Host "Log: $LogDir\aperion_office_pc.log"
Write-Host ''
Write-Host 'Not: PC kendi kendine ACILMAK icin BIOS/UEFI RTC Wake veya Wake-on-LAN ayari ister. Windows gorevi PC kapaliyken baslatamaz.'
