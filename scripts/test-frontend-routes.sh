#!/bin/bash

# Test frontend routes

echo "🧪 Testing Frontend Routes..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

BASE_URL="http://localhost:3000"

# Test routes
test_route() {
  local route=$1
  local name=$2
  
  echo -n "Testing $name ($route)... "
  
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route")
  
  if [ "$status" = "200" ]; then
    echo -e "${GREEN}✅ OK${NC}"
    return 0
  else
    echo -e "${RED}❌ Failed (HTTP $status)${NC}"
    return 1
  fi
}

# Run tests
test_route "/" "Home Page"
test_route "/workflows" "Workflows List"
test_route "/workflows/new" "Create Workflow"

echo ""
echo "✅ Frontend route tests complete!"
