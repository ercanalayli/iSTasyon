@echo off
setlocal EnableExtensions
title AperiON - Tek Tik Guvenli Tani
echo.
echo AperiON | Yerel kodu degistirmeden kontrol ve ozel Supabase raporu
echo Kodlar, sifreler, botlar ve Chrome korunur. Finansal islem yapilmaz.
echo.
where git.exe >nul 2>nul
if errorlevel 1 (
 echo DURDURULDU: Mevcut Git bulunamadi.
 pause
 exit /b 1
)
set "APERION_DIAG_PS1=%TEMP%\AperiON_Diagnostic_%RANDOM%_%RANDOM%.ps1"
powershell.exe -NoProfile -NonInteractive -Command "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; $url='https://raw.githubusercontent.com/ercanalayli/iSTasyon/1542ebdb66605ac5114e0fd3e65cb0d932fa41a5/tools/Read-AperiON-Local-Safety-20261012.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $env:APERION_DIAG_PS1 -TimeoutSec 30; $sha=(& git.exe hash-object $env:APERION_DIAG_PS1).Trim(); if($sha -ne '2c9c136a72f2aa2f68bb61352ec152d0adc3c9d8'){ throw 'BLOCKED_PINNED_SCRIPT_HASH_MISMATCH' }; Write-Host 'AperiON | Dogrulanmis tani betigi indirildi.'"
if errorlevel 1 (
 echo DURDURULDU: Betik indirilemedi veya imza dogrulanamadi.
 del /q "%APERION_DIAG_PS1%" >nul 2>nul
 pause
 exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%APERION_DIAG_PS1%"
set "RESULT=%ERRORLEVEL%"
del /q "%APERION_DIAG_PS1%" >nul 2>nul
if "%RESULT%"=="0" (
 echo Sonuc iletildi. ChatGPT'ye sadece DEVAM yazmaniz yeterli.
) else (
 echo Otomatik teslim basarisiz. Yerel rapor korundu.
)
pause
exit /b %RESULT%
