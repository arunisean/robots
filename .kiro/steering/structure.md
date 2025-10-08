# Project Structure

## Monorepo Organization

```
multi-agent-platform/
├── packages/                    # All application packages
│   ├── backend/                # Fastify API server
│   ├── frontend/               # Next.js web application
│   ├── chrome-extension/       # Chrome extension
│   └── shared/                 # Shared types and utilities
├── .kiro/                      # Kiro configuration and specs
├── docker-compose.yml          # Development services
└── turbo.json                  # Monorepo build configuration
```

## Backend Structure (`packages/backend/`)

```
src/
├── agents/                     # Agent system implementation
│   ├── base/                   # Base agent interfaces and classes
│   ├── factory/                # Agent creation and instantiation
│   ├── process/                # Process agents (data transformation)
│   ├── publish/                # Publish agents (content distribution)
│   ├── registry/               # Agent registration and discovery
│   ├── runtime/                # Agent execution environment
│   ├── templates/              # Agent template system
│   ├── validate/               # Validate agents (quality assessment)
│   └── work/                   # Work agents (data collection)
├── config/                     # Application configuration
├── database/                   # Database layer
│   ├── migrations/             # SQL migration files
│   ├── seeds/                  # Database seed data
│   └── repositories/           # Data access layer
│       ├── WorkflowRepository.ts      # Workflow CRUD operations
│       └── ExecutionRepository.ts     # Execution tracking
├── routes/                     # API route handlers
│   ├── workflows.ts            # Workflow management endpoints
│   └── executions.ts           # Execution monitoring endpoints
├── services/                   # Business logic layer
│   ├── WorkflowService.ts      # Workflow orchestration
│   ├── WorkflowValidator.ts    # Workflow validation logic
│   └── WorkflowExecutor.ts     # Sequential agent execution
├── utils/                      # Utility functions
└── __tests__/                  # Test files (mirrors src structure)
```

## Frontend Structure (`packages/frontend/`)

```
src/
├── components/                 # Reusable UI components
├── pages/                      # Next.js pages and API routes
├── hooks/                      # Custom React hooks
├── stores/                     # Zustand state management
├── utils/                      # Frontend utilities
└── styles/                     # Global styles and Tailwind config
```

## Shared Package (`packages/shared/`)

```
src/
├── types/                      # TypeScript type definitions
│   ├── agent.ts               # Base agent types
│   ├── process-agent.ts       # Process agent specific types
│   ├── publish-agent.ts       # Publish agent specific types
│   ├── validate-agent.ts      # Validate agent specific types
│   ├── work-agent.ts          # Work agent specific types
│   ├── workflow.ts            # Workflow orchestration types
│   └── user.ts                # User and authentication types
└── utils/                      # Shared utility functions
    ├── crypto.ts              # Cryptographic utilities
    ├── formatting.ts          # Data formatting helpers
    └── validation.ts          # Zod validation schemas
```

## Agent Architecture Patterns

### Base Agent Structure
- All agents inherit from `BaseAgent` class using abstract base class pattern
- Implement specific interfaces (`IWorkAgent`, `IProcessAgent`, etc.)
- Follow consistent lifecycle: `initialize()` → `execute()` → `cleanup()`
- Uses template method pattern to define execution flow

### Agent Categories
1. **Work Agents**: Data collection and ingestion
   - Web scraping agents
   - API integration agents
   - Social media collectors

2. **Process Agents**: Data transformation and analysis
   - Content generation agents
   - Data processing agents
   - LLM integration agents

3. **Publish Agents**: Content distribution
   - Social media publishers
   - Website deployment agents
   - Multi-platform distributors

4. **Validate Agents**: Quality assurance and monitoring
   - Performance validators
   - Content quality checkers
   - Security scanners

### Agent Framework Implementation
- Custom-built agent framework with abstract base classes
- AgentFactory for creating different agent types
- AgentRuntimeManager for managing agent execution and sandboxing
- Template method pattern for consistent execution flow across all agents

### Runtime Management
- `AgentSandbox`: Isolated execution environment
- `AgentRuntimeManager`: Lifecycle and resource management
- `MetricsCollector`: Performance monitoring
- `LifecycleManager`: State transitions

## Workflow System Architecture

### Database Schema
- **workflows**: Workflow definitions with agent configurations
- **workflow_executions**: Execution tracking with status and metrics
- **agent_execution_results**: Individual agent execution results
- **workflow_templates**: Reusable workflow templates
- **execution_events**: Real-time execution event logging

### Repository Layer
- **WorkflowRepository**: CRUD operations, filtering, pagination, transaction support
- **ExecutionRepository**: Execution tracking, status updates, metrics collection

### Service Layer
- **WorkflowService**: Business logic for workflow management
- **WorkflowValidator**: Comprehensive validation including circular dependency detection
- **WorkflowExecutor**: Sequential execution engine with data passing and error handling

### API Endpoints
- `POST /api/workflows` - Create workflow
- `GET /api/workflows` - List workflows with filtering
- `GET /api/workflows/:id` - Get workflow details
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/workflows/:id/execute` - Execute workflow
- `GET /api/executions` - List executions
- `GET /api/executions/:id` - Get execution details
- `GET /api/executions/:id/results` - Get agent results
- `POST /api/executions/:id/cancel` - Cancel execution

### Execution Flow
1. **Validation**: Structure, circular dependencies, agent order
2. **Sequential Execution**: Work → Process → Publish → Validate
3. **Data Passing**: Output from previous agents flows to next
4. **Error Handling**: Continue/stop strategies with detailed error tracking
5. **Metrics Collection**: Duration, success rate, resource usage

## Configuration Files

- **Root**: `package.json`, `turbo.json`, `tsconfig.json`
- **Environment**: `.env.example` for configuration templates
- **Docker**: `docker-compose.yml` for development services
- **Linting**: `.eslintrc.js`, `.prettierrc` for code quality
- **Git**: `.gitignore` for version control exclusions

## Testing Strategy

- **Unit Tests**: Co-located with source files in `__tests__/` directories
- **Integration Tests**: Service-level testing for agent interactions
- **Test Configuration**: Jest with TypeScript support
- **Coverage**: Aim for comprehensive coverage of agent logic

## Development Conventions

- Use TypeScript strict mode across all packages
- Follow consistent naming: PascalCase for classes, camelCase for functions
- Implement proper error handling with typed exceptions
- Use Zod schemas for runtime validation
- Maintain clear separation between agent types and their implementations