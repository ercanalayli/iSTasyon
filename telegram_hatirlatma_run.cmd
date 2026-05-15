@echo off
cd /d "%~dp0"
set NODE_PATH=%~dp0node_modules
node telegram_hatirlatma_bot.js --watch
