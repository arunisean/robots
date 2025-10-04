#!/bin/bash

# Stop development servers

echo "🛑 Stopping development servers..."

# Stop backend
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "  Stopping backend..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    echo "  ✅ Backend stopped"
else
    echo "  ℹ️  Backend not running"
fi

# Stop frontend
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "  Stopping frontend..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo "  ✅ Frontend stopped"
else
    echo "  ℹ️  Frontend not running"
fi

echo ""
echo "✅ All servers stopped"
