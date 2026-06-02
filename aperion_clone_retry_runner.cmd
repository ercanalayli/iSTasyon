@echo off
set APERION_PROJECT_DIR=%~dp0
cd /d "%APERION_PROJECT_DIR%"
set NODE_PATH=%APERION_PROJECT_DIR%node_modules
if not exist "%APERION_PROJECT_DIR%logs" mkdir "%APERION_PROJECT_DIR%logs"
echo [%date% %time%] AperiON clone runner basladi >> "%APERION_PROJECT_DIR%logs\aperion_clone_task_stdout.log"
node "%APERION_PROJECT_DIR%local_bot\aperion_clone_retry_runner.js" >> "%APERION_PROJECT_DIR%logs\aperion_clone_task_stdout.log" 2>> "%APERION_PROJECT_DIR%logs\aperion_clone_task_stderr.log"
set EXITCODE=%ERRORLEVEL%
echo [%date% %time%] AperiON clone runner bitti code=%EXITCODE% >> "%APERION_PROJECT_DIR%logs\aperion_clone_task_stdout.log"
exit /b %EXITCODE%
