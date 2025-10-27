@echo off
echo 🚀 Starting PostgreSQL and Redis with Docker...
echo.

echo 📦 Starting PostgreSQL...
docker run --name multi-agent-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=multi_agent_platform -p 5432:5432 -d postgres:15

echo 📦 Starting Redis...
docker run --name multi-agent-redis -p 6379:6379 -d redis:7

echo.
echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak > nul

echo.
echo ✅ Database services started!
echo.
echo 📝 Connection strings:
echo    PostgreSQL: postgresql://postgres:postgres@localhost:5432/multi_agent_platform
echo    Redis: redis://localhost:6379
echo.
echo 🧪 Test the setup:
echo    cd packages/backend
echo    npx ts-node src/setup-local-db.ts
echo.
echo 🚀 Start the full server:
echo    npm run dev