# Technology Stack

## Build System

- **Monorepo**: Turborepo for efficient build orchestration
- **Package Manager**: npm with workspaces
- **TypeScript**: Strict typing across all packages
- **Node.js**: 18+ required

## Backend Stack

- **Runtime**: Fastify web framework
- **Database**: PostgreSQL for persistent data with pg driver
- **Cache**: Redis for session and temporary data
- **Authentication**: JWT with ethers.js for Web3 wallet integration
- **Validation**: Zod for runtime type validation
- **Testing**: Jest with ts-jest
- **Real-time**: WebSocket support via @fastify/websocket (planned)
- **ORM**: Custom repository pattern with raw SQL for performance
- **Agent Framework**: Custom-built agent system with abstract base classes

## Frontend Stack

- **Framework**: Next.js 14 with React 18
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Icons**: Lucide React
- **Web3**: ethers.js for wallet integration

## Chrome Extension

- **Framework**: React with Webpack
- **APIs**: Chrome Extension API v3
- **Build**: Custom webpack configuration

## Shared Libraries

- **Types**: Centralized TypeScript definitions
- **Validation**: Shared Zod schemas
- **Utilities**: Common helper functions

## Development Tools

- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier
- **Type Checking**: TypeScript compiler
- **Testing**: Jest across all packages

## Infrastructure

- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for local development
- **Database**: PostgreSQL with initialization scripts
- **Cache**: Redis for session management

## Common Commands

```bash
# Development
npm run dev          # Start all development servers
npm run build        # Build all packages
npm run test         # Run all tests
npm run lint         # Lint all packages
npm run type-check   # TypeScript validation
npm run clean        # Clean build artifacts

# Docker services
docker-compose up postgres redis -d  # Start databases
docker-compose down                  # Stop all services

# Database management
npm run migrate      # Run database migrations
npm run seed         # Seed database with example data
npm run db:reset     # Reset database (drop and recreate)

# Package-specific (run from package directory)
npm run dev          # Start package dev server
npm run build        # Build specific package
npm run test         # Test specific package

# Workflow testing
./scripts/test-workflow-system.sh  # Test workflow system end-to-end
```

## Environment Setup

1. Copy `.env.example` to `.env` and configure
2. Start PostgreSQL and Redis via Docker Compose
3. Run `npm install` to install dependencies
4. Use `npm run dev` to start all services

## Port Configuration

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379