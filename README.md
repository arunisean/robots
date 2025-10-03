# 🤖 多Agent自动化平台

基于Web3身份认证的去中心化Agent编排系统，支持数据采集、处理、发布和验证的完整自动化流程。

## ✨ 特性

- 🔐 **Web3身份认证** - 基于以太坊钱包的去中心化登录
- 🤖 **四类Agent系统** - Work/Process/Publish/Validate统一接口
- 🌐 **Chrome插件集成** - 浏览器内Agent控制和数据查看
- 🔄 **工作流编排** - 可视化Agent工作流设计
- 📊 **实时监控** - Agent性能监控和质量评估
- 🛡️ **安全沙箱** - 隔离的Agent执行环境

## 🚀 快速开始

### 前置要求

- **Node.js 18+**
- **Docker Desktop** (推荐)
- **MetaMask浏览器插件**

### 1. 克隆项目

```bash
git clone https://github.com/your-repo/multi-agent-platform.git
cd multi-agent-platform
npm install
```

### 2. 配置Docker镜像加速器 (解决网络问题)

```bash
# 自动配置镜像加速器
./scripts/setup-docker-mirrors.sh

# 重启Docker Desktop使配置生效
```

### 3. 启动数据库服务

```bash
# 方式1: 使用便捷脚本 (推荐)
./scripts/start-dev-services.sh

# 方式2: 使用简化版本 (网络问题时)
./scripts/start-dev-services-simple.sh

# 方式3: 使用Docker Compose
docker-compose up postgres redis -d
```

### 4. 启动应用服务

```bash
# 启动后端
cd packages/backend && npm run dev

# 启动前端 (新终端)
cd packages/frontend && npm run dev
```

### 5. 访问应用

- **前端应用**: http://localhost:3000
- **钱包测试页面**: http://localhost:3000/test-wallet
- **后端API**: http://localhost:3001

## 🐳 Docker配置解决方案

### 网络连接问题

如果遇到Docker镜像拉取失败，我们提供了完整的解决方案：

1. **自动配置镜像加速器**
   ```bash
   ./scripts/setup-docker-mirrors.sh
   ```

2. **手动配置** (参考 [Docker配置指南](./docs/DOCKER_SETUP.md))

3. **多种启动方式**
   - 标准Docker Compose
   - 独立容器启动
   - 简化版本 (使用通用镜像标签)

### 支持的镜像源

- 中科大镜像: `https://docker.mirrors.ustc.edu.cn`
- 网易镜像: `https://hub-mirror.c.163.com`
- 百度镜像: `https://mirror.baidubce.com`
- 腾讯镜像: `https://ccr.ccs.tencentyun.com`

## 📋 项目结构

```
multi-agent-platform/
├── packages/
│   ├── backend/          # Fastify API服务
│   ├── frontend/         # Next.js前端应用
│   ├── chrome-extension/ # Chrome浏览器插件
│   └── shared/           # 共享类型和工具
├── scripts/              # 开发脚本
├── docs/                 # 项目文档
└── docker-compose.yml    # Docker服务配置
```

## 🛠️ 开发工具

### 便捷脚本

```bash
# Docker服务管理
./scripts/start-dev-services.sh     # 启动数据库服务
./scripts/stop-dev-services.sh      # 停止数据库服务
./scripts/setup-docker-mirrors.sh   # 配置镜像加速器

# 项目构建和测试
npm run build                        # 构建所有包
npm run test                         # 运行测试
npm run lint                         # 代码检查
```

### 服务管理

```bash
# 查看运行状态
docker ps

# 查看服务日志
docker logs multi-agent-postgres
docker logs multi-agent-redis

# 连接数据库
docker exec -it multi-agent-postgres psql -U postgres -d multi_agent_platform

# 测试Redis
docker exec -it multi-agent-redis redis-cli ping
```

## 🧪 测试功能

访问 http://localhost:3000/test-wallet 进行Web3钱包集成测试：

- 钱包连接和断开
- 网络切换
- 消息签名
- 身份认证
- 实时状态监控

## 📚 文档

- [📋 开发计划](./docs/DEVELOPMENT_PLAN.md) - 详细的开发路线图
- [🚀 快速启动](./docs/QUICK_START.md) - 完整的环境设置指南
- [🐳 Docker配置](./docs/DOCKER_SETUP.md) - Docker镜像和网络问题解决方案
- [🏗️ 系统设计](./docs/ARCHITECTURE.md) - 系统架构和技术选型

## 🎯 开发状态

### ✅ 已完成

- [x] **Web3钱包认证系统** - MetaMask集成、签名认证、JWT管理
- [x] **Docker环境配置** - 镜像加速器、服务脚本、故障排除
- [x] **前端基础框架** - Next.js、React Hooks、响应式UI
- [x] **后端API基础** - Fastify、认证路由、数据库连接

### 🚧 进行中

- [ ] **Agent系统简化** - 最小可用Agent基类和接口
- [ ] **Chrome插件完善** - 修复连接问题、基础UI功能
- [ ] **数据库迁移** - 完善初始化脚本和种子数据

### 📋 计划中

- [ ] **Agent CRUD操作** - 前端管理界面
- [ ] **工作流编排** - 可视化设计器
- [ ] **监控系统** - 性能监控和日志分析

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 获取帮助

- 📖 查看 [文档](./docs/)
- 🐛 提交 [Issue](https://github.com/your-repo/multi-agent-platform/issues)
- 💬 参与 [讨论](https://github.com/your-repo/multi-agent-platform/discussions)

---

**🎉 感谢使用多Agent自动化平台！**