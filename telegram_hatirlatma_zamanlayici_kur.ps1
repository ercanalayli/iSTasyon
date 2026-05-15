$ErrorActionPreference = "Stop"

$workDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$runner = Join-Path $workDir "telegram_hatirlatma_run.cmd"
$taskName = "AperiON Telegram Hatirlatma"

if (-not (Test-Path $runner)) {
  Write-Host "Calistirici bulunamadi: $runner" -ForegroundColor Red
  exit 1
}

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$runner`"" -WorkingDirectory $workDir
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "AperiON Telegram not, odeme ve tahsilat hatirlatma botu" -Force | Out-Null

Write-Host "$taskName kuruldu." -ForegroundColor Green
Write-Host "Test: npm run telegram:hatirlat" -ForegroundColor Cyan
