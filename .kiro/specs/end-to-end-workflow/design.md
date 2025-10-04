# Design Document

## Overview

This design document outlines the architecture and implementation approach for enabling end-to-end workflow execution in the multi-agent automation platform. The system will support the complete lifecycle: local environment setup, workflow configuration, execution, monitoring, and result visualization through both web and Chrome extension interfaces.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application<br/>Next.js + React]
        EXT[Chrome Extension<br/>React + Chrome API]
    end
    
    subgraph "API Layer"
        API[Backend API<br/>Fastify]
        WS[WebSocket Server<br/>Real-time Events]
    end
    
    subgraph "Service Layer"
        WF[Workflow Service]
        AR[Agent Registry]
        AE[Agent Executor]
        AM[Agent Monitor]
    end
    
    subgraph "Agent Layer"
        WORK[Work Agents<br/>WebScraper, RSS, API]
        PROC[Process Agents<br/>TextProcessor, ContentGen]
        PUB[Publish Agents<br/>Twitter, Website]
        VAL[Validate Agents<br/>Performance, Quality]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Workflows, Results)]
        RD[(Redis<br/>Cache, Queue)]
    end
    
    WEB --> API
    EXT --> API
    API --> WS
    API --> WF
    WF --> AR
    WF --> AE
    AE --> AM
    AE --> WORK
    WORK --> PROC
    PROC --> PUB
    PUB --> VAL
    WF --> PG
    WF --> RD
    AM --> WS
```

### Component Architecture

#### 1. Workflow Service
- **Responsibility**: Manage workflow lifecycle (create, read, update, delete, execute)
- **Key Classes**:
  - `WorkflowService`: Main service class
  - `WorkflowValidator`: Validates workflow configuration
  - `WorkflowExecutor`: Orchestrates agent execution
  - `WorkflowStorage`: Persists workflows to database

#### 2. Agent Registry
- **Responsibility**: Register, discover, and manage available agents
- **Key Classes**:
  - `AgentRegistry`: Already implemented, manages agent instances
  - `AgentMetadataService`: Stores and retrieves agent metadata
  - `AgentSchemaValidator`: Validates agent configurations

#### 3. Agent Executor
- **Responsibility**: Execute individual agents and manage data flow
- **Key Classes**:
  - `AgentExecutor`: Executes single agent with input
  - `DataFlowManager`: Transforms data between agents
  - `ExecutionContext`: Maintains execution state

#### 4. Agent Monitor
- **Responsibility**: Monitor agent execution and emit real-time events
- **Key Classes**:
  - `AgentMonitor`: Tracks agent execution metrics
  - `EventEmitter`: Broadcasts execution events
  - `MetricsCollector`: Already implemented, collects performance metrics

## Components and Interfaces

### 1. Workflow Data Model

```typescript
interface Workflow {
  id: string;
  name: string;
  description: string;
  userId: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  agents: WorkflowAgent[];
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowAgent {
  id: string;
  agentType: string;
  agentCategory: AgentCategory;
  config: AgentConfig;
  order: number;
  nextAgentId?: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  results: AgentExecutionResult[];
  error?: string;
  metrics: ExecutionMetrics;
}

interface AgentExecutionResult {
  agentId: string;
  agentType: string;
  status: 'success' | 'failed' | 'skipped';
  input: any;
  output: any;
  startTime: Date;
  endTime: Date;
  duration: number;
  error?: string;
  metrics: {
    memoryUsed: number;
    cpuTime: number;
    networkCalls: number;
  };
}
```

### 2. Workflow Service Interface

```typescript
interface IWorkflowService {
  // Workflow CRUD
  createWorkflow(workflow: CreateWorkflowDto): Promise<Workflow>;
  getWorkflow(id: string): Promise<Workflow>;
  updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow>;
  deleteWorkflow(id: string): Promise<void>;
  listWorkflows(userId: string, filters?: WorkflowFilters): Promise<Workflow[]>;
  
  // Workflow execution
  executeWorkflow(workflowId: string, options?: ExecutionOptions): Promise<WorkflowExecution>;
  cancelExecution(executionId: string): Promise<void>;
  retryExecution(executionId: string, fromAgentId?: string): Promise<WorkflowExecution>;
  
  // Workflow validation
  validateWorkflow(workflow: Workflow): Promise<ValidationResult>;
  validateAgentConnection(sourceAgent: WorkflowAgent, targetAgent: WorkflowAgent): Promise<boolean>;
  
  // Execution history
  getExecutionHistory(workflowId: string, limit?: number): Promise<WorkflowExecution[]>;
  getExecutionResults(executionId: string): Promise<AgentExecutionResult[]>;
}
```

### 3. Agent Executor Interface

```typescript
interface IAgentExecutor {
  // Execute single agent
  executeAgent(agent: IAgent, input: AgentInput, context: ExecutionContext): Promise<AgentOutput>;
  
