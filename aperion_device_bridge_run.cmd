@echo off
cd /d "%~dp0"
if not exist "local-secrets\aperion-device.env" node tools\aperion_device_bridge.cjs --enroll-from-request >> logs\aperion-device-bridge.log 2>&1
if not exist "local-secrets\aperion-device.env" exit /b 1
node tools\aperion_device_bridge.cjs >> logs\aperion-device-bridge.log 2>&1
