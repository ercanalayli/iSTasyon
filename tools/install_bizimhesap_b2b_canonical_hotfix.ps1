param(
  [string]$Repo = "C:\AperiON\iSTasyon"
)
$ErrorActionPreference = "Stop"

Set-Location $Repo

node --check .\tools\bizimhesap_b2b_canonical.cjs
if ($LASTEXITCODE -ne 0) { throw "bizimhesap_b2b_canonical.cjs syntax hatasi" }
node --check .\tools\aperion_command_listener.cjs
if ($LASTEXITCODE -ne 0) { throw "aperion_command_listener.cjs syntax hatasi" }

$running = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*aperion_command_listener.cjs*' })

foreach ($p in $running) {
  try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop } catch {}
}
Start-Sleep -Seconds 2

$started = $false
foreach ($task in @('AperiON_Watchdog_1Min','AperiON_BizimHesap_Listener_Watchdog')) {
  try {
    if (Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue) {
      Start-ScheduledTask -TaskName $task
      $started = $true
      Write-Host "Task tetiklendi: $task"
      break
    }
  } catch {}
}

Start-Sleep -Seconds 5
$after = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*aperion_command_listener.cjs*' })

if (!$after.Count) {
  $node = (Get-Command node.exe -ErrorAction Stop).Source
  Start-Process -FilePath $node -ArgumentList '"tools\aperion_command_listener.cjs"' -WorkingDirectory $Repo -WindowStyle Hidden
  Start-Sleep -Seconds 4
  $after = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*aperion_command_listener.cjs*' })
}

if (!$after.Count) { throw "AperiON BizimHesap listener baslatilamadi" }

Write-Host ("OK - AperiON BizimHesap listener PID: " + (($after | Select-Object -ExpandProperty ProcessId) -join ','))
Write-Host "Yeni komutlar: bizimhesap_b2b_health, bizimhesap_b2b_invoice"
