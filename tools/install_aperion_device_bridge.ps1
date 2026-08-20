$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$bridgeScript = Join-Path $PSScriptRoot 'aperion_device_bridge.cjs'
$runner = Join-Path $projectRoot 'aperion_device_bridge_run.cmd'
$logsDir = Join-Path $projectRoot 'logs'
$taskName = 'AperiON_Device_Bridge'

New-Item -ItemType Directory -Path $logsDir -Force | Out-Null

& node $bridgeScript --enroll
if ($LASTEXITCODE -ne 0) { throw 'AperiON cihaz eşleştirmesi başarısız oldu.' }

$action = New-ScheduledTaskAction -Execute $env:ComSpec -Argument ('/c ""{0}""' -f $runner)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 20 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 2

$task = Get-ScheduledTask -TaskName $taskName
$info = Get-ScheduledTaskInfo -TaskName $taskName
Write-Output ('AperiON cihaz köprüsü kuruldu. Task={0}; State={1}; LastResult={2}' -f $taskName, $task.State, $info.LastTaskResult)
