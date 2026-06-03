$TaskName='AperiON Mail Ekstre Bot 15dk'
$Here=Split-Path -Parent $MyInvocation.MyCommand.Path
$Action=New-ScheduledTaskAction -Execute 'node.exe' -Argument 'mail-ekstre-worker-lite.js' -WorkingDirectory $Here
$Trigger=New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650)
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Description 'AperiON mail ekstre botu 15 dakikada bir' -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName
Write-Host 'OK: 15 dakika bot kuruldu ve baslatildi'
