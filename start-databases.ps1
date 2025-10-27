#!/usr/bin/env pwsh

Write-Host "🚀 Starting PostgreSQL and Redis services..." -ForegroundColor Green
Write-Host ""

# Check if PostgreSQL is running
$pgRunning = Get-Process -Name "postgres" -ErrorAction SilentlyContinue
if ($pgRunning) {
    Write-Host "✅ PostgreSQL is already running" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL is not running" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 To start PostgreSQL:" -ForegroundColor Yellow
    Write-Host "   Option 1: Install PostgreSQL locally and start the service"
    Write-Host "   Option 2: Use Docker Desktop and run:"
    Write-Host "            docker run --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=multi_agent_platform -p 5432:5432 -d postgres:15"
    Write-Host "   Option 3: Use cloud database (Supabase, AWS RDS, etc.)"
    Write-Host ""
}

# Check if Redis is running
$redisRunning = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
if ($redisRunning) {
    Write-Host "✅ Redis is already running" -ForegroundColor Green
} else {
    Write-Host "❌ Redis is not running" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 To start Redis:" -ForegroundColor Yellow
    Write-Host "   Option 1: Install Redis locally"
    Write-Host "   Option 2: Use Docker Desktop and run:"
    Write-Host "            docker run --name redis -p 6379:6379 -d redis:7"
    Write-Host "   Option 3: Use cloud service (Redis Cloud, AWS ElastiCache, etc.)"
    Write-Host ""
    Write-Host "⚠️  Note: Redis is optional. The app can run without it." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Connection strings:" -ForegroundColor Blue
Write-Host "   PostgreSQL: postgresql://postgres:postgres@localhost:5432/multi_agent_platform"
Write-Host "   Redis: redis://localhost:6379"
Write-Host ""
Write-Host "🧪 Test database connection:" -ForegroundColor Blue
Write-Host "   cd packages/backend"
Write-Host "   npx ts-node src/setup-local-db.ts"
Write-Host ""

# Test if we can connect to PostgreSQL
Write-Host "🔍 Testing PostgreSQL connection..." -ForegroundColor Blue
try {
    $result = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
    if ($result.TcpTestSucceeded) {
        Write-Host "✅ PostgreSQL port 5432 is accessible" -ForegroundColor Green
    } else {
        Write-Host "❌ PostgreSQL port 5432 is not accessible" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Cannot test PostgreSQL connection" -ForegroundColor Red
}

# Test if we can connect to Redis
Write-Host "🔍 Testing Redis connection..." -ForegroundColor Blue
try {
    $result = Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue
    if ($result.TcpTestSucceeded) {
        Write-Host "✅ Redis port 6379 is accessible" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis port 6379 is not accessible" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Cannot test Redis connection" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 If both services are running, start the full application:" -ForegroundColor Green
Write-Host "   Backend:  cd packages/backend && npm run dev"
Write-Host "   Frontend: cd packages/frontend && npm run dev"