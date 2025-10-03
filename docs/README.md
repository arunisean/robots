# Multi-Agent Platform 用户指南

欢迎使用Multi-Agent Platform！这是一个基于Web3身份认证的去中心化Agent编排系统，支持从数据采集到内容发布的完整自动化流程。

## 📋 目录

- [快速开始](#快速开始)
- [Cloudflare部署指南](#cloudflare部署指南)
- [Agent开发指南](#agent开发指南)
- [平台使用教程](#平台使用教程)
- [Chrome插件使用](#chrome插件使用)
- [API文档](#api文档)
- [故障排除](#故障排除)

## 🚀 快速开始

### 系统要求

- Node.js 18+
- Docker & Docker Compose
- Git
- MetaMask或其他Web3钱包

### 本地开发环境搭建

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd multi-agent-platform
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填入必要的配置
   ```

4. **启动开发环境**
   ```bash
   # 启动数据库和缓存服务
   docker-compose up postgres redis -d
   
   # 启动开发服务器
   npm run dev
   ```

5. **访问应用**
   - 前端应用: http://localhost:3000
   - 后端API: http://localhost:3001
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

## ☁️ Cloudflare部署指南

### 准备工作

1. **注册Cloudflare账户**
   - 访问 [Cloudflare](https://cloudflare.com) 注册账户
   - 获取API Token和Account ID

2. **安装Wrangler CLI**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

### 后端部署 (Cloudflare Workers)

1. **配置wrangler.toml**
   ```toml
   name = "multi-agent-backend"
   main = "packages/backend/dist/worker.js"
   compatibility_date = "2024-01-01"
   
   [env.production]
   vars = { NODE_ENV = "production" }
   
   [[env.production.kv_namespaces]]
   binding = "CACHE"
   id = "your-kv-namespace-id"
   
   [[env.production.d1_databases]]
   binding = "DB"
   database_name = "multi-agent-db"
   database_id = "your-d1-database-id"
   ```

2. **创建Cloudflare D1数据库**
   ```bash
   wrangler d1 create multi-agent-db
   wrangler d1 execute multi-agent-db --file=packages/backend/src/database/migrations/001_initial_schema.sql
   ```

3. **创建KV存储**
   ```bash
   wrangler kv:namespace create "CACHE"
   ```

4. **部署后端**
   ```bash
   cd packages/backend
   npm run build:worker
   wrangler deploy
   ```

### 前端部署 (Cloudflare Pages)

1. **配置构建设置**
   ```bash
   # 在Cloudflare Pages中设置：
   # Build command: npm run build
   # Build output directory: packages/frontend/.next
   # Root directory: /
   ```

2. **环境变量配置**
   ```bash
   # 在Cloudflare Pages设置中添加：
   NEXT_PUBLIC_API_URL=https://your-worker.your-subdomain.workers.dev
   NEXT_PUBLIC_WS_URL=wss://your-worker.your-subdomain.workers.dev
   ```

3. **自动部署**
   - 连接GitHub仓库
   - 配置自动部署分支
   - 每次推送自动触发部署

### 环境变量配置

在Cloudflare Workers和Pages中配置以下环境变量：

```bash
# 数据库配置
DATABASE_URL=your-d1-database-connection-string

# JWT配置
JWT_SECRET=your-super-secret-jwt-key

# LLM服务配置
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# 社交平台API
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
TWITTER_BEARER_TOKEN=your-twitter-bearer-token
```

## 🤖 Agent开发指南

### Agent类型概述

平台支持四种类型的Agent：

1. **Work Agent** - 数据采集
2. **Process Agent** - 数据处理
3. **Publish Agent** - 内容发布
4. **Validate Agent** - 质量验证

### 创建新的Work Agent

1. **创建Agent类**
   ```typescript
   // packages/backend/src/agents/work/MyWorkAgent.ts
   import { WorkAgent } from './WorkAgent';
   import { DataTarget, CollectedData } from '@multi-agent-platform/shared';
   
   export class MyWorkAgent extends WorkAgent {
     constructor(id: string, name: string, version: string, description: string) {
       super(id, name, version, description);
     }
   
     protected async collectFromTarget(target: DataTarget): Promise<any> {
       // 实现数据采集逻辑
       const response = await fetch(target.url);
       const data = await response.json();
       return data;
     }
   
     protected async cleanData(data: any): Promise<CollectedData> {
       // 实现数据清洗逻辑
       return {
         id: `data_${Date.now()}`,
         sourceId: 'my-source',
         url: data.url,
         title: data.title,
         content: data.content,
         metadata: {
           author: data.author,
           publishedAt: new Date(data.publishedAt),
           tags: data.tags || []
         },
         media: [],
         collectedAt: new Date(),
         hash: this.generateHash(data.content)
       };
     }
   
     protected getCollectionType(): string {
       return 'my_collector';
     }
   
     protected async testDataSourceConnection(source: any): Promise<void> {
       // 测试数据源连接
       const response = await fetch(source.url, { method: 'HEAD' });
       if (!response.ok) {
         throw new Error(`Cannot connect to ${source.url}`);
       }
     }
   
     // 实现其他抽象方法...
   }
   ```

2. **注册Agent到工厂**
   ```typescript
   // packages/backend/src/agents/factory/AgentFactory.ts
   import { MyWorkAgent } from '../work/MyWorkAgent';
   
   // 在registerDefaultAgentTypes方法中添加：
   this.registerAgentType('work.my_collector', MyWorkAgent);
   ```

3. **创建Agent配置模板**
   ```typescript
   // packages/backend/src/agents/templates/MyWorkAgentTemplate.ts
   export const MyWorkAgentTemplate = {
     category: 'work',
     name: 'My Data Collector',
     description: 'Collects data from my custom source',
     configSchema: {
       type: 'object',
       properties: {
         apiKey: { type: 'string', description: 'API Key for authentication' },
         endpoint: { type: 'string', description: 'API endpoint URL' },
         interval: { type: 'number', description: 'Collection interval in seconds' }
       },
       required: ['apiKey', 'endpoint']
     },
     defaultConfig: {
       apiKey: '',
       endpoint: 'https://api.example.com/data',
       interval: 3600
     }
   };
   ```

### 创建新的Process Agent

```typescript
// packages/backend/src/agents/process/MyProcessAgent.ts
import { ProcessAgent } from './ProcessAgent';
import { ProcessedData } from '@multi-agent-platform/shared';

export class MyProcessAgent extends ProcessAgent {
  protected async processContent(data: any): Promise<ProcessedData> {
    // 实现数据处理逻辑
    const processedContent = await this.transformData(data);
    
    return {
      id: `processed_${Date.now()}`,
      sourceId: data.sourceId,
      originalData: data,
      processedContent: {
        content: processedContent,
        title: this.generateTitle(processedContent),
        summary: this.generateSummary(processedContent),
        keywords: this.extractKeywords(processedContent),
        tags: this.generateTags(processedContent)
      },
      metadata: {
        processingRules: ['my_processing_rule'],
        processingTime: Date.now() - startTime,
        transformations: ['data_transformation']
      },
      qualityScore: await this.calculateQuality(processedContent),
      processedAt: new Date()
    };
  }

  private async transformData(data: any): Promise<string> {
    // 自定义数据转换逻辑
    return data.content.toUpperCase();
  }

  // 实现其他抽象方法...
}
```

### Agent配置最佳实践

1. **配置验证**
   ```typescript
   protected validateSpecificConfig(config: AgentConfig): string[] {
     const errors: string[] = [];
     
     if (!config.apiKey) {
       errors.push('API Key is required');
     }
     
     if (!config.endpoint || !this.isValidUrl(config.endpoint)) {
       errors.push('Valid endpoint URL is required');
     }
     
     return errors;
   }
   ```

2. **错误处理**
   ```typescript
   protected async doExecute(input: AgentInput): Promise<any> {
     try {
       return await this.processData(input);
     } catch (error) {
       this.logger.error('Agent execution failed:', error);
       this.recordFailure(error);
       throw error;
     }
   }
   ```

3. **性能监控**
   ```typescript
   protected async doExecute(input: AgentInput): Promise<any> {
     const startTime = Date.now();
     
     try {
       const result = await this.processData(input);
       this.recordSuccess(Date.now() - startTime);
       return result;
     } catch (error) {
       this.recordFailure(error, Date.now() - startTime);
       throw error;
     }
   }
   ```

## 🎯 平台使用教程

### 1. 用户注册和认证

1. **连接Web3钱包**
   - 访问平台首页
   - 点击"Connect Wallet"按钮
   - 选择MetaMask或其他支持的钱包
   - 授权连接并签名验证消息

2. **完善用户配置**
   - 设置用户偏好（主题、语言、时区）
   - 配置通知设置
   - 设置仪表板布局

### 2. 创建和配置Agent

1. **创建Work Agent**
   ```bash
   # 通过Web界面或API创建
   POST /api/agents
   {
     "name": "My RSS Collector",
     "type": "work.rss_collector",
     "config": {
       "dataSources": [
         {
           "url": "https://example.com/rss.xml",
           "type": "rss",
           "name": "Example RSS Feed"
         }
       ],
       "collectionRules": [
         {
           "name": "filter_tech_news",
           "selector": "category",
           "value": "technology"
         }
       ]
     }
   }
   ```

2. **配置Process Agent**
   ```bash
   POST /api/agents
   {
     "name": "Content Summarizer",
     "type": "process.text_processor",
     "config": {
       "processingRules": [
         {
           "type": "summarization",
           "maxLength": 200,
           "style": "concise"
         }
       ],
       "llmConfig": {
         "provider": "openai",
         "model": "gpt-3.5-turbo",
         "temperature": 0.3
       }
     }
   }
   ```

3. **设置Publish Agent**
   ```bash
   POST /api/agents
   {
     "name": "Twitter Publisher",
     "type": "publish.twitter",
     "config": {
       "targets": [
         {
           "platform": "twitter",
           "authentication": {
             "type": "oauth",
             "credentials": {
               "apiKey": "your-api-key",
               "apiSecret": "your-api-secret",
               "accessToken": "your-access-token",
               "accessTokenSecret": "your-access-token-secret"
             }
           }
         }
       ]
     }
   }
   ```

### 3. 创建工作流

1. **设计工作流**
   ```json
   {
     "name": "News Processing Workflow",
     "description": "Collect, process, and publish tech news",
     "nodes": [
       {
         "id": "collect",
         "type": "work.rss_collector",
         "agentId": "rss-collector-id",
         "config": {}
       },
       {
         "id": "process",
         "type": "process.text_processor",
         "agentId": "text-processor-id",
         "config": {}
       },
       {
         "id": "publish",
         "type": "publish.twitter",
         "agentId": "twitter-publisher-id",
         "config": {}
       }
     ],
     "connections": [
       { "from": "collect", "to": "process" },
       { "from": "process", "to": "publish" }
     ]
   }
   ```

2. **执行工作流**
   ```bash
   POST /api/workflows/{workflow-id}/execute
   {
     "input": {
       "data": [],
       "metadata": {
         "source": "manual_trigger"
       }
     }
   }
   ```

### 4. 监控和管理

1. **查看Agent状态**
   ```bash
   GET /api/agents/{agent-id}/status
   ```

2. **获取执行历史**
   ```bash
   GET /api/agents/{agent-id}/executions?limit=10
   ```

3. **查看性能指标**
   ```bash
   GET /api/agents/{agent-id}/metrics
   ```

## 🔧 Chrome插件使用

### 安装插件

1. **开发模式安装**
   - 打开Chrome扩展管理页面 (chrome://extensions/)
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `packages/chrome-extension` 目录

2. **生产环境安装**
   - 从Chrome Web Store安装（待发布）
   - 或下载.crx文件手动安装

### 使用插件

1. **连接钱包**
   - 点击插件图标打开弹窗
   - 点击"Connect Wallet"
   - 选择MetaMask并授权

2. **控制Agent**
   - 查看Agent状态和统计信息
   - 使用快速操作按钮触发Agent
   - 启动/停止特定Agent

3. **查看数据**
   - 预览采集的数据
   - 查看处理结果
   - 监控发布状态

4. **设置定时任务**
   - 配置Agent执行计划
   - 设置重复执行规则
   - 管理任务队列

## 📚 API文档

### 认证API

```bash
# 获取nonce
POST /api/auth/nonce
{
  "walletAddress": "0x..."
}

# 登录
POST /api/auth/login
{
  "walletAddress": "0x...",
  "signature": "0x...",
  "message": "..."
}

# 验证token
GET /api/auth/verify
Authorization: Bearer <token>
```

### Agent管理API

```bash
# 创建Agent
POST /api/agents
{
  "name": "Agent Name",
  "type": "work.web_scraper",
  "config": {...}
}

# 获取Agent列表
GET /api/agents

# 获取Agent详情
GET /api/agents/{id}

# 更新Agent
PUT /api/agents/{id}
{
  "config": {...}
}

# 删除Agent
DELETE /api/agents/{id}

# 执行Agent
POST /api/agents/{id}/execute
{
  "input": {...}
}
```

### 工作流API

```bash
# 创建工作流
POST /api/workflows
{
  "name": "Workflow Name",
  "definition": {...}
}

# 执行工作流
POST /api/workflows/{id}/execute
{
  "input": {...}
}

# 获取执行历史
GET /api/workflows/{id}/executions
```

## 🔍 故障排除

### 常见问题

1. **钱包连接失败**
   - 确保安装了MetaMask
   - 检查网络连接
   - 清除浏览器缓存

2. **Agent执行失败**
   - 检查Agent配置
   - 验证API密钥
   - 查看错误日志

3. **数据库连接问题**
   - 确保PostgreSQL服务运行
   - 检查连接字符串
   - 验证数据库权限

### 调试技巧

1. **启用调试日志**
   ```bash
   LOG_LEVEL=debug npm run dev
   ```

2. **查看Agent日志**
   ```bash
   GET /api/agents/{id}/logs
   ```

3. **监控系统资源**
   ```bash
   GET /api/system/metrics
   ```

### 性能优化

1. **Agent配置优化**
   - 调整执行间隔
   - 优化数据处理逻辑
   - 使用缓存减少API调用

2. **数据库优化**
   - 添加适当索引
   - 定期清理历史数据
   - 使用连接池

3. **资源监控**
   - 监控内存使用
   - 跟踪CPU占用
   - 优化网络请求

## 🆘 获取帮助

- **文档**: 查看详细的API文档和开发指南
- **社区**: 加入Discord社区讨论
- **问题反馈**: 在GitHub提交Issue
- **邮件支持**: support@multi-agent-platform.com

---

欢迎使用Multi-Agent Platform！如果您有任何问题或建议，请随时联系我们。