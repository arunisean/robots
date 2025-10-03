# Cloudflare部署完整指南

本指南将详细介绍如何将Multi-Agent Platform部署到Cloudflare平台，包括Workers、Pages、D1数据库和KV存储的配置。

## 📋 部署架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Cloudflare     │    │  Cloudflare     │    │  Cloudflare     │
│  Pages          │    │  Workers        │    │  D1 Database    │
│  (Frontend)     │◄──►│  (Backend API)  │◄──►│  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Chrome         │    │  KV Storage     │    │  R2 Storage     │
│  Extension      │    │  (Cache/Redis)  │    │  (File Storage) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 步骤1：准备Cloudflare环境

### 1.1 创建Cloudflare账户

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 注册新账户或登录现有账户
3. 记录你的Account ID（在右侧边栏）

### 1.2 获取API Token

1. 进入 "My Profile" → "API Tokens"
2. 点击 "Create Token"
3. 使用 "Custom token" 模板
4. 配置权限：
   ```
   Zone:Zone Settings:Edit
   Zone:Zone:Read
   Account:Cloudflare Workers:Edit
   Account:Account Settings:Read
   Account:D1:Edit
   Account:R2:Edit
   ```
5. 保存生成的API Token

### 1.3 安装Wrangler CLI

```bash
# 全局安装
npm install -g wrangler

# 或使用npx
npx wrangler --version

# 登录Cloudflare
wrangler login
```

## 🗄️ 步骤2：设置数据库和存储

### 2.1 创建D1数据库

```bash
# 创建数据库
wrangler d1 create multi-agent-platform-db

# 记录返回的database_id，添加到wrangler.toml
```

### 2.2 运行数据库迁移

```bash
# 执行初始化脚本
wrangler d1 execute multi-agent-platform-db \
  --file=packages/backend/src/database/migrations/001_initial_schema.sql

# 验证表创建
wrangler d1 execute multi-agent-platform-db \
  --command="SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

### 2.3 创建KV存储

```bash
# 创建KV命名空间
wrangler kv:namespace create "CACHE"
wrangler kv:namespace create "SESSIONS"

# 记录返回的namespace_id
```

### 2.4 创建R2存储桶

```bash
# 创建R2存储桶用于文件存储
wrangler r2 bucket create multi-agent-files
```

## ⚙️ 步骤3：配置后端部署

### 3.1 创建Worker适配器

```typescript
// packages/backend/src/worker.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { authRoutes } from './routes/auth';
import { agentRoutes } from './routes/agents';

const app = new Hono();

