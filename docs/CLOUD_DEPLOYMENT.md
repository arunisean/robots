# ☁️ 云端部署指南

## 🎯 部署架构

### Cloudflare生态部署方案

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Cloudflare Pages│    │ Cloudflare Workers│   │ 云数据库服务     │
│ (前端静态资源)   │────│ (后端API)        │───│ (PostgreSQL)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────┐            ┌─────────┐            ┌─────────┐
    │ Next.js │            │ Hono.js │            │ Neon DB │
    │ Static  │            │ Runtime │            │ Supabase│
    └─────────┘            └─────────┘            └─────────┘
```

## 🗄️ 云数据库选择

### 1. Neon (推荐)
- **优势**: Serverless PostgreSQL，自动扩缩容
- **集成**: 原生支持Cloudflare Workers
- **价格**: 免费额度充足

```bash
# 安装Neon CLI
npm install -g @neondatabase/cli

# 创建数据库
neon projects create --name multi-agent-platform
```

### 2. Supabase
- **优势**: 完整的BaaS解决方案
- **功能**: 数据库 + 认证 + 实时订阅
- **集成**: REST API + GraphQL

### 3. PlanetScale
- **优势**: MySQL兼容，分支管理
- **特色**: 数据库版本控制

## 🚀 Cloudflare Workers后端

### 1. 重构后端为Workers

<function_calls>
<invoke name="fsWrite">
<parameter name="path">packages/workers/package.json