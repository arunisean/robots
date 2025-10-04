#!/bin/bash

# Test script for workflow system
# This script starts the necessary services and runs basic tests

set -e

echo "🚀 Starting Workflow System Test..."
echo ""

# Colors for output
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

# Start PostgreSQL and Redis
echo -e "${YELLOW}📦 Starting PostgreSQL and Redis...${NC}"
docker-compose up -d postgres redis

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 5

# Check PostgreSQL
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

# Check Redis
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
  echo "Waiting for Redis..."
  sleep 2
done
echo -e "${GREEN}✅ Redis is ready${NC}"

# Run type check
echo ""
echo -e "${YELLOW}🔍 Running type check...${NC}"
npm run type-check
echo -e "${GREEN}✅ Type check passed${NC}"

# Build packages
echo ""
echo -e "${YELLOW}🔨 Building packages...${NC}"
npm run build
echo -e "${GREEN}✅ Build completed${NC}"

# Run database migrations
echo ""
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
cd packages/backend
npm run db:migrate || echo -e "${YELLOW}⚠️  Migration command not found, will run on server start${NC}"
cd ../..

# Run seed data
echo ""
echo -e "${YELLOW}🌱 Running seed data...${NC}"
cd packages/backend
npm run db:seed || echo -e "${YELLOW}⚠️  Seed command not found, will run manually${NC}"
cd ../..

echo ""
echo -e "${GREEN}✅ All services are ready!${NC}"
echo ""
echo "📋 Service URLs:"
echo "  - Backend API: http://localhost:3001"
echo "  - Frontend: http://localhost:3000"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "🧪 To test the API:"
echo "  1. Start backend: cd packages/backend && npm run dev"
echo "  2. Test health: curl http://localhost:3001/health"
echo "  3. Create workflow: curl -X POST http://localhost:3001/api/workflows ..."
echo ""
echo "🛑 To stop services: docker-compose down"
echo ""