// CORS配置
app.use('*', cors({
  origin: ['https://your-domain.pages.dev'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// JWT中间件
app.use('/api/*', jwt({
  secret: 'your-jwt-secret',
}));

// 路由
app.route('/api/auth', authRoutes);
app.route('/api/agents', agentRoutes);

// 健康检查
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default app;
```

### 3.2 配置wrangler.toml

```toml
name = "multi-agent-platform-api"
main = "packages/backend/dist/worker.js"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
vars = { 
  NODE_ENV = "production",
  JWT_SECRET = "your-super-secret-jwt-key"
}

# D1数据库绑定
[[env.production.d1_databases]]
binding = "DB"
database_name = "multi-agent-platform-db"
database_id = "your-d1-database-id"

# KV存储绑定
[[env.production.kv_namespaces]]
binding = "CACHE"
id = "your-cache-kv-id"

[[env.production.kv_namespaces]]
binding = "SESSIONS"
id = "your-sessions-kv-id"

# R2存储绑定
[[env.production.r2_buckets]]
binding = "FILES"
bucket_name = "multi-agent-files"

# 环境变量
[env.production.vars]
OPENAI_API_KEY = "your-openai-api-key"
TWITTER_API_KEY = "your-twitter-api-key"
TWITTER_API_SECRET = "your-twitter-api-secret"
```

### 3.3 构建和部署后端

```bash
# 构建Worker
cd packages/backend
npm run build:worker

# 部署到Cloudflare
wrangler deploy --env production

# 验证部署
curl https://your-worker.your-subdomain.workers.dev/health
```

## 🌐 步骤4：部署前端

### 4.1 配置Cloudflare Pages

1. **连接GitHub仓库**
   - 登录Cloudflare Dashboard
   - 进入 "Pages" 部分
   - 点击 "Create a project"
   - 连接GitHub仓库

2. **配置构建设置**
   ```
   Framework preset: Next.js
   Build command: npm run build
   Build output directory: packages/frontend/.next
   Root directory: /
   Node.js version: 18
   ```

3. **环境变量配置**
   ```bash
   # 在Pages设置中添加：
   NEXT_PUBLIC_API_URL=https://your-worker.your-subdomain.workers.dev
   NEXT_PUBLIC_WS_URL=wss://your-worker.your-subdomain.workers.dev
   NEXT_PUBLIC_CHAIN_ID=1
   NEXT_PUBLIC_NETWORK_NAME=mainnet
   ```

### 4.2 自定义域名配置

1. **添加自定义域名**
   - 在Pages项目设置中点击 "Custom domains"
   - 添加你的域名（如：app.yourdomain.com）
   - 配置DNS记录

2. **SSL证书**
   - Cloudflare自动提供SSL证书
   - 确保"Always Use HTTPS"已启用

## 🔌 步骤5：Chrome插件部署

### 5.1 准备插件包

```bash
# 构建插件
cd packages/chrome-extension
npm run build

# 创建zip包
zip -r multi-agent-extension.zip . -x "node_modules/*" "*.log"
```

### 5.2 发布到Chrome Web Store

1. **注册开发者账户**
   - 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - 支付$5注册费

2. **上传插件**
   - 点击 "New Item"
   - 上传zip文件
   - 填写插件信息

3. **配置插件详情**
   ```
   Name: Multi-Agent Platform
   Description: Control and monitor your AI agents from anywhere on the web
   Category: Productivity
   Language: English
   ```

### 5.3 更新插件配置

```json
// packages/chrome-extension/manifest.json
{
  "host_permissions": [
    "https://your-api-domain.workers.dev/*",
    "https://app.yourdomain.com/*"
  ]
}
```

## 🔧 步骤6：环境配置

### 6.1 生产环境变量

```bash
# Cloudflare Workers环境变量
wrangler secret put JWT_SECRET
wrangler secret put OPENAI_API_KEY
wrangler secret put TWITTER_API_KEY
wrangler secret put TWITTER_API_SECRET
wrangler secret put DATABASE_URL
```

### 6.2 监控和日志

1. **配置Cloudflare Analytics**
   ```javascript
   // 在Worker中添加
   addEventListener('fetch', event => {
     event.respondWith(handleRequest(event.request));
   });
   
   async function handleRequest(request) {
     // 记录请求指标
     const start = Date.now();
     const response = await app.fetch(request);
     const duration = Date.now() - start;
     
     // 发送到Analytics
     event.waitUntil(
       fetch('https://analytics.cloudflare.com/api/v1/metrics', {
         method: 'POST',
         body: JSON.stringify({
           duration,
           status: response.status,
           path: new URL(request.url).pathname
         })
       })
     );
     
     return response;
   }
   ```

2. **设置告警**
   - 配置错误率告警
   - 设置响应时间监控
   - 配置资源使用告警

## 🚀 步骤7：部署验证

### 7.1 功能测试

```bash
# 测试API健康状态
curl https://your-api-domain.workers.dev/health

# 测试认证流程
curl -X POST https://your-api-domain.workers.dev/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x..."}'

# 测试Agent创建
curl -X POST https://your-api-domain.workers.dev/api/agents \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Agent","type":"work.web_scraper","config":{}}'
```

### 7.2 性能测试

```bash
# 使用Apache Bench测试
ab -n 100 -c 10 https://your-api-domain.workers.dev/health

# 使用curl测试响应时间
curl -w "@curl-format.txt" -o /dev/null -s https://your-api-domain.workers.dev/health
```

### 7.3 安全检查

1. **HTTPS配置**
   - 验证SSL证书
   - 检查安全头设置
   - 测试CORS配置

2. **认证安全**
   - 验证JWT签名
   - 测试token过期处理
   - 检查权限控制

## 📊 步骤8：监控和维护

### 8.1 设置监控

1. **Cloudflare Analytics**
   - 启用Web Analytics
   - 配置自定义指标
   - 设置性能监控

2. **第三方监控**
   ```javascript
   // 集成Sentry错误监控
   import * as Sentry from '@sentry/cloudflare';
   
   Sentry.init({
     dsn: 'your-sentry-dsn',
     environment: 'production'
   });
   ```

### 8.2 日志管理

```javascript
// 结构化日志
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  message: 'Agent executed successfully',
  agentId: 'agent-123',
  duration: 1500,
  userId: 'user-456'
}));
```

### 8.3 备份策略

1. **数据库备份**
   ```bash
   # 定期导出D1数据
   wrangler d1 export multi-agent-platform-db --output=backup.sql
   ```

2. **配置备份**
   - 备份wrangler.toml配置
   - 保存环境变量列表
   - 记录域名和DNS配置

## 🔄 步骤9：CI/CD设置

### 9.1 GitHub Actions配置

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build project
        run: npm run build
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'packages/backend'
          command: deploy --env production
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: multi-agent-platform
          directory: packages/frontend/.next
```

### 9.2 环境管理

```bash
# 开发环境
wrangler deploy --env development

# 预发布环境
wrangler deploy --env staging

# 生产环境
wrangler deploy --env production
```

## 🔒 步骤10：安全配置

### 10.1 WAF规则

```javascript
// 在Cloudflare Dashboard中配置WAF规则
const wafRules = [
  {
    expression: '(http.request.uri.path contains "/api/") and (rate(1m) > 100)',
    action: 'challenge'
  },
  {
    expression: 'not ip.geoip.country in {"US" "CA" "GB" "DE" "FR"}',
    action: 'block'
  }
];
```

### 10.2 访问控制

```javascript
// Worker中的IP白名单
const allowedIPs = ['192.168.1.1', '10.0.0.1'];

export default {
  async fetch(request, env) {
    const clientIP = request.headers.get('CF-Connecting-IP');
    
    if (!allowedIPs.includes(clientIP)) {
      return new Response('Access denied', { status: 403 });
    }
    
    return app.fetch(request, env);
  }
};
```

## 📈 步骤11：性能优化

### 11.1 缓存策略

```javascript
// 设置缓存头
app.get('/api/agents', async (c) => {
  const agents = await getAgents();
  
  c.header('Cache-Control', 'public, max-age=300'); // 5分钟缓存
  return c.json(agents);
});

// KV缓存
const cachedData = await env.CACHE.get('agents-list');
if (cachedData) {
  return JSON.parse(cachedData);
}

const freshData = await fetchAgents();
await env.CACHE.put('agents-list', JSON.stringify(freshData), {
  expirationTtl: 300 // 5分钟
});
```

### 11.2 数据库优化

```sql
-- 添加索引优化查询
CREATE INDEX CONCURRENTLY idx_agents_owner_status 
ON agents(owner_id, status) 
WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_execution_records_recent 
ON execution_records(start_time DESC) 
WHERE start_time > NOW() - INTERVAL '7 days';
```

## 🔍 步骤12：测试和验证

### 12.1 端到端测试

```bash
# 创建测试脚本
#!/bin/bash

API_URL="https://your-api-domain.workers.dev"

# 测试健康检查
echo "Testing health endpoint..."
curl -f "$API_URL/health" || exit 1

# 测试认证流程
echo "Testing authentication..."
NONCE_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/nonce" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1234567890123456789012345678901234567890"}')

echo "Nonce response: $NONCE_RESPONSE"

# 测试Agent API
echo "Testing agent endpoints..."
curl -f "$API_URL/api/agents" \
  -H "Authorization: Bearer test-token" || echo "Auth required (expected)"

echo "All tests passed!"
```

### 12.2 负载测试

```bash
# 使用Artillery进行负载测试
npm install -g artillery

# 创建测试配置
cat > load-test.yml << EOF
config:
  target: 'https://your-api-domain.workers.dev'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Health check"
    requests:
      - get:
          url: "/health"
  - name: "Agent list"
    requests:
      - get:
          url: "/api/agents"
          headers:
            Authorization: "Bearer test-token"
EOF

# 运行负载测试
artillery run load-test.yml
```

## 🚨 故障排除

### 常见部署问题

1. **Worker部署失败**
   ```bash
   # 检查语法错误
   npm run build
   
   # 检查依赖
   npm run type-check
   
   # 查看详细错误
   wrangler deploy --verbose
   ```

2. **数据库连接问题**
   ```bash
   # 测试D1连接
   wrangler d1 execute multi-agent-platform-db --command="SELECT 1"
   
   # 检查绑定配置
   wrangler d1 list
   ```

3. **KV存储问题**
   ```bash
   # 测试KV访问
   wrangler kv:key put --binding=CACHE "test" "value"
   wrangler kv:key get --binding=CACHE "test"
   ```

### 调试技巧

1. **查看Worker日志**
   ```bash
   wrangler tail --env production
   ```

2. **本地测试Worker**
   ```bash
   wrangler dev --env production --local
   ```

3. **检查Pages构建日志**
   - 在Cloudflare Dashboard中查看构建日志
   - 检查环境变量配置
   - 验证构建命令

## 📋 部署检查清单

- [ ] Cloudflare账户和API Token配置
- [ ] D1数据库创建和迁移完成
- [ ] KV存储命名空间创建
- [ ] R2存储桶创建
- [ ] wrangler.toml配置正确
- [ ] 环境变量设置完成
- [ ] Worker部署成功
- [ ] Pages部署成功
- [ ] 自定义域名配置
- [ ] SSL证书启用
- [ ] Chrome插件更新配置
- [ ] 端到端测试通过
- [ ] 监控和告警配置
- [ ] 备份策略实施

## 🎯 部署后优化

### 性能优化

1. **启用Cloudflare缓存**
2. **配置CDN加速**
3. **优化图片和静态资源**
4. **启用Brotli压缩**

### 安全加固

1. **配置WAF规则**
2. **启用DDoS保护**
3. **设置访问控制**
4. **配置安全头**

### 监控设置

1. **配置Uptime监控**
2. **设置性能告警**
3. **启用错误追踪**
4. **配置日志分析**

---

完成以上步骤后，你的Multi-Agent Platform将成功部署到Cloudflare，享受全球CDN加速和高可用性保障！