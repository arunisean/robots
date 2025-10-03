# 🐳 Docker配置指南

## 解决Docker网络连接问题

如果遇到Docker镜像拉取失败的问题，可以通过配置镜像加速器来解决。

## 🚀 自动配置 (推荐)

```bash
# 运行自动配置脚本
./scripts/setup-docker-mirrors.sh
```

## 🔧 手动配置

### macOS (Docker Desktop)

1. **打开Docker Desktop设置**
   - 点击菜单栏的Docker图标
   - 选择 "Settings" 或"偏好设置"

2. **配置镜像源**
   - 点击左侧 "Docker Engine"
   - 在JSON配置中添加以下内容：

```json
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
```

3. **应用配置**
   - 点击 "Apply & Restart"
   - 等待Docker重启完成

### Linux

1. **创建或编辑配置文件**
```bash
sudo mkdir -p /etc/docker
sudo nano /etc/docker/daemon.json
```

2. **添加配置内容**
```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ]
}
```

3. **重启Docker服务**
```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## 📋 推荐的镜像源

| 镜像源 | 地址 | 说明 |
|--------|------|------|
| 中科大 | `https://docker.mirrors.ustc.edu.cn` | 稳定性好，速度快 |
| 网易 | `https://hub-mirror.c.163.com` | 老牌镜像源 |
| 百度 | `https://mirror.baidubce.com` | 百度云提供 |
| 腾讯 | `https://ccr.ccs.tencentyun.com` | 腾讯云提供 |

## 🧪 测试配置

配置完成后，测试镜像拉取：

```bash
# 测试拉取小镜像
docker pull hello-world

# 测试拉取项目需要的镜像
docker pull postgres:15-alpine
docker pull redis:7-alpine
```

## 🔍 故障排除

### 1. 配置不生效

**检查配置文件**
```bash
# macOS
cat ~/.docker/daemon.json

# Linux
sudo cat /etc/docker/daemon.json
```

**重启Docker**
```bash
# macOS: 通过Docker Desktop界面重启

# Linux
sudo systemctl restart docker
```

### 2. 仍然无法拉取镜像

**检查网络连接**
```bash
# 测试网络连接
ping docker.mirrors.ustc.edu.cn
curl -I https://docker.mirrors.ustc.edu.cn
```

**尝试其他镜像源**
- 如果某个镜像源不可用，Docker会自动尝试下一个
- 可以调整镜像源的顺序

**使用代理**
```bash
# 如果有代理，可以配置Docker使用代理
# 在daemon.json中添加：
{
  "proxies": {
    "default": {
      "httpProxy": "http://proxy.example.com:8080",
      "httpsProxy": "http://proxy.example.com:8080"
    }
  }
}
```

### 3. 权限问题

**Linux用户权限**
```bash
# 将用户添加到docker组
sudo usermod -aG docker $USER

# 重新登录或运行
newgrp docker
```

## 🚀 启动项目服务

配置完成后，就可以正常启动项目服务了：

```bash
# 启动数据库服务
./scripts/start-dev-services.sh

# 或使用docker-compose
docker-compose up postgres redis -d
```

## 📊 验证服务状态

```bash
# 查看运行中的容器
docker ps

# 查看容器日志
docker logs multi-agent-postgres
docker logs multi-agent-redis

# 测试数据库连接
docker exec -it multi-agent-postgres psql -U postgres -d multi_agent_platform -c "SELECT version();"

# 测试Redis连接
docker exec -it multi-agent-redis redis-cli ping
```

## 💡 其他优化建议

### 1. 清理Docker空间

```bash
# 清理未使用的镜像、容器、网络
docker system prune -a

# 清理未使用的卷
docker volume prune
```

### 2. 监控资源使用

```bash
# 查看Docker资源使用情况
docker system df

# 查看容器资源使用
docker stats
```

### 3. 设置资源限制

在Docker Desktop设置中：
- 调整内存限制 (推荐4GB+)
- 调整CPU核心数
- 调整磁盘空间

这样配置后，Docker应该能够正常拉取和运行项目所需的镜像了！🎉