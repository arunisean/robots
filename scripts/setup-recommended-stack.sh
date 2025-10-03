#!/bin/bash

# 推荐技术栈设置脚本

echo "🎯 设置推荐的开发技术栈..."
echo ""
echo "📋 推荐架构："
echo "  🏠 本地开发: PostgreSQL + Redis (Homebrew)"
echo "  ☁️  云端测试: Supabase + Upstash"
echo "  🌐 生产部署: Cloudflare D1 + KV"
echo ""

# 检查操作系统
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  此脚本针对macOS优化，Linux用户请参考文档手动安装"
    exit 1
fi

# 检查Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ 请先安装Homebrew: https://brew.sh/"
    exit 1
fi

echo "🏠 设置本地开发环境..."

# 安装PostgreSQL和Redis
echo "📦 安装数据库服务..."
brew install postgresql@15 redis

# 启动服务
echo "🚀 启动服务..."
brew services start postgresql@15
brew services start redis

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 添加PostgreSQL到PATH
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# 创建数据库
echo "🗄️ 创建数据库..."
if createdb multi_agent_platform 2>/dev/null; then
    echo "  ✅ 数据库创建成功"
else
    echo "  ⚠️  数据库可能已存在"
fi

# 创建本地环境配置
echo "⚙️ 创建环境配置..."
mkdir -p packages/backend

cat > packages/backend/.env.local << 'EOF'
# 本地开发环境配置
DATABASE_URL=postgresql://localhost:5432/multi_agent_platform
REDIS_URL=redis://localhost:6379
NODE_ENV=development
JWT_SECRET=dev-jwt-secret-key-change-in-production
PORT=3001
HOST=localhost

# Web3配置
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# 开发模式配置
DEBUG=true
LOG_LEVEL=debug
EOF

echo "  ✅ 已创建 packages/backend/.env.local"

# 创建前端环境配置
cat > packages/frontend/.env.local << 'EOF'
# 前端环境配置
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NODE_ENV=development
EOF

echo "  ✅ 已创建 packages/frontend/.env.local"

# 测试连接
echo ""
echo "🧪 测试服务连接..."

# 测试PostgreSQL
if psql multi_agent_platform -c "SELECT version();" > /dev/null 2>&1; then
    echo "  ✅ PostgreSQL连接成功"
else
    echo "  ❌ PostgreSQL连接失败"
fi

# 测试Redis
if redis-cli ping > /dev/null 2>&1; then
    echo "  ✅ Redis连接成功"
else
    echo "  ❌ Redis连接失败"
fi

echo ""
echo "🎉 本地开发环境设置完成！"
echo ""
echo "📋 服务信息："
echo "  PostgreSQL: localhost:5432"
echo "    数据库: multi_agent_platform"
echo "    用户名: $(whoami)"
echo ""
echo "  Redis: localhost:6379"
echo ""
echo "🔧 管理命令："
echo "  启动服务: brew services start postgresql@15 redis"
echo "  停止服务: brew services stop postgresql@15 redis"
echo "  重启服务: brew services restart postgresql@15 redis"
echo "  连接数据库: psql multi_agent_platform"
echo "  测试Redis: redis-cli ping"
echo ""
echo "▶️  下一步："
echo "  1. cd packages/backend && npm run dev"
echo "  2. cd packages/frontend && npm run dev (新终端)"
echo ""
echo "📚 更多配置："
echo "  - 云端部署: docs/DEPLOYMENT_STRATEGY.md"
echo "  - Cloudflare配置: docs/CLOUDFLARE_SETUP.md"
echo ""
echo "💡 提示："
echo "  - 本地开发无需网络，完全离线工作"
echo "  - 数据持久化，重启不丢失"
echo "  - 支持所有PostgreSQL GUI工具"