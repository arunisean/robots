# 🚀 部署策略指南

## 📋 三环境架构

### 🏠 本地开发环境
**目标**: 快速开发、调试方便、离线工作

```bash
# 安装本地服务
./scripts/setup-local-services.sh

# 配置文件: packages/backend/.env.local
DATABASE_URL=postgresql://localhost:5432/multi_agent_platform
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

**优势**:
- ✅ 无网络依赖，离线开发
- ✅ 完全控制数据库，便于调试
- ✅ 快速重启，数据持久化
- ✅ 支持数据库GUI工具

### ☁️ 云端测试环境
**目标**: 接近生产环境、团队协作、CI/CD集成

```bash
# 使用Supabase + Upstash
# 配置文件: packages/backend/.env.staging
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
REDIS_URL=redis://:[password]@[endpoint].upstash.io:6379
NODE_ENV=staging
```

**优势**:
- ✅ 真实云环境测试
- ✅ 团队共享数据库
- ✅ 自动备份和监控
- ✅ 免费额度充足

### 🌐 Cloudflare生产环境
**目标**: 全球部署、高性能、低成本

```bash
# 使用Cloudflare生态
# 配置文件: wrangler.toml
[env.production]
DATABASE_URL = "d1://multi-agent-platform"
KV_NAMESPACE = "multi-agent-cache"
```

**优势**:
- ✅ 全球边缘部署
- ✅ 极低延迟
- ✅ 按使用付费
- ✅ 与Cloudflare完美集成

## 🔧 具体实施方案

### 1. 本地开发设置

```bash
# 1. 安装本地服务
brew install postgresql@15 redis
brew services start postgresql@15 redis

# 2. 创建数据库
createdb multi_agent_platform

# 3. 配置环境变量
cat > packages/backend/.env.local << 'EOF'
DATABASE_URL=postgresql://localhost:5432/multi_agent_platform
REDIS_URL=redis://localhost:6379
NODE_ENV=development
JWT_SECRET=dev-jwt-secret-key
PORT=3001
EOF

# 4. 运行迁移
cd packages/backend
npm run migrate
npm run dev
```

### 2. 云端测试环境

```bash
# 1. 创建Supabase项目
# 访问 https://supabase.com/dashboard

# 2. 创建Upstash Redis
# 访问 https://console.upstash.com/

# 3. 配置环境变量
cat > packages/backend/.env.staging << 'EOF'
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
REDIS_URL=redis://:[password]@[endpoint].upstash.io:6379
NODE_ENV=staging
JWT_SECRET=staging-jwt-secret-key
PORT=3001
EOF

# 4. 部署到Vercel/Railway
npm run deploy:staging
```

### 3. Cloudflare生产环境

```bash
# 1. 安装Wrangler CLI
npm install -g wrangler

# 2. 创建D1数据库
wrangler d1 create multi-agent-platform

# 3. 创建KV存储
wrangler kv:namespace create "multi-agent-cache"

# 4. 配置wrangler.toml
cat > wrangler.toml << 'EOF'
name = "multi-agent-platform"
main = "packages/backend/dist/index.js"
compatibility_date = "2024-01-01"

[env.production]
[[env.production.d1_databases]]
binding = "DB"
database_name = "multi-agent-platform"
database_id = "[database-id]"

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "[kv-id]"
EOF

# 5. 部署
wrangler deploy --env production
```

## 📊 方案对比

| 特性 | 本地开发 | 云端测试 | Cloudflare生产 |
|------|----------|----------|----------------|
| **启动速度** | ⚡ 极快 | 🚀 快 | ⚡ 极快 |
| **调试便利** | ✅ 优秀 | 🔧 良好 | 📊 监控 |
| **成本** | 💰 免费 | 💸 低成本 | 💸 按量付费 |
| **扩展性** | ❌ 有限 | ✅ 自动 | ✅ 全球 |
| **网络依赖** | ❌ 无 | ✅ 需要 | ✅ 需要 |
| **团队协作** | ❌ 困难 | ✅ 便利 | ✅ 便利 |

## 🔄 数据迁移策略

### 开发 → 测试
```bash
# 导出本地数据
pg_dump multi_agent_platform > backup.sql

# 导入到Supabase
psql "postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres" < backup.sql
```

### 测试 → 生产
```bash
# 从PostgreSQL迁移到D1
wrangler d1 execute multi-agent-platform --file=migration.sql --env production
```

## 🚀 CI/CD流程

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test

  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        run: vercel --prod --token ${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Cloudflare
        run: wrangler deploy --env production
```

## 💡 最佳实践

### 1. 环境隔离
- 使用不同的数据库和Redis实例
- 环境变量文件分离 (`.env.local`, `.env.staging`, `.env.production`)
- 不同的JWT密钥和API密钥

### 2. 数据备份
- 本地: 定期pg_dump
- Supabase: 自动备份
- Cloudflare D1: 定期导出

### 3. 监控告警
- 本地: 日志文件
- 测试: Supabase监控
- 生产: Cloudflare Analytics

### 4. 成本控制
- 监控免费额度使用情况
- 设置使用量告警
- 定期清理测试数据

这个混合架构方案既保证了开发效率，又满足了生产环境的性能和成本要求！🎯