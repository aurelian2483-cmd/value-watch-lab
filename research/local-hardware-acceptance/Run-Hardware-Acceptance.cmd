@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 goto usepy
python -B hardware_acceptance.py %*
set "RESULT=%ERRORLEVEL%"
goto finished
:usepy
where py >nul 2>nul
if errorlevel 1 goto missing
py -3 -B hardware_acceptance.py %*
set "RESULT=%ERRORLEVEL%"
goto finished
:missing
echo Python 3.10 or newer is required. Nothing has been installed.
set "RESULT=2"
:finished
echo.
if "%RESULT%"=="0" (echo Requested fixed checks passed.) else (echo Review required. Read the generated report if available.)
if "%~1"=="" pause
exit /b %RESULT%
