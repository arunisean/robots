# 回测系统测试指南

## 🎯 测试目标

验证回测系统的完整功能，包括：
1. 数据库迁移
2. 后端API
3. 前端管理界面
4. 数据下载功能

## 📋 前置条件

### 1. 安装依赖

```bash
# Backend dependencies
cd packages/backend
npm install unzipper @types/unzipper

# Frontend dependencies (if needed)
cd ../frontend
npm install
```

### 2. 确保数据库运行

```bash
# 启动PostgreSQL和Redis
docker-compose up postgres redis -d

# 或使用脚本
./start-databases.sh  # Linux/Mac
start-databases.bat   # Windows
```

### 3. 配置环境变量

确保 `packages/backend/.env` 包含：
```env
DATABASE_URL=postgresql://user:password@localhost:5432/multi_agent_platform
REDIS_URL=redis://localhost:6379
```

## 🧪 测试步骤

### Step 1: 运行数据库迁移

```bash
cd packages/backend
npm run db:migrate
```

**预期结果**:
- ✅ 创建6个新表
- ✅ 显示 "Migration 006_backtest_system.sql completed"

### Step 2: 测试后端系统

```bash
npx tsx src/test-backtest-system.ts
```

**预期结果**:
```
🧪 Testing Backtest System

1️⃣  Testing database connection...
✅ Database connected

2️⃣  Initializing services...
✅ Services initialized

3️⃣  Testing available symbols...
✅ Found 10 symbols: BTCUSDT, ETHUSDT, BNBUSDT, ...

4️⃣  Testing database queries...
✅ Found 0 symbols in database

5️⃣  Testing storage statistics...
✅ Storage stats: { totalDatasets: 0, totalSize: '0.00 MB' }

✅ All tests passed!
```

### Step 3: 启动后端服务器

```bash
npm run dev
```

**预期结果**:
- ✅ Server listening on port 3001
- ✅ Database connected
- ✅ Redis connected (optional)

### Step 4: 测试API端点

在新终端窗口：

#### 测试管理端点（localhost only）

```bash
# 列出可用交易对
curl http://localhost:3001/api/admin/data/symbols

# 获取存储统计
curl http://localhost:3001/api/admin/data/storage

# 列出数据集
curl http://localhost:3001/api/admin/data/datasets
```

**预期结果**: 返回JSON响应，无403错误

#### 测试公开端点

```bash
# 列出可用数据集
curl http://localhost:3001/api/data/datasets

# 获取可用交易对
curl http://localhost:3001/api/data/symbols
```

**预期结果**: 返回JSON响应

### Step 5: 启动前端服务器

在新终端窗口：

```bash
cd packages/frontend
npm run dev
```

**预期结果**:
- ✅ Server listening on port 3000

### Step 6: 访问管理界面

在浏览器中打开：

1. **主管理页面**: http://localhost:3000/data-admin
   - ✅ 显示 "Localhost Access Verified"
   - ✅ 显示3个管理卡片

2. **下载数据页面**: http://localhost:3000/data-download
   - ✅ 显示市场类型选择
   - ✅ 显示交易对列表
   - ✅ 显示时间周期选择
   - ✅ 显示日期范围选择

3. **数据管理页面**: http://localhost:3000/data-management
   - ✅ 显示数据集列表（初始为空）
   - ✅ 显示筛选选项

4. **存储统计页面**: http://localhost:3000/data-storage
   - ✅ 显示存储统计
   - ✅ 显示图表

### Step 7: 测试数据下载（小数据集）

在下载页面：

1. 选择 **Market Type**: Spot
2. 选择 **Symbol**: BTCUSDT（只选一个）
3. 选择 **Interval**: 1d（只选一个）
4. 设置 **Start Date**: 2024-01-01
5. 设置 **End Date**: 2024-01-31
6. 点击 **Start Download**

**预期结果**:
- ✅ 显示 "Download Started!"
- ✅ 返回Job ID
- ✅ 后端开始下载文件

### Step 8: 监控下载进度

使用API检查下载状态：

```bash
# 替换 {jobId} 为实际的Job ID
curl http://localhost:3001/api/admin/data/download/{jobId}
```

**预期结果**:
```json
{
  "success": true,
  "status": {
    "id": "...",
    "status": "downloading",
    "progress": {
      "totalFiles": 1,
      "downloadedFiles": 0,
      "downloadedBytes": 0
    }
  }
}
```

