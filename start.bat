@echo off
echo Starting DynamicQR...
echo.
echo This will open 3 terminal windows:
echo   1. server
echo   2. client
echo.

REM Start Server in new window
echo Starting Server...
start "Server - DynamicQR" cmd /k "cd server && npm run dev"
timeout /t 2

REM Start Client Frontend in new window
echo Starting Client...
start "Client - DynamicQR" cmd /k "cd client && npm run dev"
timeout /t 2

echo.
echo All services started! Opening in browser...
echo.
echo client:    http://localhost:5173
echo server:    http://localhost:4100
echo.
timeout /t 3

REM Open browser windows
start http://localhost:5173
echo Ready to go!
