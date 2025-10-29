#!/bin/bash

# Quick Start Script for Backtest System
# This script helps you get started with the backtest system

echo "🚀 Backtest System Quick Start"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from packages/backend directory"
    exit 1
fi

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
if ! npm list unzipper > /dev/null 2>&1; then
    echo "Installing unzipper..."
    npm install unzipper @types/unzipper
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Step 2: Check database connection
echo "🔌 Step 2: Checking database connection..."
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Warning: DATABASE_URL not set in environment"
    echo "   Please set it in .env file"
else
    echo "✅ DATABASE_URL is set"
fi
echo ""

# Step 3: Run migrations
echo "🗄️  Step 3: Running database migrations..."
echo "   Run: npm run db:migrate"
echo ""

# Step 4: Test the system
echo "🧪 Step 4: Testing the system..."
echo "   Run: npx tsx src/test-backtest-system.ts"
echo ""

# Step 5: Start the server
echo "🌐 Step 5: Starting the server..."
echo "   Run: npm run dev"
echo ""

# Step 6: Example API calls
echo "📡 Step 6: Example API calls"
echo ""
echo "Download data (from localhost):"
echo "curl -X POST http://localhost:3001/api/admin/data/download \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"marketType\": \"spot\","
echo "    \"symbols\": [\"BTCUSDT\"],"
echo "    \"intervals\": [\"1h\"],"
echo "    \"startDate\": \"2024-01-01\","
echo "    \"endDate\": \"2024-01-31\","
echo "    \"dataType\": \"klines\""
echo "  }'"
echo ""
echo "List datasets (from anywhere):"
echo "curl http://localhost:3001/api/data/datasets"
echo ""

echo "✅ Setup complete! Follow the steps above to get started."
echo ""
echo "📚 For more information, see:"
echo "   - BACKTEST_SYSTEM_GUIDE.md"
echo "   - BACKTEST_SYSTEM_IMPLEMENTATION_SUMMARY.md"