  // Execute workflow
  executeWorkflow(workflow: Workflow, context: ExecutionContext): Promise<WorkflowExecution>;
  
  // Data transformation
  transformData(sourceOutput: AgentOutput, targetInput: AgentInput): Promise<any>;
  
  // Resource management
  allocateResources(agent: IAgent): Promise<ResourceAllocation>;
  releaseResources(agent: IAgent): Promise<void>;
}
```

### 4. API Endpoints

```typescript
// Workflow Management
POST   /api/workflows              // Create workflow
GET    /api/workflows              // List workflows
GET    /api/workflows/:id          // Get workflow
PUT    /api/workflows/:id          // Update workflow
DELETE /api/workflows/:id          // Delete workflow

// Workflow Execution
POST   /api/workflows/:id/execute  // Execute workflow
POST   /api/workflows/:id/cancel   // Cancel execution
GET    /api/workflows/:id/executions // Get execution history
GET    /api/executions/:id         // Get execution details
GET    /api/executions/:id/results // Get execution results

// Agent Management
GET    /api/agents                 // List available agents
GET    /api/agents/:type           // Get agent details
POST   /api/agents/:type/validate  // Validate agent config

// Real-time Events
WS     /api/ws/executions/:id      // WebSocket for execution events
```

### 5. WebSocket Event Protocol

```typescript
// Client → Server
interface SubscribeExecutionEvent {
  type: 'subscribe';
  executionId: string;
}

interface UnsubscribeExecutionEvent {
  type: 'unsubscribe';
  executionId: string;
}

// Server → Client
interface ExecutionStartedEvent {
  type: 'execution.started';
  executionId: string;
  workflowId: string;
  timestamp: Date;
}

interface AgentStartedEvent {
  type: 'agent.started';
  executionId: string;
  agentId: string;
  agentType: string;
  timestamp: Date;
}

interface AgentProgressEvent {
  type: 'agent.progress';
  executionId: string;
  agentId: string;
  progress: number; // 0-100
  message: string;
}

interface AgentCompletedEvent {
  type: 'agent.completed';
  executionId: string;
  agentId: string;
  result: AgentExecutionResult;
  timestamp: Date;
}

interface AgentFailedEvent {
  type: 'agent.failed';
  executionId: string;
  agentId: string;
  error: string;
  timestamp: Date;
}

interface ExecutionCompletedEvent {
  type: 'execution.completed';
  executionId: string;
  status: 'completed' | 'failed';
  results: AgentExecutionResult[];
  timestamp: Date;
}
```

## Data Models

### Database Schema

```sql
-- Workflows table
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  user_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  config JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Workflow executions table
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP,
  error TEXT,
  metrics JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Agent execution results table
CREATE TABLE agent_execution_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  agent_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  input JSONB,
  output JSONB,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL,
  error TEXT,
  metrics JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_executions_status ON workflow_executions(status);
CREATE INDEX idx_results_execution_id ON agent_execution_results(execution_id);
```

### Redis Data Structures

```typescript
// Execution queue (for async processing)
LPUSH execution:queue ${executionId}

// Execution status cache
SET execution:${executionId}:status ${status} EX 3600

// Real-time metrics
HSET execution:${executionId}:metrics agentId ${agentId} progress ${progress}

// Active executions set
SADD executions:active ${executionId}

// Execution lock (prevent duplicate execution)
SET execution:${workflowId}:lock 1 NX EX 300
```

## Error Handling

### Error Categories

1. **Configuration Errors**
   - Invalid workflow configuration
   - Missing required agent parameters
   - Incompatible agent connections

2. **Execution Errors**
   - Agent execution failure
   - Timeout errors
   - Resource limit exceeded

3. **Data Errors**
   - Invalid input data format
   - Data transformation failure
   - Schema validation failure

4. **System Errors**
   - Database connection failure
   - Redis connection failure
   - Network errors

### Error Handling Strategy

```typescript
class WorkflowExecutionError extends Error {
  constructor(
    message: string,
    public code: string,
    public agentId?: string,
    public recoverable: boolean = false,
    public context?: any
  ) {
    super(message);
    this.name = 'WorkflowExecutionError';
  }
}

// Error codes
enum ErrorCode {
  INVALID_CONFIG = 'INVALID_CONFIG',
  AGENT_EXECUTION_FAILED = 'AGENT_EXECUTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',
  DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

// Retry strategy
interface RetryConfig {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
  retryableErrors: ErrorCode[];
}
```

## Testing Strategy

### Unit Tests
- Test individual agent execution
- Test data transformation logic
- Test workflow validation
- Test error handling

### Integration Tests
- Test complete workflow execution (Work → Process → Publish → Validate)
- Test WebSocket event emission
- Test database operations
- Test Redis caching

### End-to-End Tests
- Test workflow creation through API
- Test workflow execution and monitoring
- Test result retrieval
- Test Chrome extension integration

### Performance Tests
- Test concurrent workflow execution
- Test large data processing
- Test resource usage under load
- Test WebSocket connection limits

## Security Considerations

### Authentication
- JWT token validation for API requests
- Web3 wallet signature verification
- Session management with Redis

### Authorization
- User can only access their own workflows
- Role-based access control (admin, user)
- API rate limiting

### Data Protection
- Encrypt sensitive data in database
- Sanitize user inputs
- Validate all external data sources
- Implement CORS policies

### Resource Protection
- Enforce memory limits per agent
- Enforce CPU time limits
- Enforce timeout limits
- Implement request throttling

## Deployment Strategy

### Local Development
```bash
# Start all services
npm run dev

# Start individual services
npm run dev:backend
npm run dev:frontend
npm run dev:extension

# Start databases
docker-compose up postgres redis -d
```

### Environment Variables
```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/agents
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
PORT=3001

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Chrome Extension
VITE_API_URL=http://localhost:3001
```

### Database Initialization
```bash
# Run migrations
npm run db:migrate

# Seed example data
npm run db:seed
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- Set up database schema
- Implement WorkflowService
- Implement AgentExecutor
- Create API endpoints

### Phase 2: Workflow Execution (Week 2)
- Implement workflow execution logic
- Implement data flow between agents
- Add error handling and retry logic
- Add execution monitoring

### Phase 3: Real-time Monitoring (Week 3)
- Implement WebSocket server
- Add event emission
- Create monitoring dashboard
- Add execution history

### Phase 4: Web Interface (Week 4)
- Create workflow builder UI
- Create execution monitoring UI
- Create results visualization
- Add authentication

### Phase 5: Chrome Extension (Week 5)
- Create extension popup UI
- Implement background script
- Add notification system
- Add quick actions

### Phase 6: Testing & Polish (Week 6)
- Write comprehensive tests
- Performance optimization
- Bug fixes
- Documentation

## Example Workflow Configuration

```json
{
  "name": "Tech News Aggregator",
  "description": "Scrape tech news, summarize, and publish to Twitter",
  "agents": [
    {
      "id": "agent-1",
      "agentType": "work.web_scraper",
      "agentCategory": "WORK",
      "order": 1,
      "config": {
        "id": "web-scraper-1",
        "name": "Tech News Scraper",
        "category": "WORK",
        "dataSources": [
          {
            "id": "source-1",
            "type": "WEB_SCRAPING",
            "url": "https://news.ycombinator.com",
            "selectors": {
              "title": ".titleline > a",
              "url": ".titleline > a::attr(href)"
            }
          }
        ]
      },
      "nextAgentId": "agent-2"
    },
    {
      "id": "agent-2",
      "agentType": "process.text_processor",
      "agentCategory": "PROCESS",
      "order": 2,
      "config": {
        "id": "text-processor-1",
        "name": "Content Summarizer",
        "category": "PROCESS",
        "processingRules": [
          {
            "name": "summarize",
            "type": "CONTENT_GENERATION",
            "order": 1,
            "config": {
              "contentGeneration": {
                "style": "casual",
                "length": "short"
              }
            }
          }
        ]
      },
      "nextAgentId": "agent-3"
    },
    {
      "id": "agent-3",
      "agentType": "publish.twitter",
      "agentCategory": "PUBLISH",
      "order": 3,
      "config": {
        "id": "twitter-publisher-1",
        "name": "Twitter Publisher",
        "category": "PUBLISH",
        "publishTargets": [
          {
            "id": "twitter-1",
            "platform": "TWITTER",
            "credentials": {
              "apiKey": "xxx",
              "apiSecret": "xxx"
            }
          }
        ]
      },
      "nextAgentId": "agent-4"
    },
    {
      "id": "agent-4",
      "agentType": "validate.performance_monitor",
      "agentCategory": "VALIDATE",
      "order": 4,
      "config": {
        "id": "performance-monitor-1",
        "name": "Performance Monitor",
        "category": "VALIDATE",
        "validationRules": [
          {
            "name": "check-performance",
            "type": "PERFORMANCE",
            "threshold": 0.8
          }
        ]
      }
    }
  ]
}
```

## Monitoring and Observability

### Metrics to Track
- Workflow execution count
- Average execution time per workflow
- Success/failure rate
- Agent execution time distribution
- Resource usage (memory, CPU)
- API response times
- WebSocket connection count

### Logging Strategy
- Structured logging with JSON format
- Log levels: DEBUG, INFO, WARN, ERROR
- Correlation IDs for request tracing
- Separate logs for each agent execution

### Health Checks
- Database connectivity
- Redis connectivity
- Agent registry status
- Active execution count
- System resource availability
