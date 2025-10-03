#!/bin/bash

# 简化版开发服务启动脚本 - 使用本地镜像或基础镜像

echo "🚀 启动多Agent自动化平台开发服务 (简化版)..."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker Desktop"
    exit 1
fi

echo "✅ Docker已运行"

# 创建网络（如果不存在）
docker network create multi-agent-network 2>/dev/null || true

echo "📦 启动数据库服务..."

# 尝试使用更通用的镜像标签，避免网络问题
echo "  - 启动PostgreSQL..."
docker run -d \
  --name multi-agent-postgres \
  --network multi-agent-network \
  -e POSTGRES_DB=multi_agent_platform \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:latest 2>/dev/null || \
docker run -d \
  --name multi-agent-postgres \
  --network multi-agent-network \
  -e POSTGRES_DB=multi_agent_platform \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15 2>/dev/null || \
echo "  ⚠️  PostgreSQL容器启动失败或已存在"

echo "  - 启动Redis..."
docker run -d \
  --name multi-agent-redis \
  --network multi-agent-network \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:latest redis-server --appendonly yes 2>/dev/null || \
docker run -d \
  --name multi-agent-redis \
  --network multi-agent-network \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:7 redis-server --appendonly yes 2>/dev/null || \
echo "  ⚠️  Redis容器启动失败或已存在"

echo "⏳ 等待数据库服务启动..."
sleep 15

# 检查服务状态
echo "🔍 检查服务状态..."

# 检查PostgreSQL
if docker ps | grep -q multi-agent-postgres; then
    echo "  ✅ PostgreSQL容器正在运行"
    # 等待PostgreSQL完全启动
    for i in {1..30}; do
        if docker exec multi-agent-postgres pg_isready -U postgres > /dev/null 2>&1; then
            echo "  ✅ PostgreSQL已就绪"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "  ⚠️  PostgreSQL启动超时，但容器正在运行"
        fi
        sleep 1
    done
else
    echo "  ❌ PostgreSQL容器未运行"
fi

# 检查Redis
if docker ps | grep -q multi-agent-redis; then
    echo "  ✅ Redis容器正在运行"
    if docker exec multi-agent-redis redis-cli ping > /dev/null 2>&1; then
        echo "  ✅ Redis已就绪"
    else
        echo "  ⚠️  Redis未完全就绪，但容器正在运行"
    fi
else
    echo "  ❌ Redis容器未运行"
fi

echo ""
echo "🎉 开发服务启动完成！"
echo ""
echo "📋 服务信息："
echo "  - PostgreSQL: localhost:5432"
echo "    - 数据库: multi_agent_platform"
echo "    - 用户名: postgres"
echo "    - 密码: postgres"
echo ""
echo "  - Redis: localhost:6379"
echo ""
echo "🔧 管理命令："
echo "  - 查看容器状态: docker ps"
echo "  - 查看PostgreSQL日志: docker logs multi-agent-postgres"
echo "  - 查看Redis日志: docker logs multi-agent-redis"
echo "  - 停止服务: ./scripts/stop-dev-services.sh"
echo "  - 连接数据库: docker exec -it multi-agent-postgres psql -U postgres -d multi_agent_platform"
echo ""
echo "▶️  现在可以启动后端服务: cd packages/backend && npm run dev"

# 如果有数据库迁移文件，尝试执行
if [ -f "packages/backend/src/database/migrations/001_initial_schema.sql" ]; then
    echo ""
    echo "🗄️  检测到数据库迁移文件，尝试初始化数据库..."
    sleep 2
    if docker exec multi-agent-postgres psql -U postgres -d multi_agent_platform -f /docker-entrypoint-initdb.d/001_initial_schema.sql > /dev/null 2>&1; then
        echo "  ✅ 数据库初始化成功"
    else
        echo "  ⚠️  数据库可能已初始化或迁移文件未挂载"
    fi
fi