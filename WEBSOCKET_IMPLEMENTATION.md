# WebSocket Real-Time Monitoring Implementation

## ✅ Implementation Complete

WebSocket real-time monitoring has been successfully implemented for workflow execution tracking.

## 📦 Components Implemented

### 1. EventBroadcaster Service
**File**: `packages/backend/src/services/EventBroadcaster.ts`

- Manages WebSocket connections and subscriptions
- Broadcasts execution events to subscribed clients
- Handles connection lifecycle (register, unregister, subscribe, unsubscribe)

**Features**:
- Connection management with unique IDs
- Subscription-based event routing
- Support for multiple clients per execution
- Automatic cleanup on disconnect

**Event Types**:
- `execution:started` - Workflow execution begins
- `execution:progress` - Progress updates with percentage
- `execution:completed` - Workflow completes successfully
- `execution:failed` - Workflow fails with error
- `execution:cancelled` - Workflow is cancelled
- `agent:started` - Individual agent starts
- `agent:progress` - Agent progress updates
- `agent:completed` - Agent completes successfully
- `agent:failed` - Agent fails with error

### 2. WebSocket Routes
**File**: `packages/backend/src/routes/websocket.ts`

- WebSocket endpoint: `ws://localhost:3001/api/ws`
- Health check endpoint: `GET /api/ws/health`

**Message Protocol**:
```json
// Subscribe to execution
{
  "type": "subscribe",
  "executionId": "execution-uuid"
}

// Unsubscribe from execution
{
  "type": "unsubscribe",
  "executionId": "execution-uuid"
}

// Ping/Pong for connection health
{
  "type": "ping"
}
```

### 3. WorkflowExecutor Integration
**File**: `packages/backend/src/services/WorkflowExecutor.ts`

The WorkflowExecutor now broadcasts events at key points:
- Execution start
- Before each agent execution
- Progress updates (percentage based on agent count)
- Agent completion/failure
- Execution completion/failure

### 4. Server Configuration
**File**: `packages/backend/src/index.ts`

- Registered `@fastify/websocket` plugin
- Configured WebSocket routes
- Set max payload size to 1MB

## 🧪 Testing

### Test Client
**File**: `scripts/test-websocket.html`

A browser-based test client with:
- Connection management
- Subscription controls
- Real-time event display
- Color-coded event types
- JSON data inspection

**To use**:
1. Start the backend server: `cd packages/backend && npm run dev`
2. Open `scripts/test-websocket.html` in a browser
3. Click "Connect"
4. Enter an execution ID and click "Subscribe"
5. Execute a workflow via API
6. Watch real-time events appear

### Manual Testing
```bash
# 1. Start backend
cd packages/backend
npm run dev

# 2. In another terminal, create and execute a workflow
curl -X POST http://localhost:3001/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "description": "Test real-time monitoring",
    "agents": [...]
  }'

# 3. Execute the workflow
curl -X POST http://localhost:3001/api/workflows/{workflow-id}/execute

# 4. Open test-websocket.html and subscribe to the execution ID
```

## 📊 Event Flow

```
Client connects → Receives connection ID
       ↓
Client subscribes to execution ID
       ↓
Workflow starts → execution:started event
       ↓
For each agent:
  → agent:started event
  → execution:progress event (with %)
  → agent:completed/failed event
       ↓
Workflow completes → execution:completed/failed event
```

## 🔧 API Reference

### EventBroadcaster Methods

```typescript
// Register a new connection
registerConnection(connectionId: string, socket: WebSocket, userId?: string): void

// Unregister a connection
unregisterConnection(connectionId: string): void

// Subscribe to execution events
subscribe(connectionId: string, executionId: string): void

// Unsubscribe from execution events
unsubscribe(connectionId: string, executionId: string): void

// Broadcast events
emitExecutionStarted(executionId, workflowId, data?): void
emitExecutionProgress(executionId, workflowId, progress, currentAgent?, data?): void
emitExecutionCompleted(executionId, workflowId, data?): void
emitExecutionFailed(executionId, workflowId, error, data?): void
emitAgentStarted(executionId, workflowId, agentId, agentName): void
emitAgentCompleted(executionId, workflowId, agentId, agentName, result?): void
emitAgentFailed(executionId, workflowId, agentId, agentName, error): void
```

## 📝 Event Payload Structure

```typescript
interface ExecutionEvent {
  type: ExecutionEventType;
  executionId: string;
  workflowId: string;
  timestamp: Date;
  data: any;
}
```

### Example Events

**Execution Started**:
```json
{
  "type": "execution:started",
  "executionId": "exec-123",
  "workflowId": "workflow-456",
  "timestamp": "2025-10-04T10:00:00.000Z",
  "data": {
    "workflowName": "Content Pipeline",
    "agentCount": 3
  }
}
```

**Execution Progress**:
```json
{
  "type": "execution:progress",
  "executionId": "exec-123",
  "workflowId": "workflow-456",
  "timestamp": "2025-10-04T10:00:05.000Z",
  "data": {
    "progress": 33,
    "currentAgent": "agent-1"
  }
}
```

**Agent Completed**:
```json
{
  "type": "agent:completed",
  "executionId": "exec-123",
  "workflowId": "workflow-456",
  "timestamp": "2025-10-04T10:00:10.000Z",
  "data": {
    "agentId": "agent-1",
    "agentName": "DataCollector",
    "result": { "itemsCollected": 42 }
  }
}
```

## 🎯 Next Steps

1. ✅ WebSocket server setup - COMPLETE
2. ✅ Event broadcasting system - COMPLETE
3. 🚧 Frontend WebSocket client integration
4. 🚧 Web UI for workflow visualization

## 🔒 Security Considerations

- Currently allows anonymous connections
- TODO: Add JWT authentication for WebSocket connections
- TODO: Implement user-based subscription filtering
- TODO: Add rate limiting for WebSocket messages

## 📈 Performance

- Singleton EventBroadcaster instance
- Efficient subscription-based routing
- Automatic cleanup of closed connections
- Minimal overhead on workflow execution

## 🐛 Troubleshooting

**Connection fails**:
- Ensure backend server is running
- Check WebSocket URL (default: `ws://localhost:3001/api/ws`)
- Verify firewall settings

**No events received**:
- Confirm subscription to correct execution ID
- Check that workflow is actually executing
- Verify WebSocket connection is open

**Events delayed**:
- Check network latency
- Verify server is not overloaded
- Consider increasing WebSocket buffer size
