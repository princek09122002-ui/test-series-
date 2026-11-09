@echo off
cd /d "%~dp0"
node scripts/start-local.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
start "" "http://localhost:3000/pyq"
