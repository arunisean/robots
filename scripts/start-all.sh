#!/bin/bash

# Start both backend and frontend servers

echo "🚀 Starting Full Stack Application..."
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
    echo -e "${YELLOW}📦 Starting backend server...${NC}"
    ./scripts/start-backend-bg.sh
    sleep 3
fi

# Check if frontend is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✅ Frontend already running on port 3000${NC}"
else
    echo -e "${YELLOW}🎨 Starting frontend server...${NC}"
    cd packages/frontend
    nohup npm run dev > ../../frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ../..
    echo -e "${GREEN}✅ Frontend started with PID: $FRONTEND_PID${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Application is ready!${NC}"
echo ""
echo -e "${BLUE}📋 Available URLs:${NC}"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:3001"
echo "  API Test:  http://localhost:3000/test-api"
echo "  Workflows: http://localhost:3000/workflows"
echo "  WebSocket: ws://localhost:3001/api/ws"
echo ""
echo -e "${YELLOW}📝 Logs:${NC}"
echo "  Backend:  tail -f backend.log"
echo "  Frontend: tail -f frontend.log"
echo ""
echo -e "${YELLOW}🛑 To stop:${NC}"
echo "  pkill -f 'tsx.*index.ts'"
echo "  pkill -f 'next-server'"
echo ""
