#!/bin/bash

# Docker镜像源配置脚本

echo "🔧 配置Docker镜像加速器..."

# 检查操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "检测到macOS系统"
    
    # macOS Docker Desktop配置路径
    DOCKER_CONFIG_DIR="$HOME/.docker"
    DAEMON_JSON="$DOCKER_CONFIG_DIR/daemon.json"
    
    # 创建配置目录
    mkdir -p "$DOCKER_CONFIG_DIR"
    
    # 备份现有配置
    if [ -f "$DAEMON_JSON" ]; then
        cp "$DAEMON_JSON" "$DAEMON_JSON.backup.$(date +%Y%m%d_%H%M%S)"
        echo "✅ 已备份现有配置"
    fi
    
    # 创建新的daemon.json配置
    cat > "$DAEMON_JSON" << 'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ],
  "insecure-registries": [],
  "debug": false,
  "experimental": false,
  "features": {
    "buildkit": true
  }
}
EOF
    
    echo "✅ 已创建Docker配置文件: $DAEMON_JSON"
    echo ""
    echo "📋 配置的镜像源："
    echo "  - 中科大镜像: https://docker.mirrors.ustc.edu.cn"
    echo "  - 网易镜像: https://hub-mirror.c.163.com"
    echo "  - 百度镜像: https://mirror.baidubce.com"
    echo "  - 腾讯镜像: https://ccr.ccs.tencentyun.com"
    echo ""
    echo "⚠️  重要提示："
    echo "1. 请重启Docker Desktop以使配置生效"
    echo "2. 或者在Docker Desktop设置中手动添加这些镜像源"
    echo ""
    echo "🔄 Docker Desktop重启方法："
    echo "  - 点击菜单栏Docker图标"
    echo "  - 选择 'Restart'"
    echo "  - 等待重启完成"
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "检测到Linux系统"
    
    # Linux系统配置
    DAEMON_JSON="/etc/docker/daemon.json"
    
    # 检查是否有sudo权限
    if [ "$EUID" -ne 0 ]; then
        echo "❌ 需要sudo权限来配置Docker"
        echo "请使用: sudo $0"
        exit 1
    fi
    
    # 备份现有配置
    if [ -f "$DAEMON_JSON" ]; then
        cp "$DAEMON_JSON" "$DAEMON_JSON.backup.$(date +%Y%m%d_%H%M%S)"
        echo "✅ 已备份现有配置"
    fi
    
    # 创建新的daemon.json配置
    cat > "$DAEMON_JSON" << 'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ],
  "insecure-registries": [],
  "debug": false,
  "experimental": false
}
EOF
    
    echo "✅ 已创建Docker配置文件: $DAEMON_JSON"
    echo ""
    echo "🔄 重启Docker服务..."
    systemctl daemon-reload
    systemctl restart docker
    echo "✅ Docker服务已重启"
    
else
    echo "❌ 不支持的操作系统: $OSTYPE"
    exit 1
fi

echo ""
echo "🧪 测试镜像拉取..."
echo "正在测试拉取hello-world镜像..."

if docker pull hello-world; then
    echo "✅ 镜像拉取成功！配置生效"
    docker rmi hello-world > /dev/null 2>&1
else
    echo "❌ 镜像拉取失败，请检查网络连接或手动配置"
fi

echo ""
echo "🎉 Docker镜像加速器配置完成！"