#!/bin/bash

# 多Agent自动化平台 - 开发服务停止脚本

echo "🛑 停止多Agent自动化平台开发服务..."

# 停止容器
echo "📦 停止数据库服务..."
docker stop multi-agent-postgres multi-agent-redis 2>/dev/null || true

echo "🗑️  删除容器..."
docker rm multi-agent-postgres multi-agent-redis 2>/dev/null || true

echo "✅ 开发服务已停止"
echo ""
echo "💡 提示："
echo "  - 数据已保存在Docker卷中，下次启动时会自动恢复"
echo "  - 如需完全清理数据，请运行: docker volume rm postgres_data redis_data"