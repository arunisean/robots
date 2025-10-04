# 🧪 测试指南

## 🚀 快速开始

### 1. 启动开发环境

```bash
# 启动前端和后端
./scripts/start-dev.sh

# 查看日志
tail -f backend.log   # 后端日志
tail -f frontend.log  # 前端日志

# 停止服务
./scripts/stop-dev.sh
```

### 2. 访问应用

- **前端**: http://localhost:3000
- **后端API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001/api/ws

## 📋 测试清单

### 后端API测试

#### 1. 健康检查 ✅
```bash
curl http://localhost:3001/health
```

**预期结果**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-04T...",
  "version": "1.0.0"
}
```

#### 2. 列出工作流 ✅
```bash
curl http://localhost:3001/api/public/workflows
```

**预期结果**:
```json
{
  "success": true,
  "data": {
    "workflows": [],
    "total": 0,
    "limit": 50,
    "offset": 0
  }
}
```

#### 3. 创建工作流
```bash
curl -X POST http://localhost:3001/api/public/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "description": "My first workflow",
    "status": "active",
    "version": "1.0.0",
    "definition": {
      "nodes": [
        {
          "id": "agent-1",
          "agentType": "work",
          "agentCategory": "work",
          "config": {},
          "order": 0
        }
      ],
      "connections": []
    },
    "settings": {
      "maxConcurrentExecutions": 1,
      "executionTimeout": 300,
      "retryPolicy": {
        "enabled": false,
        "maxRetries": 3,
        "backoffStrategy": "exponential",
        "backoffMs": 1000
      },
      "errorHandling": {
        "strategy": "stop",
        "notifyOnError": true
      },
      "logging": {
        "level": "info",
        "retention": 30,
        "includeData": true
      }
    },
    "metadata": {
      "tags": ["test"],
      "category": "general"
    }
  }'
```

### 前端UI测试

#### 1. 工作流列表页面
**URL**: http://localhost:3000/workflows

**测试项目**:
- [ ] 页面正常加载
- [ ] 显示"No workflows yet"空状态
- [ ] "Create Workflow"按钮可点击
- [ ] 搜索框可输入
- [ ] 状态过滤器可选择

#### 2. 创建工作流页面
**URL**: http://localhost:3000/workflows/new

**测试项目**:
- [ ] 页面正常加载
- [ ] 表单字段可输入
  - [ ] Workflow Name
  - [ ] Description
  - [ ] Status
- [ ] Agent配置区域显示
- [ ] "Add Agent"按钮可点击
- [ ] "Create Workflow"按钮可点击
- [ ] 创建成功后跳转到详情页

**测试步骤**:
1. 访问 http://localhost:3000/workflows/new
2. 填写工作流名称: "My Test Workflow"
3. 填写描述: "This is a test"
4. 选择状态: "Active"
5. 保持默认的一个Agent
6. 点击"Create Workflow"
7. 验证跳转到工作流详情页

#### 3. 工作流详情页面
**URL**: http://localhost:3000/workflows/[id]

**测试项目**:
- [ ] 页面正常加载
- [ ] 显示工作流名称和描述
- [ ] 显示状态徽章
- [ ] "Execute"按钮可点击
- [ ] "Edit"按钮可点击
- [ ] 配置信息显示正确
- [ ] 统计数据显示
- [ ] 执行历史区域显示

#### 4. 编辑工作流页面
**URL**: http://localhost:3000/workflows/[id]/edit

**测试项目**:
- [ ] 页面正常加载
- [ ] 表单预填充现有数据
- [ ] 可以修改工作流信息
- [ ] 可以添加/删除Agent
- [ ] "Save Changes"按钮可点击
- [ ] 保存成功后跳转回详情页

#### 5. 执行详情页面
**URL**: http://localhost:3000/executions/[id]

**测试项目**:
- [ ] 页面正常加载
- [ ] 显示执行概览
- [ ] 显示Agent结果列表
- [ ] 显示统计摘要
- [ ] 错误信息正确显示（如果有）

### WebSocket实时监控测试

#### 1. 使用浏览器测试客户端
**URL**: file:///.../scripts/test-websocket.html

**测试步骤**:
1. 在浏览器中打开 `scripts/test-websocket.html`
2. 点击"Connect"按钮
3. 验证连接状态变为"Connected"
4. 输入一个执行ID
5. 点击"Subscribe"
6. 在另一个标签页执行工作流
7. 验证实时事件显示

#### 2. 使用前端监控组件
**测试步骤**:
1. 访问工作流详情页
2. 点击"Execute"按钮
3. 验证"Active Execution"区域出现
4. 验证进度条更新
5. 验证事件时间线显示
6. 验证状态指示器更新

## 🐛 常见问题

### 问题1: 前端无法连接后端
**症状**: API调用失败，CORS错误

**解决**:
```bash
# 检查后端是否运行
curl http://localhost:3001/health

# 检查CORS配置
# 确保后端允许 http://localhost:3000
```

### 问题2: 工作流创建失败
**症状**: 验证错误

**原因**: 工作流验证规则太严格

**临时解决**: 验证已在公共路由中禁用

### 问题3: WebSocket连接失败
**症状**: 无法建立WebSocket连接

**解决**:
```bash
# 检查WebSocket端点
curl http://localhost:3001/api/ws/health

# 检查防火墙设置
```

### 问题4: 页面404错误
**症状**: 访问页面返回404

**解决**:
```bash
# 重启前端服务器
./scripts/stop-dev.sh
./scripts/start-dev.sh
```

## 📊 测试报告模板

### 功能测试报告

**测试日期**: ___________  
**测试人员**: ___________

| 功能 | 状态 | 备注 |
|------|------|------|
| 后端健康检查 | ⬜ | |
| 列出工作流 | ⬜ | |
| 创建工作流 | ⬜ | |
| 工作流详情 | ⬜ | |
| 编辑工作流 | ⬜ | |
| 执行工作流 | ⬜ | |
| 执行详情 | ⬜ | |
| WebSocket连接 | ⬜ | |
| 实时监控 | ⬜ | |

### UI测试报告

| 页面 | 加载 | 交互 | 样式 | 备注 |
|------|------|------|------|------|
| 工作流列表 | ⬜ | ⬜ | ⬜ | |
| 创建工作流 | ⬜ | ⬜ | ⬜ | |
| 工作流详情 | ⬜ | ⬜ | ⬜ | |
| 编辑工作流 | ⬜ | ⬜ | ⬜ | |
| 执行详情 | ⬜ | ⬜ | ⬜ | |

## 🎯 下一步

完成测试后：

1. ✅ 记录所有发现的问题
2. ✅ 创建问题修复清单
3. ✅ 优先修复关键问题
4. ✅ 重新测试修复的功能
5. ✅ 更新文档

## 📝 测试脚本

### 自动化测试脚本
```bash
# 运行API测试
./scripts/test-workflow-api.sh

# 运行快速测试
./scripts/quick-test.sh
```

### 手动测试流程
1. 启动开发环境
2. 打开浏览器访问 http://localhost:3000
3. 按照测试清单逐项测试
4. 记录测试结果
5. 报告问题

---

**祝测试顺利！** 🚀

如果遇到问题，请查看日志文件：
- `backend.log` - 后端日志
- `frontend.log` - 前端日志
