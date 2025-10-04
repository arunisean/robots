#!/bin/bash

# Test script for workflow API
# Assumes PostgreSQL and Redis are already running

set -e

echo "🧪 Testing Workflow System API..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001"

# Function to test endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4
  
  echo -e "${YELLOW}Testing: ${description}${NC}"
  
  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "${API_URL}${endpoint}")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "${API_URL}${endpoint}" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✅ Success (HTTP $http_code)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}❌ Failed (HTTP $http_code)${NC}"
    echo "$body"
  fi
  
  echo ""
}

# Check if server is running
echo -e "${YELLOW}Checking if backend server is running...${NC}"
if ! curl -s "${API_URL}/health" > /dev/null 2>&1; then
  echo -e "${RED}❌ Backend server is not running at ${API_URL}${NC}"
  echo "Please start the backend server first:"
  echo "  cd packages/backend && npm run dev"
  exit 1
fi
echo -e "${GREEN}✅ Backend server is running${NC}"
echo ""

# Test health endpoint
test_endpoint "GET" "/health" "" "Health check"

# Test workflow creation
WORKFLOW_DATA='{
  "name": "Test Content Pipeline",
  "description": "A test workflow for content generation",
  "agents": [
    {
      "id": "work-1",
      "type": "work",
      "name": "Data Collector",
      "config": {
        "source": "twitter",
        "keywords": ["AI", "automation"]
      }
    },
    {
      "id": "process-1",
      "type": "process",
      "name": "Content Generator",
      "config": {
        "model": "gpt-4",
        "prompt": "Generate engaging content"
      },
      "dependencies": ["work-1"]
    },
    {
      "id": "publish-1",
      "type": "publish",
      "name": "Twitter Publisher",
      "config": {
        "platform": "twitter"
      },
      "dependencies": ["process-1"]
    }
  ],
  "schedule": {
    "type": "cron",
    "expression": "0 9 * * *"
  },
  "errorHandling": {
    "strategy": "continue",
    "maxRetries": 3
  }
}'

test_endpoint "POST" "/api/workflows" "$WORKFLOW_DATA" "Create workflow"

# Extract workflow ID from response (if jq is available)
if command -v jq &> /dev/null; then
  WORKFLOW_ID=$(echo "$body" | jq -r '.id' 2>/dev/null)
  
  if [ "$WORKFLOW_ID" != "null" ] && [ -n "$WORKFLOW_ID" ]; then
    echo -e "${GREEN}Created workflow with ID: $WORKFLOW_ID${NC}"
    echo ""
    
    # Test get workflow
    test_endpoint "GET" "/api/workflows/$WORKFLOW_ID" "" "Get workflow by ID"
    
    # Test execute workflow
    test_endpoint "POST" "/api/workflows/$WORKFLOW_ID/execute" "" "Execute workflow"
    
    # Extract execution ID
    EXECUTION_ID=$(echo "$body" | jq -r '.id' 2>/dev/null)
    
    if [ "$EXECUTION_ID" != "null" ] && [ -n "$EXECUTION_ID" ]; then
      echo -e "${GREEN}Started execution with ID: $EXECUTION_ID${NC}"
      echo ""
      
      # Wait a bit for execution
      echo -e "${YELLOW}Waiting 2 seconds for execution...${NC}"
      sleep 2
      
      # Test get execution
      test_endpoint "GET" "/api/executions/$EXECUTION_ID" "" "Get execution status"
      
      # Test get execution results
      test_endpoint "GET" "/api/executions/$EXECUTION_ID/results" "" "Get execution results"
    fi
  fi
fi

# Test list workflows
test_endpoint "GET" "/api/workflows" "" "List all workflows"

# Test list executions
test_endpoint "GET" "/api/executions" "" "List all executions"

echo -e "${GREEN}✅ All API tests completed!${NC}"
echo ""
