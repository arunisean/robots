# 多Agent自动化平台

一个基于Web3身份认证的去中心化Agent编排系统，支持数据采集、处理、发布和验证的完整自动化流程。

## 🚧 项目状态

**当前版本**: v0.1.0-alpha  
**开发阶段**: 基础设施完善阶段  
**预计MVP完成**: 5周后

### 📋 开发进度
- [x] 项目基础架构搭建
- [ ] 🔴 **进行中**: 修复TypeScript编译错误
- [ ] 🔴 **下一步**: Web3钱包认证集成
- [ ] 🟡 **计划中**: Agent CRUD功能
- [ ] 🟡 **计划中**: Chrome插件基础功能

## 🎯 核心功能 (按优先级排序)

### 🔴 第一阶段 - 基础功能 (1-2周)
- **Web3身份认证** - MetaMask钱包连接和JWT认证
- **Agent基础管理** - Agent的创建、编辑、删除和状态管理
- **简单Agent执行** - 手动触发Agent执行和结果查看

### 🟡 第二阶段 - 核心功能 (2-3周)
- **Chrome插件集成** - 浏览器内的Agent快速控制
- **Agent模板系统** - 预定义Agent模板和快速创建
- **基础调度功能** - 定时执行和简单工作流

### 🟢 第三阶段 - 增强功能 (3-4周)
- **数据可视化** - Agent执行历史和性能图表
- **工作流编排** - 可视化Agent连接和数据流
- **页面数据提取** - Chrome插件的页面内容抓取

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

## 🚀 快速开始

⚠️ **项目当前处于早期开发阶段，存在一些需要先解决的技术债务**

### 📋 前置要求
- Node.js 18+ 
- PostgreSQL 15+ + Redis (推荐Homebrew安装)
- MetaMask浏览器插件

### ⚡ 5分钟设置
```bash
# 1. 克隆和安装
git clone https://github.com/arunisean/robots.git
cd robots && npm install

# 2. 安装数据库
brew install postgresql@15 redis
brew services start postgresql@15 redis
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
createdb multi_agent_platform

# 3. 配置和启动
cp .env.example .env
npm run dev  # ⚠️ 当前会有编译错误，需要先修复
```

### 🔧 当前状态
- 🔴 **TypeScript编译错误** - 需要修复类型定义
- 🔴 **数据库连接问题** - 需要配置本地环境  
- 🟡 **Chrome插件连接** - 需要修复API通信

**详细设置指南**: [📖 快速开始](./docs/QUICK_START.md)

## 📦 可用脚本

### 全局脚本
- `npm run dev` - 启动所有开发服务器 (⚠️ 需要先修复编译错误)
- `npm run build` - 构建所有包 (⚠️ 当前有编译错误)
- `npm run test` - 运行所有测试
- `npm run lint` - 代码检查
- `npm run type-check` - TypeScript类型检查

### 包级别脚本
```bash
# 后端服务
cd packages/backend
npm run dev          # 启动后端开发服务器
npm run dev:simple   # 启动简化版后端 (无数据库依赖)

# 前端服务
cd packages/frontend
npm run dev          # 启动前端开发服务器
npm run build        # 构建前端

# Chrome插件
cd packages/chrome-extension
# 插件已构建完成，直接加载到Chrome即可
```

### 数据库管理
```bash
# 启动/停止数据库服务
brew services start postgresql@15
brew services stop postgresql@15
brew services start redis
brew services stop redis

# 数据库操作
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
createdb multi_agent_platform    # 创建数据库
dropdb multi_agent_platform      # 删除数据库
psql multi_agent_platform        # 连接数据库
```

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

- [📋 开发计划](./docs/DEVELOPMENT_PLAN.md) - 详细的开发进度和里程碑规划
- [📖 完整教程](./docs/TUTORIAL.md) - 从安装到部署的完整指南
- [🏗️ 系统设计](./.kiro/specs/multi-agent-platform/design.md) - 架构设计和技术方案
- [📝 需求文档](./.kiro/specs/multi-agent-platform/requirements.md) - 功能需求和验收标准
- [✅ 任务列表](./.kiro/specs/multi-agent-platform/tasks.md) - 详细的实施计划

## 🚨 当前状态和下一步

### 立即需要处理的问题
1. **🔴 修复TypeScript编译错误** - 运行 `npm run build` 查看具体错误
2. **🔴 确保数据库正常运行** - PostgreSQL和Redis服务状态
3. **🟡 Chrome插件连接问题** - 修复与后端API的通信

### 本周开发重点
- 解决所有编译错误，确保项目能正常启动
- 实现基础的Web3钱包认证功能
- 修复Chrome插件的基础连接问题

详细的开发计划和进度安排请查看 [📋 开发计划](./docs/DEVELOPMENT_PLAN.md)

## 🤝 贡献

欢迎提交Issue和Pull Request！开发前请先查看[开发计划](./docs/DEVELOPMENT_PLAN.md)了解当前进度和优先级。

## 📄 许可证

MIT License - 查看 [LICENSE](./LICENSE) 文件了解详情。
