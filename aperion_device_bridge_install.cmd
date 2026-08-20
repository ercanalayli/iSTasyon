@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\install_aperion_device_bridge.ps1"
if errorlevel 1 (
  echo.
  echo AperiON kurulumu tamamlanamadi. Bu pencerenin ekran goruntusunu gonderin.
  pause
)
