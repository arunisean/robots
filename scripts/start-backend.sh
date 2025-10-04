#!/bin/bash

# Start backend server with full features
# This script ensures database is running and starts the complete server

set -e

echo "🚀 Starting Backend Server..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️  .env file not found, copying from .env.example${NC}"
  cp .env.example .env
  echo -e "${GREEN}✅ .env file created${NC}"
fi

# Check if PostgreSQL is running
echo -e "${YELLOW}📦 Checking PostgreSQL...${NC}"
if ! nc -z localhost 5432 2>/dev/null; then
  echo -e "${RED}❌ PostgreSQL is not running${NC}"
  echo ""
  echo "Please start PostgreSQL first:"
  echo "  docker-compose up postgres -d"
  echo ""
  echo "Or if you have PostgreSQL installed locally:"
  echo "  brew services start postgresql@14"
  exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is running${NC}"

# Run migrations
echo ""
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
cd packages/backend
npm run db:migrate || echo -e "${YELLOW}⚠️  Migration failed or already applied${NC}"

# Run seeds (optional)
echo ""
echo -e "${YELLOW}🌱 Running database seeds...${NC}"
npm run db:seed || echo -e "${YELLOW}⚠️  Seed failed or already applied${NC}"

# Start server
echo ""
echo -e "${GREEN}🚀 Starting backend server...${NC}"
echo ""
npm run dev
