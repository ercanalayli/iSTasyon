@echo off
cd /d C:\Users\HP\Desktop\ErpaltH
set APERION_PROJECT_DIR=C:\Users\HP\Desktop\ErpaltH
set NODE_PATH=C:\Users\HP\Desktop\ErpaltH\node_modules
echo [%date% %time%] AperiON clone runner basladi >> C:\Users\HP\Desktop\ErpaltH\logs\aperion_clone_task_stdout.log
node C:\Users\HP\Desktop\ErpaltH\local_bot\aperion_clone_retry_runner.js >> C:\Users\HP\Desktop\ErpaltH\logs\aperion_clone_task_stdout.log 2>> C:\Users\HP\Desktop\ErpaltH\logs\aperion_clone_task_stderr.log
set EXITCODE=%ERRORLEVEL%
echo [%date% %time%] AperiON clone runner bitti code=%EXITCODE% >> C:\Users\HP\Desktop\ErpaltH\logs\aperion_clone_task_stdout.log
exit /b %EXITCODE%
