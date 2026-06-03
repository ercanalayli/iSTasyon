$ErrorActionPreference = 'Stop'

$TaskName = 'AperiON Mail Ekstre Bot'
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkDir = $Here
$Node = 'node.exe'
$Script = Join-Path $WorkDir 'mail-ekstre-worker-lite.js'
$LogDir = Join-Path $WorkDir 'logs'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (!(Test-Path $Script)) {
  throw "Worker bulunamadi: $Script"
}

$Action = New-ScheduledTaskAction -Execute $Node -Argument 'mail-ekstre-worker-lite.js' -WorkingDirectory $WorkDir
$TriggerStartup = New-ScheduledTaskTrigger -AtStartup
$TriggerLogin = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger @($TriggerStartup,$TriggerLogin) -Settings $Settings -Description 'AperiON alaylimedikal Gmail banka ekstre botu' -Force | Out-Null

Write-Host "OK: $TaskName kuruldu"
Write-Host "Test: cd $WorkDir ; npm run mail:check"
