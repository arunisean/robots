# 🚀 快速开始指南

## ⚠️ 当前项目状态

**项目处于早期开发阶段，存在一些技术债务需要先解决**

- 🔴 **TypeScript编译错误** - 需要修复类型定义问题
- 🔴 **数据库连接问题** - 需要配置本地数据库
- 🟡 **Chrome插件连接** - 需要修复API通信问题

## 📋 前置要求

- **Node.js 18+**
- **PostgreSQL 15+** (推荐使用Homebrew)
- **Redis** (推荐使用Homebrew)
- **MetaMask浏览器插件**

## 🛠️ 环境设置

### 1. 安装数据库服务

```bash
# 使用Homebrew安装
brew install postgresql@15 redis

# 启动服务
brew services start postgresql@15
brew services start redis

# 创建数据库
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
createdb multi_agent_platform
```

### 2. 克隆和安装项目

```bash
# 克隆项目
git clone https://github.com/arunisean/robots.git
cd robots

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# .env 文件已预配置本地数据库连接
```

### 3. 解决编译错误 (当前必需)

```bash
# 检查编译错误
npm run build

# 如果有错误，需要先修复再继续
# 查看具体错误信息并逐一解决
```

### 4. 启动开发服务

```bash
# 方式1: 启动所有服务 (需要修复编译错误后)
npm run dev

# 方式2: 分别启动 (推荐用于调试)
# 终端1: 启动后端
cd packages/backend && npm run dev

# 终端2: 启动前端  
cd packages/frontend && npm run dev
```

### 5. 加载Chrome插件

1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `packages/chrome-extension/` 文件夹

## 🌐 访问应用

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:3001
- **健康检查**: http://localhost:3001/health

## 🔧 故障排除

### 编译错误
```bash
# 查看详细错误
npm run build 2>&1 | tee build-errors.log

# 常见问题：
# 1. shared包类型导出问题
# 2. Agent接口继承问题  
# 3. 数据库连接类型问题
```

### 数据库连接问题
```bash
# 检查PostgreSQL状态
brew services list | grep postgresql

# 检查Redis状态  
brew services list | grep redis

# 测试数据库连接
psql multi_agent_platform -c "SELECT version();"
```

### Chrome插件问题
```bash
# 检查插件文件
ls -la packages/chrome-extension/

# 查看插件错误
# Chrome → 扩展程序 → 多Agent平台 → 错误
```

## 📋 开发流程

### 当前优先级 (按顺序处理)

1. **🔴 修复编译错误** (3-5天)
   - 修复shared包类型定义
   - 解决Agent接口问题
   - 修复数据库连接类型

2. **🔴 实现Web3认证** (5-7天)
   - MetaMask连接
   - JWT认证
   - 用户状态管理

3. **🟡 Agent基础功能** (7-10天)
   - Agent CRUD操作
   - 简单执行功能
   - 状态管理

4. **🟡 Chrome插件修复** (3-5天)
   - 修复API连接
   - 基础UI功能
   - 钱包集成

## 📚 相关文档

- [📋 详细开发计划](./DEVELOPMENT_PLAN.md)
- [📖 完整教程](./TUTORIAL.md)
- [🏗️ 系统设计](../.kiro/specs/multi-agent-platform/design.md)

## 🆘 获取帮助

如果遇到问题：

1. **查看开发计划** - 了解当前已知问题和解决方案
2. **检查GitHub Issues** - 查看是否有相同问题
3. **提交新Issue** - 详细描述问题和环境信息

## ⚡ 快速验证

运行以下命令验证环境是否正确设置：

```bash
# 检查Node.js版本
node --version  # 应该 >= 18

# 检查数据库连接
psql multi_agent_platform -c "SELECT 1;"

# 检查Redis连接
redis-cli ping  # 应该返回 PONG

# 检查项目依赖
npm list --depth=0

# 尝试构建 (当前会有错误)
npm run build
```

成功设置后，你就可以开始开发了！🎉