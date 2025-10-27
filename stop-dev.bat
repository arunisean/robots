@echo off
echo ========================================
echo Stopping Web3 Trading Automation Platform
echo ========================================
echo.

echo Stopping backend and frontend servers...
taskkill /FI "WINDOWTITLE eq Backend Server*" /F 2>nul
taskkill /FI "WINDOWTITLE eq Frontend Server*" /F 2>nul
echo.

echo Stopping databases...
docker stop multi-agent-postgres multi-agent-redis 2>nul
echo.

echo ========================================
echo All services stopped!
echo ========================================
pause
