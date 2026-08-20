@echo off
cd /d "%~dp0"
node tools\aperion_device_bridge.cjs >> logs\aperion-device-bridge.log 2>&1
