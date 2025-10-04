#!/bin/bash

# Start both backend and frontend in development mode

echo "🚀 Starting Development Environment..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✅ Backend already running on port 3001${NC}"
else
    echo -e "${YELLOW}🔧 Starting backend server...${NC}"
    cd packages/backend
    nohup npm run dev > ../../backend.log 2>&1 &
    BACKEND_PID=$!
    cd ../..
    echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
    echo "   Logs: backend.log"
    sleep 5
fi

# Check if frontend is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✅ Frontend already running on port 3000${NC}"
else
    echo -e "${YELLOW}🔧 Starting frontend server...${NC}"
    cd packages/frontend
    nohup npm run dev > ../../frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ../..
    echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
    echo "   Logs: frontend.log"
    sleep 5
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Development environment is ready!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Services:"
echo "  🔹 Frontend:  http://localhost:3000"
echo "  🔹 Backend:   http://localhost:3001"
echo "  🔹 WebSocket: ws://localhost:3001/api/ws"
echo ""
echo "📝 Logs:"
echo "  Backend:  tail -f backend.log"
echo "  Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop:"
echo "  ./scripts/stop-dev.sh"
echo ""
