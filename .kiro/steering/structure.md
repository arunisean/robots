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
├── routes/                     # API route handlers
├── services/                   # External service integrations
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
- All agents inherit from `BaseAgent` class
- Implement specific interfaces (`IWorkAgent`, `IProcessAgent`, etc.)
- Follow consistent lifecycle: `initialize()` → `execute()` → `cleanup()`

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

### Runtime Management
- `AgentSandbox`: Isolated execution environment
- `AgentRuntimeManager`: Lifecycle and resource management
- `MetricsCollector`: Performance monitoring
- `LifecycleManager`: State transitions

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