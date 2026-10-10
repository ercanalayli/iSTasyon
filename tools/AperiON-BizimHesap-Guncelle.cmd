@echo off
setlocal EnableExtensions
title AperiON BizimHesap - Guvenli Guncelleme
echo.
echo AperiON | Mevcut Windows worker icin guvenli hotfix
echo Yalnizca GitHub'da test edilmis dosyalar indirilir.
echo Masraf/transfer kaydi yapilmaz.
echo.
where git.exe >nul 2>nul
if errorlevel 1 (
  echo DURDURULDU: Git bulunamadi.
  pause
  exit /b 1
)
set "SCRIPT=%TEMP%\aperion-bizimhesap-hotfix-33a491da.ps1"
powershell.exe -NoProfile -NonInteractive -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/ercanalayli/iSTasyon/33a491da34ffd0b96d4927f62d0a1e2ada38b1c2/tools/Install-AperiON-BizimHesap-Hotfix.ps1' -OutFile '%SCRIPT%' -TimeoutSec 30"
if errorlevel 1 (
  echo DURDURULDU: Guvenli kurulum dosyasi indirilemedi.
  pause
  exit /b 1
)
for /f "delims=" %%H in ('git hash-object "%SCRIPT%"') do set "ACTUAL=%%H"
if /I not "%ACTUAL%"=="141297208eba3e4eed16933635ed3f86d059d466" (
  echo DURDURULDU: Indirme dogrulamasi basarisiz. Dosya calistirilmadi.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "RESULT=%ERRORLEVEL%"
echo.
if "%RESULT%"=="0" (
  echo AperiON | Kod guncellemesi ve canli saglik testi BASARILI.
) else (
  echo AperiON | Islem DURDURULDU veya canli saglik testi gecmedi.
  echo Kritik finansal kayitlar tekrarlanmadi.
)
echo.
pause
exit /b %RESULT%
