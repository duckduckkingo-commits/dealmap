@echo off
title DealMap Website
cd /d "%~dp0"

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo Node.js is missing. Install it, then double-click again.
  pause
  exit /b 1
)

echo Starting DealMap website...
echo It will open in your browser at http://localhost:3100
timeout /t 4 /nobreak >nul
start "" "http://localhost:3100"
npm.cmd run start -- -p 3100
pause
