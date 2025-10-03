# 多Agent自动化平台

一个基于Web3身份认证的去中心化Agent编排系统，支持数据采集、处理、发布和验证的完整自动化流程。

## 🚀 功能特性

- **统一Agent接口** - Work/Process/Publish/Validate四类Agent的标准化接口
- **Web3身份认证** - 支持MetaMask等ETH钱包登录
- **Chrome插件集成** - 便捷的Agent控制和数据查看
- **工作流编排** - 基于n8n的可视化工作流设计
- **Agent验证系统** - 自动评估Agent性能和质量
- **模板驱动开发** - 快速创建和部署新Agent

## 🏗️ 项目结构

```
multi-agent-platform/
├── packages/
│   ├── backend/          # 后端服务 (Fastify + PostgreSQL)
│   ├── frontend/         # 前端应用 (Next.js + React)
│   ├── chrome-extension/ # Chrome插件 (React + Webpack)
│   └── shared/           # 共享类型和工具
├── docker-compose.yml    # 开发环境配置
└── turbo.json           # Monorepo构建配置
```

## 🛠️ 开发环境设置

### 前置要求

- Node.js 18+
- Docker & Docker Compose
- Git

### 快速开始

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

## 📦 可用脚本

- `npm run dev` - 启动所有开发服务器
- `npm run build` - 构建所有包
- `npm run test` - 运行所有测试
- `npm run lint` - 代码检查
- `npm run type-check` - TypeScript类型检查

## 🏛️ 架构概览

### Agent类型

1. **Work Agent** - 数据采集Agent
   - 网页抓取、API调用、社交媒体采集
   - 支持多媒体内容处理

2. **Process Agent** - 数据处理Agent
   - 文本处理、内容生成、数据转换
   - 集成LLM服务和AI能力

3. **Publish Agent** - 内容发布Agent
   - 多平台发布：Twitter、LinkedIn、网页等
   - 智能内容格式化和调度

4. **Validate Agent** - 验证Agent
   - 性能监控、质量评估、安全扫描
   - 智能推荐和优化建议

### 技术栈

- **后端**: Fastify, PostgreSQL, Redis, ethers.js
- **前端**: Next.js, React, TailwindCSS, Zustand
- **Chrome插件**: React, Webpack, Chrome Extension API
- **基础设施**: Docker, Kubernetes, GitHub Actions

## 🔧 开发指南

### 创建新Agent

1. 继承对应的基础Agent类
2. 实现必要的接口方法
3. 配置Agent模板和验证规则
4. 编写单元测试

### 工作流设计

1. 使用n8n可视化编辑器
2. 拖拽Agent节点构建流程
3. 配置Agent参数和连接
4. 测试和部署工作流

## 📚 文档

- [API文档](./docs/api.md)
- [Agent开发指南](./docs/agent-development.md)
- [部署指南](./docs/deployment.md)
- [贡献指南](./docs/contributing.md)

## 🤝 贡献

欢迎提交Issue和Pull Request！请查看[贡献指南](./docs/contributing.md)了解详细信息。

## 📄 许可证

MIT License - 查看 [LICENSE](./LICENSE) 文件了解详情。
