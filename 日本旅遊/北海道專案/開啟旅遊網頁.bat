@echo off
setlocal
cd /d "%~dp0"

if not exist "index.html" (
  echo 找不到入口頁：index.html
  exit /b 1
)

where python >nul 2>nul
if %errorlevel%==0 (
  python "%~dp0開啟旅遊網頁.py"
) else (
  start "" "%~dp0index.html"
)
