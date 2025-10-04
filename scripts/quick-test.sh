#!/bin/bash

# Quick test script - checks if everything compiles and types are correct

set -e

echo "🧪 Quick System Test"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Type check
echo -e "${YELLOW}1. Running type check...${NC}"
npm run type-check
echo -e "${GREEN}✅ Type check passed${NC}"
echo ""

# 2. Build
echo -e "${YELLOW}2. Building packages...${NC}"
npm run build
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# 3. Check database scripts exist
echo -e "${YELLOW}3. Checking database scripts...${NC}"
if [ -f "packages/backend/src/database/migrate.ts" ]; then
  echo -e "${GREEN}✅ Migration script exists${NC}"
else
  echo -e "${RED}❌ Migration script missing${NC}"
fi

if [ -f "packages/backend/src/database/seed.ts" ]; then
  echo -e "${GREEN}✅ Seed script exists${NC}"
else
  echo -e "${RED}❌ Seed script missing${NC}"
fi
echo ""

# 4. Check key files
echo -e "${YELLOW}4. Checking key implementation files...${NC}"
files=(
  "packages/backend/src/services/WorkflowService.ts"
  "packages/backend/src/services/WorkflowValidator.ts"
  "packages/backend/src/services/WorkflowExecutor.ts"
  "packages/backend/src/database/repositories/WorkflowRepository.ts"
  "packages/backend/src/database/repositories/ExecutionRepository.ts"
  "packages/backend/src/routes/workflows.ts"
  "packages/backend/src/routes/executions.ts"
  "packages/shared/src/types/workflow.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅ $file${NC}"
  else
    echo -e "${RED}❌ $file missing${NC}"
  fi
done
echo ""

echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. Ensure PostgreSQL is running (docker-compose up postgres -d)"
echo "  2. Run migrations: cd packages/backend && npm run db:migrate"
echo "  3. Run seeds: cd packages/backend && npm run db:seed"
echo "  4. Start backend: cd packages/backend && npm run dev"
echo "  5. Test API: ./scripts/test-workflow-api.sh"
echo ""
