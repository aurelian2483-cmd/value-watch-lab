@echo off
setlocal
cd /d "%~dp0"
if not "%~1"=="" (
  echo This launcher only performs the no-network dry run.
  exit /b 2
)
where py >nul 2>nul
if not errorlevel 1 (
  py -3 -I -B client.py
  if errorlevel 1 exit /b 1
  exit /b 0
)
where python >nul 2>nul
if errorlevel 1 (
  echo Python 3.10 or newer is required. Nothing was installed.
  exit /b 2
)
python -I -B client.py
exit /b %errorlevel%
