# Agent配置面板测试指南

## 问题修复

### 之前的问题
- 更新了错误的文件：`src/pages/workflows/new.tsx`
- Next.js实际使用：`pages/workflows/new.tsx`（根目录）
- 导致UI没有任何变化

### 已修复
✅ 更新了正确的文件：`packages/frontend/pages/workflows/new.tsx`
✅ 修复了导入路径
✅ 集成了WalletConnection和AuthGuard

## 测试步骤

### 1. 启动服务

**终端1 - 启动后端：**
```bash
cd packages/backend
npm run dev
```

**终端2 - 启动前端：**
```bash
cd packages/frontend
npm run dev
```

### 2. 访问页面

打开浏览器访问：http://localhost:3000/workflows/new

### 3. 测试流程

#### 步骤1：连接钱包
- 页面右上角应该显示"Connect Wallet"按钮
- 点击连接MetaMask钱包
- 连接成功后显示钱包地址

#### 步骤2：填写基本信息
- 输入工作流名称（必填）
- 输入描述（可选）
- 选择状态（Draft/Active/Paused）

#### 步骤3：添加Agent
- 点击"+ Add Agent"按钮
- 应该打开Agent选择模态框
- 选择一个Category（如WORK）
- 选择一个Type（如"网页抓取器"）
- Agent应该添加到列表中

#### 步骤4：配置Agent ⭐ **这是新功能！**
- 在Agent卡片上，应该看到"⚙️ Configure"按钮
- 点击"Configure"按钮
- **应该打开配置面板模态框**
- **看到根据Agent类型动态生成的表单**

#### 步骤5：填写配置
- 填写表单字段
- 测试必填字段（留空应该显示错误）
- 测试格式验证（输入错误的URL格式）
- 测试数字范围（输入超出min/max的值）
- 应该看到实时验证反馈

#### 步骤6：保存配置
- 点击"保存"按钮
- 配置应该保存到Agent
- 配置面板应该关闭
- Agent卡片应该更新

#### 步骤7：创建工作流
- 点击"Create Workflow"按钮
- 应该创建工作流并跳转到详情页

## 预期结果

### ✅ 应该看到的

1. **Agent卡片上的Configure按钮**
   ```
   ┌─────────────────────────────────────┐
   │ 1. 网页抓取器                        │
   │    work.web_scraper                 │
   │                                     │
   │ [WORK]                              │
   │                                     │
   │ ↑ ↓ ⚙️Configure Change Remove      │
   └─────────────────────────────────────┘
   ```

2. **配置面板模态框**
   ```
   ┌─────────────────────────────────────┐
   │ Agent配置              网页抓取器    │
   │                              [X]    │
   ├─────────────────────────────────────┤
   │                                     │
   │ 基本配置                             │
   │                                     │
   │ 名称 *                              │
   │ [________________]                  │
   │                                     │
   │ 描述                                │
   │ [________________]                  │
   │                                     │
   │ 启用                                │
   │ [✓] 是否启用此Agent                 │
   │                                     │
   │ 目标URL *                           │
   │ [________________]                  │
   │ 请输入要抓取的网页地址               │
   │                                     │
   ├─────────────────────────────────────┤
   │ [重置]              [取消] [保存]   │
   └─────────────────────────────────────┘
   ```

3. **实时验证反馈**
   - 必填字段留空：红色边框 + 错误消息
   - 格式错误：红色边框 + "请输入有效的URL地址"
   - 填写正确：绿色边框

### ❌ 如果没看到

**问题1：没有Configure按钮**
- 检查是否使用了正确的文件
- 检查浏览器控制台是否有错误
- 尝试清除浏览器缓存并刷新

**问题2：点击Configure没反应**
- 打开浏览器控制台查看错误
- 检查API是否正常（/api/agent-types/:id）
- 检查网络请求是否成功

**问题3：配置面板显示空白**
- 检查ConfigSchema是否正确
- 检查浏览器控制台错误
- 检查Agent类型是否有configSchema字段

## 调试技巧

### 1. 检查API响应

打开浏览器开发者工具 → Network标签

点击Configure按钮时，应该看到：
```
GET /api/agent-types/work.web_scraper
Status: 200
Response: {
  "success": true,
  "data": {
    "id": "work.web_scraper",
    "configSchema": { ... },
    ...
  }
}
```

### 2. 检查控制台日志

打开浏览器开发者工具 → Console标签

应该没有错误。如果有错误，记录下来。

### 3. 检查组件渲染

在浏览器开发者工具 → Elements标签

搜索"NoCodeConfigPanel"，应该能找到对应的DOM元素。

### 4. 检查状态

在NoCodeConfigPanel.tsx中添加console.log：
```typescript
console.log('Config Schema:', configSchema);
console.log('Form Structure:', formStructure);
console.log('Current Config:', config);
```

## 常见问题

### Q: 点击Configure按钮没反应
**A:** 
1. 检查浏览器控制台是否有错误
2. 检查API是否返回正确的数据
3. 检查agentTypeDetails是否正确设置

### Q: 配置面板显示但没有字段
**A:**
1. 检查ConfigSchema是否正确
2. 检查SchemaParser是否正确解析
3. 在控制台查看formStructure

### Q: 保存配置后没有更新
**A:**
1. 检查handleConfigSave是否被调用
2. 检查config是否正确更新到agents数组
3. 检查React状态是否正确更新

### Q: 验证不工作
**A:**
1. 检查Validator.validateField是否被调用
2. 检查validation rules是否正确
3. 检查errors state是否正确更新

## 成功标准

测试通过的标准：

- ✅ 能看到Configure按钮
- ✅ 点击后打开配置面板
- ✅ 看到动态生成的表单字段
- ✅ 必填字段验证工作
- ✅ 格式验证工作
- ✅ 能保存配置
- ✅ 配置正确更新到Agent

## 下一步

如果测试通过：
1. 继续Phase 2（字段分组折叠、更多字段类型）
2. 或者补充缺失的Agent实现类

如果测试失败：
1. 记录错误信息
2. 检查上述调试步骤
3. 修复问题后重新测试

