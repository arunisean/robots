#!/bin/bash

# 后端服务启动脚本

echo "🚀 启动后端服务..."

# 检查数据库连接
echo "🔍 检查数据库连接..."
if psql multi_agent_platform -c "SELECT 1;" > /dev/null 2>&1; then
    echo "  ✅ PostgreSQL连接正常"
    BACKEND_MODE="full"
else
    echo "  ⚠️  PostgreSQL连接失败，使用简化模式"
    BACKEND_MODE="simple"
fi

if redis-cli ping > /dev/null 2>&1; then
    echo "  ✅ Redis连接正常"
else
    echo "  ⚠️  Redis连接失败"
fi

# 进入后端目录
cd packages/backend

# 检查环境配置
if [ ! -f ".env.local" ]; then
    echo "📝 创建环境配置文件..."
    cat > .env.local << 'EOF'
# 本地开发环境配置
DATABASE_URL=postgresql://localhost:5432/multi_agent_platform
REDIS_URL=redis://localhost:6379
NODE_ENV=development
JWT_SECRET=dev-jwt-secret-key
PORT=3001
HOST=localhost
LOG_LEVEL=info
EOF
    echo "  ✅ 已创建 .env.local"
fi

# 停止现有进程
echo "🛑 停止现有后端进程..."
pkill -f "tsx watch" 2>/dev/null || true
sleep 2

# 启动后端服务
echo "🚀 启动后端服务..."
if [ "$BACKEND_MODE" = "full" ]; then
    echo "  使用完整模式 (包含数据库)"
    npm run dev &
    BACKEND_PID=$!
else
    echo "  使用简化模式 (无数据库依赖)"
    npm run dev:simple &
    BACKEND_PID=$!
fi

echo "  后端进程ID: $BACKEND_PID"

# 等待服务启动
echo "⏳ 等待服务启动..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "  ✅ 后端服务已启动"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "  ❌ 后端服务启动超时"
        echo "  查看进程状态:"
        ps aux | grep tsx | grep -v grep || echo "  无tsx进程运行"
        exit 1
    fi
    sleep 1
done

# 测试API端点
echo ""
echo "🧪 测试API端点..."

echo "  - 健康检查:"
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
if [ $? -eq 0 ]; then
    echo "    ✅ /health: $HEALTH_RESPONSE"
else
    echo "    ❌ /health: 连接失败"
fi

echo "  - API状态:"
STATUS_RESPONSE=$(curl -s http://localhost:3001/api/status)
if [ $? -eq 0 ]; then
    echo "    ✅ /api/status: $STATUS_RESPONSE"
else
    echo "    ❌ /api/status: 连接失败"
fi

echo ""
echo "🎉 后端服务启动完成！"
echo ""
echo "📋 服务信息:"
echo "  - 后端API: http://localhost:3001"
echo "  - 健康检查: http://localhost:3001/health"
echo "  - API状态: http://localhost:3001/api/status"
echo "  - 进程ID: $BACKEND_PID"
echo ""
echo "🔧 管理命令:"
echo "  - 查看日志: tail -f packages/backend/logs/app.log"
echo "  - 停止服务: kill $BACKEND_PID"
echo "  - 重启服务: ./scripts/restart-backend.sh"
echo ""
echo "▶️  现在可以启动前端: cd packages/frontend && npm run dev"

# 保存PID到文件
echo $BACKEND_PID > /tmp/multi-agent-backend.pid
echo "💾 后端PID已保存到 /tmp/multi-agent-backend.pid"