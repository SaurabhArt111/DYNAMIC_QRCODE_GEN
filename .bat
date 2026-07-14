@echo off
echo Starting DriftX services on network...
echo.
echo This will open 3 terminal windows:
echo   1. server
echo   3. client
echo.
timeout /t 2

REM Get the directory where this script is located
cd /d "%~dp0"

REM Start server in new window
echo Starting server...
start "server - Overlay Lounge" cmd /k "cd server && npm run dev"
timeout /t 2

REM Start Manager client in new window
echo Starting Manager...
start "client" cmd /k "cd client && npm run dev"
timeout /t 2
