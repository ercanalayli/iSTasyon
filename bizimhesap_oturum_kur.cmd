@echo off
cd /d "%~dp0"
set "NODE_PATH=%~dp0node_modules"
node bizimhesap_oturum_kur.cjs
