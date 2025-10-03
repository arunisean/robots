# ☁️ 云服务替代方案

如果本地容器方案都有问题，可以考虑使用云服务：

## 🗄️ 数据库云服务

### 1. Supabase (推荐)
- **免费额度**: 500MB数据库，50MB文件存储
- **PostgreSQL兼容**: 完全兼容现有代码
- **设置简单**: 几分钟即可创建数据库

```bash
# 安装Supabase CLI
npm install -g supabase

# 登录并创建项目
supabase login
supabase init
supabase start
```

### 2. PlanetScale
- **免费额度**: 5GB存储，10亿行读取
- **MySQL兼容**: 需要调整SQL语法
- **无服务器**: 自动扩缩容

### 3. Railway
- **免费额度**: $5/月额度
- **支持PostgreSQL和Redis**
- **一键部署**: 直接从GitHub部署

## 📦 Redis云服务

### 1. Upstash Redis
- **免费额度**: 10,000命令/天
- **全球分布**: 低延迟访问
- **REST API**: 支持HTTP调用

### 2. Redis Cloud
- **免费额度**: 30MB内存
- **高可用**: 自动故障转移

## 🚀 快速设置脚本

### Supabase设置
```bash
# 1. 创建Supabase项目
# 访问 https://supabase.com/dashboard
# 创建新项目并获取连接信息

# 2. 更新环境变量
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
REDIS_URL=redis://localhost:6379  # 或使用Upstash Redis URL
EOF

# 3. 运行数据库迁移
cd packages/backend
npm run migrate
```

### Railway设置
```bash
# 1. 安装Railway CLI
npm install -g @railway/cli

# 2. 登录并创建项目
railway login
railway init

# 3. 添加PostgreSQL和Redis
railway add postgresql
railway add redis

# 4. 获取连接信息
railway variables
```

## 🔧 本地开发配置

创建 `packages/backend/.env.local`:

```env
# Supabase
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Upstash Redis
REDIS_URL=redis://:[password]@[endpoint]:6379

# 或者Railway
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/railway
REDIS_URL=redis://:[password]@[host]:6379
```

## 💡 推荐方案

### 方案1: Supabase + Upstash (完全免费)
```bash
./scripts/setup-supabase.sh
./scripts/setup-upstash.sh
```

### 方案2: Railway (一站式)
```bash
./scripts/setup-railway.sh
```

### 方案3: 本地PostgreSQL + 云Redis
```bash
./scripts/setup-local-services.sh  # 只安装PostgreSQL
# 然后配置Upstash Redis
```

这些云服务方案可以完全替代本地容器，而且通常更稳定、更快速！