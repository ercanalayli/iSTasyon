# AperiON BizimHesap dinleyici bekcisi.
# Her calistiginda: aperion_command_listener.cjs zaten calisiyor mu diye bakar,
# calismiyorsa (cokmus, PC yeniden baslatilmis, elle kapatilmis) sessizce
# arka planda yeniden baslatir. Scheduled Task ile her 5 dakikada bir tetiklenir.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$logFile = Join-Path $root 'local-secrets\aperion_listener_watchdog.log'
$listenerScript = Join-Path $root 'tools\aperion_command_listener.cjs'
$listenerLog = Join-Path $root 'local-secrets\aperion_listener_run.log'

function W($msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Add-Content -Path $logFile -Value $line
}

$calisiyor = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*aperion_command_listener.cjs*' }

if ($calisiyor) {
  W "OK: dinleyici zaten calisiyor (PID $($calisiyor.ProcessId -join ','))."
  exit 0
}

W "UYARI: dinleyici calismiyor, yeniden baslatiliyor..."
Start-Process -FilePath 'node.exe' -ArgumentList "`"$listenerScript`"" -WorkingDirectory $root `
  -WindowStyle Hidden -RedirectStandardOutput $listenerLog -RedirectStandardError "$listenerLog.err"
W "Yeniden baslatildi."
