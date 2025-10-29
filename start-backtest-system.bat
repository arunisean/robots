@echo off
echo ========================================
echo   Backtest System Quick Start
echo ========================================
echo.

echo Step 1: Starting Backend Server...
echo.
start "Backend Server" cmd /k "cd packages\backend && npm run dev"
timeout /t 3 /nobreak >nul

echo Step 2: Starting Frontend Server...
echo.
start "Frontend Server" cmd /k "cd packages\frontend && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Servers Starting!
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Management UI: http://localhost:3000/data-admin
echo.
echo Press any key to open browser...
pause >nul

start http://localhost:3000/data-admin

echo.
echo Servers are running in separate windows.
echo Close those windows to stop the servers.
echo.
pause
