#!/bin/bash

# Start backend server in background

echo "🚀 Starting backend server in background..."

cd packages/backend
nohup npm run dev > ../../backend.log 2>&1 &
PID=$!

echo "✅ Backend server started with PID: $PID"
echo "📝 Logs: backend.log"
echo ""
echo "To stop: kill $PID"
echo "To view logs: tail -f backend.log"
