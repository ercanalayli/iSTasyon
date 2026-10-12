@echo off
setlocal EnableExtensions
title AperiON - Guvenli Tek Tik Guncelleme
echo.
echo AperiON - Var olan Windows motoru guvenli guncelleme
echo Bu islem fatura / odeme / transfer kaydi yapmaz.
echo Mevcut dosyalar ve sifreler korunur.
echo.
where git.exe >nul 2>nul
if errorlevel 1 (
  echo DURDURULDU: Git kurulu degil.
  pause
  exit /b 1
)
set "APERION_TEMP_INSTALLER=%TEMP%\AperiON_SafeInstall_20261012_%RANDOM%.ps1"
powershell.exe -NoProfile -NonInteractive -Command "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; $p=$env:APERION_TEMP_INSTALLER; $u='https://raw.githubusercontent.com/ercanalayli/iSTasyon/b9376a8861ce26aec6eb1ae657fc1e97f19e1cf4/tools/Install-AperiON-Safe-OneClick-20261012.ps1'; Invoke-WebRequest -UseBasicParsing -Uri $u -OutFile $p -TimeoutSec 30; $hash=(& git.exe hash-object $p).Trim(); if($hash -ne 'ca2b8710b53a32590ceda0eb39386b2dacab5336'){throw 'PINNED_INSTALLER_HASH_MISMATCH'}; Write-Host 'AperiON: imzasi dogrulanan kurulum hazir.'"
if errorlevel 1 (
  echo DURDURULDU: guvenli kurulum indirilemedi ya da hash dogrulamadi.
  del /q "%APERION_TEMP_INSTALLER%" >nul 2>nul
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%APERION_TEMP_INSTALLER%"
set "RESULT=%ERRORLEVEL%"
del /q "%APERION_TEMP_INSTALLER%" >nul 2>nul
echo.
if "%RESULT%"=="0" (
  echo Kod guncellendi; motor sureci calisiyor.
  echo Fatura kaydi veya onay olusturulmadi.
) else (
  echo Guncelleme GUVENLI SEKILDE DURDURULDU.
  echo Hata sebebi yukarida yaziyor. Finansal islem yapilmadi.
)
echo.
pause
exit /b %RESULT%