### Step 9: 验证下载的数据

下载完成后：

1. 刷新 **数据管理页面**
   - ✅ 显示新下载的数据集
   - ✅ 显示正确的统计信息

2. 查看 **存储统计页面**
   - ✅ 更新的存储使用量
   - ✅ 按市场类型和时间周期的分布

3. 检查文件系统：
```bash
ls -la data/historical/spot/BTCUSDT/1d/
```
   - ✅ 存在CSV文件

### Step 10: 测试数据查询

使用公开API查询数据：

```bash
curl -X POST http://localhost:3001/api/data/klines/query \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "interval": "1d",
    "marketType": "spot",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "limit": 10
  }'
```

**预期结果**: 返回K线数据数组

## ✅ 测试检查清单

### 后端
- [ ] 数据库迁移成功
- [ ] 测试脚本通过
- [ ] 服务器启动成功
- [ ] 管理API响应正常
- [ ] 公开API响应正常
- [ ] 非localhost访问管理API返回403

### 前端
- [ ] 前端服务器启动成功
- [ ] 主管理页面加载
- [ ] 本地访问检测工作
- [ ] 下载页面显示正常
- [ ] 管理页面显示正常
- [ ] 统计页面显示正常

### 功能
- [ ] 可以启动数据下载
- [ ] 下载进度跟踪工作
- [ ] 数据正确存储到文件系统
- [ ] 数据集元数据保存到数据库
- [ ] 可以查询下载的数据
- [ ] 可以删除数据集
- [ ] 存储统计正确计算

## 🐛 常见问题

### 1. "403 Forbidden" on Admin Endpoints

**问题**: 访问管理端点返回403
**解决**: 确保使用 `localhost` 或 `127.0.0.1` 访问

### 2. "unzipper not found"

**问题**: 缺少unzipper依赖
**解决**: 
```bash
cd packages/backend
npm install unzipper @types/unzipper
```

### 3. Database Connection Error

**问题**: 无法连接数据库
**解决**:
- 检查PostgreSQL是否运行
- 验证DATABASE_URL配置
- 运行 `npm run db:migrate`

### 4. Download Fails

**问题**: 数据下载失败
**解决**:
- 检查网络连接
- 验证交易对名称正确
- 检查日期范围是否有数据
- 查看后端日志

### 5. Frontend Can't Connect to Backend

**问题**: 前端无法连接后端
**解决**:
- 确保后端在3001端口运行
- 检查CORS配置
- 验证API_URL环境变量

## 📊 性能基准

### 小数据集（1个月，1个交易对，1d周期）
- 文件数: 1
- 大小: ~50 MB
- 下载时间: ~30秒
- 处理时间: ~5秒

### 中等数据集（1年，1个交易对，1h周期）
- 文件数: 12
- 大小: ~600 MB
- 下载时间: ~5分钟
- 处理时间: ~1分钟

### 大数据集（1年，10个交易对，多周期）
- 文件数: 100+
- 大小: ~5 GB
- 下载时间: ~30分钟
- 处理时间: ~10分钟

## 🎉 成功标准

系统测试成功的标准：

1. ✅ 所有API端点响应正常
2. ✅ 可以成功下载至少一个数据集
3. ✅ 下载的数据可以查询
4. ✅ 前端界面正常显示
5. ✅ 本地访问控制工作正常
6. ✅ 存储统计准确
7. ✅ 可以删除数据集

## 📝 测试报告模板

```
测试日期: ____________________
测试人员: ____________________

后端测试:
- 数据库迁移: [ ] 通过 [ ] 失败
- API测试: [ ] 通过 [ ] 失败
- 下载功能: [ ] 通过 [ ] 失败

前端测试:
- 界面加载: [ ] 通过 [ ] 失败
- 访问控制: [ ] 通过 [ ] 失败
- 数据显示: [ ] 通过 [ ] 失败

功能测试:
- 数据下载: [ ] 通过 [ ] 失败
- 数据查询: [ ] 通过 [ ] 失败
- 数据删除: [ ] 通过 [ ] 失败

问题记录:
_________________________________
_________________________________
_________________________________

总体评价: [ ] 通过 [ ] 需要修复
```

---

**准备好了吗？开始测试！** 🚀
