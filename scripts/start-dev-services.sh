#!/bin/bash

# 多Agent自动化平台 - 开发服务启动脚本

echo "🚀 启动多Agent自动化平台开发服务..."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker Desktop"
    exit 1
fi

echo "✅ Docker已运行"

# 检查是否配置了镜像加速器
echo "🔍 检查Docker镜像配置..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    DAEMON_JSON="$HOME/.docker/daemon.json"
    if [ ! -f "$DAEMON_JSON" ] || ! grep -q "registry-mirrors" "$DAEMON_JSON" 2>/dev/null; then
        echo "⚠️  未检测到镜像加速器配置"
        echo "💡 建议运行以下命令配置镜像加速器以提高下载速度："
        echo "   ./scripts/setup-docker-mirrors.sh"
        echo ""
        read -p "是否现在配置镜像加速器？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./scripts/setup-docker-mirrors.sh
            echo "⏳ 请重启Docker Desktop后重新运行此脚本"
            exit 0
        fi
    else
        echo "✅ 已配置镜像加速器"
    fi
fi

# 创建网络（如果不存在）
docker network create multi-agent-network 2>/dev/null || true

echo "📦 启动数据库服务..."

# 启动PostgreSQL
echo "  - 启动PostgreSQL..."
docker run -d \
  --name multi-agent-postgres \
  --network multi-agent-network \
  -e POSTGRES_DB=multi_agent_platform \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -v "$(pwd)/packages/backend/src/database/migrations:/docker-entrypoint-initdb.d" \
  postgres:15-alpine 2>/dev/null || echo "  PostgreSQL容器已存在"

# 启动Redis
echo "  - 启动Redis..."
docker run -d \
  --name multi-agent-redis \
  --network multi-agent-network \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:7-alpine redis-server --appendonly yes 2>/dev/null || echo "  Redis容器已存在"

echo "⏳ 等待数据库服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."

# 检查PostgreSQL
if docker exec multi-agent-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "  ✅ PostgreSQL已就绪"
else
    echo "  ❌ PostgreSQL未就绪"
fi

# 检查Redis
if docker exec multi-agent-redis redis-cli ping > /dev/null 2>&1; then
    echo "  ✅ Redis已就绪"
else
    echo "  ❌ Redis未就绪"
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
echo "  - 查看日志: docker logs multi-agent-postgres"
echo "  - 停止服务: docker stop multi-agent-postgres multi-agent-redis"
echo "  - 删除容器: docker rm multi-agent-postgres multi-agent-redis"
echo "  - 连接数据库: docker exec -it multi-agent-postgres psql -U postgres -d multi_agent_platform"
echo ""
echo "▶️  现在可以启动后端服务: cd packages/backend && npm run dev"