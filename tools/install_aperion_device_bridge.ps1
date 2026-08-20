$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$bridgeScript = Join-Path $PSScriptRoot 'aperion_device_bridge.cjs'
$runner = Join-Path $projectRoot 'aperion_device_bridge_run.cmd'
$logsDir = Join-Path $projectRoot 'logs'
$taskName = 'AperiON_Device_Bridge'

New-Item -ItemType Directory -Path $logsDir -Force | Out-Null

$secretFile = Join-Path $projectRoot 'local-secrets\aperion-device.env'
if (-not (Test-Path -LiteralPath $secretFile)) {
  & node $bridgeScript --prepare-enroll
  if ($LASTEXITCODE -ne 0) { throw 'AperiON tek kullanımlık eşleştirme isteği hazırlanamadı.' }
}

$startupMode = ''
try {
  $action = New-ScheduledTaskAction -Execute $env:ComSpec -Argument ('/c ""{0}""' -f $runner)
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 20 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 3650)
  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
  Start-ScheduledTask -TaskName $taskName
  $startupMode = 'ScheduledTask'
} catch {
  $runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
  New-Item -Path $runKey -Force | Out-Null
  New-ItemProperty -Path $runKey -Name 'AperiON_Device_Bridge' -PropertyType String -Value ('"{0}"' -f $runner) -Force | Out-Null
  Start-Process -FilePath $env:ComSpec -ArgumentList @('/c', ('"{0}"' -f $runner)) -WindowStyle Hidden
  $startupMode = 'HKCU-Run'
}

Write-Output ('AperiON cihaz köprüsü kuruldu. StartupMode={0}' -f $startupMode)
