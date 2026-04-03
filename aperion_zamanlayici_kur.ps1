# AperiON - Görev Zamanlayıcı Kurulumu
# PowerShell'de YÖNETİCİ olarak çalıştırın

$kullanici = $env:USERNAME
$botPath = "C:\Users\$kullanici\Desktop\ErpaltH\bizimhesap_bot.js"
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source

if (-not $nodePath) {
    Write-Host "❌ Node.js bulunamadı! nodejs.org dan kurun." -ForegroundColor Red
    exit
}

$action = New-ScheduledTaskAction `
    -Execute $nodePath `
    -Argument $botPath `
    -WorkingDirectory "C:\Users\$kullanici\Desktop\ErpaltH"

$triggers = @()
09..19 | ForEach-Object {
    $triggers += New-ScheduledTaskTrigger -Daily -At "$($_):00"
}

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 15) `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName "AperiON_BizimHesap_Bot" `
    -Action $action `
    -Trigger $triggers `
    -Settings $settings `
    -Description "AperiON - Her saat 09-19 BizimHesap verisi ceker" `
    -RunLevel Highest `
    -Force

Write-Host ""
Write-Host "✅ AperiON Zamanlayıcı kuruldu!" -ForegroundColor Green
Write-Host "   09:00 - 19:00 arası her saat çalışır" -ForegroundColor Cyan
Write-Host "   Görev adı: AperiON_BizimHesap_Bot" -ForegroundColor Cyan
