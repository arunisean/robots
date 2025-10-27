# 🚀 Quick Start Guide

## Web3 Trading Automation Platform

### Prerequisites

- Node.js 18+
- Docker Desktop (for PostgreSQL and Redis)
- MetaMask or other Web3 wallet

### Quick Start (Windows)

1. **Install dependencies** (first time only):
   ```bash
   npm install
   ```

2. **Start all services**:
   ```bash
   start-dev.bat
   ```

   This will:
   - Start PostgreSQL and Redis databases
   - Start the backend server (http://localhost:3001)
   - Start the frontend server (http://localhost:3000)

3. **Open your browser**:
   - Navigate to http://localhost:3000
   - Connect your MetaMask wallet
   - Browse trading strategies and start automating!

4. **Stop all services**:
   ```bash
   stop-dev.bat
   ```

### Manual Start (Alternative)

If you prefer to start services manually:

```bash
# 1. Start databases
docker start multi-agent-postgres multi-agent-redis

# 2. Start backend (in one terminal)
cd packages/backend
npm run dev

# 3. Start frontend (in another terminal)
cd packages/frontend
npm run dev
```

### First Time Setup

If this is your first time running the platform:

1. Make sure Docker Desktop is running
2. Run `start-dev.bat` - it will automatically create the databases
3. The backend will automatically run migrations on first start

### Available Pages

- **Home** (/) - Platform overview and quick start
- **Strategies** (/strategies) - Browse and configure trading strategies
- **Dashboard** (/dashboard) - Monitor your active strategies (requires wallet connection)
- **Help** (/help) - Documentation and FAQ

### Troubleshooting

**Database connection errors:**
- Make sure Docker Desktop is running
- Run: `docker start multi-agent-postgres multi-agent-redis`

**Port already in use:**
- Stop existing services: `stop-dev.bat`
- Or manually kill processes on ports 3000, 3001, 5432, 6379

**Frontend 404 errors:**
- Make sure you're accessing http://localhost:3000 (not 3001)
- Clear browser cache and refresh

### Development

- Backend code: `packages/backend/src/`
- Frontend code: `packages/frontend/pages/` and `packages/frontend/src/`
- Shared types: `packages/shared/src/types/`

### Tech Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS, React Query
- **Backend**: Fastify, TypeScript, PostgreSQL, Redis
- **Web3**: ethers.js, MetaMask integration
- **Trading**: Custom agent system (Monitor/Analyze/Execute/Verify)

### Need Help?

Check the `/help` page in the app or see the full documentation in the `docs/` folder.
