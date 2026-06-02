@echo off
set APERION_PROJECT_DIR=%~dp0
cd /d "%APERION_PROJECT_DIR%"
set NODE_PATH=%APERION_PROJECT_DIR%node_modules
node "%APERION_PROJECT_DIR%aperion_veri_senkron.js" --firma alayli
