# 本地服务安装指南

## PostgreSQL 安装

### Windows (推荐使用 Chocolatey)
```bash
# 安装 Chocolatey (如果还没有)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装 PostgreSQL
choco install postgresql

# 或者直接下载安装包
# https://www.postgresql.org/download/windows/
```

### 配置 PostgreSQL
```bash
# 启动 PostgreSQL 服务
net start postgresql-x64-15

# 创建数据库
psql -U postgres
CREATE DATABASE multi_agent_platform;
\q
```

## Redis 安装

### Windows
```bash
# 使用 Chocolatey
choco install redis-64

# 或者下载 Windows 版本
# https://github.com/microsoftarchive/redis/releases
```

### 启动 Redis
```bash
# 启动 Redis 服务
redis-server

# 或者作为 Windows 服务
net start Redis
```

## 验证安装

### 测试 PostgreSQL
```bash
psql -U postgres -d multi_agent_platform -c "SELECT version();"
```

### 测试 Redis
```bash
redis-cli ping
```

## 快速启动脚本

创建 `start-services.bat`:
```batch
@echo off
echo 启动本地服务...

echo 启动 PostgreSQL...
net start postgresql-x64-15

echo 启动 Redis...
net start Redis

echo 服务启动完成！
pause
```

## 环境变量

确保 `.env` 文件包含：
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multi_agent_platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
```