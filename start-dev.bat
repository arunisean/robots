@echo off
echo ========================================
echo Starting Web3 Trading Automation Platform
echo ========================================
echo.

echo [1/3] Starting databases (PostgreSQL + Redis)...
docker start multi-agent-postgres multi-agent-redis 2>nul
if errorlevel 1 (
    echo Databases not found, creating them...
    docker-compose up -d postgres redis
)
echo Waiting for databases to be ready...
timeout /t 5 /nobreak >nul
echo.

echo [2/3] Starting backend server...
start "Backend Server" cmd /k "cd packages\backend && npm run dev"
echo Waiting for backend to start...
timeout /t 3 /nobreak >nul
echo.

echo [3/3] Starting frontend server...
start "Frontend Server" cmd /k "cd packages\frontend && npm run dev"
echo.

echo ========================================
echo All services started!
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001
echo.
echo Press any key to exit (services will continue running)...
pause >nul
