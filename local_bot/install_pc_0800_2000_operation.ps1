$ErrorActionPreference = 'Stop'

$LogDir = 'C:\Users\HP\Desktop\ErpaltH\logs'
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

$ShutdownTask = 'AperiON_Ofis_Aksam_2000_Kapanis'
$MorningTask = 'AperiON_Ofis_Sabah_0805_Klon_Kontrol'
$ProjectDir = 'C:\Users\HP\Desktop\ErpaltH'
$SyncScript = Join-Path $ProjectDir 'aperion_veri_senkron.js'
$MorningBat = Join-Path $ProjectDir 'aperion_0805_klon_kontrol.bat'

$MorningContent = @"
@echo off
cd /d "$ProjectDir"
echo [%date% %time%] AperiON 08:05 klon kontrol basladi >> "$LogDir\aperion_pc_operation.log"
node "$SyncScript" --firma alayli >> "$LogDir\aperion_pc_operation.log" 2>&1
echo [%date% %time%] AperiON 08:05 klon kontrol bitti >> "$LogDir\aperion_pc_operation.log"
"@
Set-Content -Path $MorningBat -Value $MorningContent -Encoding ASCII

$MorningAction = New-ScheduledTaskAction -Execute $MorningBat
$MorningTrigger = New-ScheduledTaskTrigger -Daily -At 08:05
$MorningSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $MorningTask -Action $MorningAction -Trigger $MorningTrigger -Settings $MorningSettings -Description 'AperiON: PC acildiktan sonra 08:05 BizimHesap Klonu kontrol/senkron.' -Force | Out-Null

$ShutdownAction = New-ScheduledTaskAction -Execute 'shutdown.exe' -Argument '/s /f /t 60 /c "AperiON otomatik kapanis: 20:00"'
$ShutdownTrigger = New-ScheduledTaskTrigger -Daily -At 20:00
$ShutdownSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable
Register-ScheduledTask -TaskName $ShutdownTask -Action $ShutdownAction -Trigger $ShutdownTrigger -Settings $ShutdownSettings -Description 'AperiON: Ofis bilgisayarini her gun 20:00 guvenli kapatir.' -Force | Out-Null

Write-Host 'OK - AperiON PC operasyon gorevleri kuruldu.'
Write-Host '08:05 klon kontrol gorevi: ' $MorningTask
Write-Host '20:00 kapanis gorevi: ' $ShutdownTask
Write-Host 'Log: C:\Users\HP\Desktop\ErpaltH\logs\aperion_pc_operation.log'
Write-Host ''
Write-Host 'ONEMLI: 08:00 PC acilisi Windows icinden kurulamaz. BIOS/UEFI RTC Wake ayari gerekir.'
Write-Host 'BIOS ayari: Resume by Alarm / RTC Wake / Automatic Power On = Enabled, Every Day, 08:00'
