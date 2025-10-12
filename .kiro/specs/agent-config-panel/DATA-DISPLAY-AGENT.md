# Data Display Agent - 调试利器

## 概述

Data Display Agent是一个特殊的调试Agent，可以插入到工作流的任意位置来展示中间数据。它不会修改数据流，只是将数据格式化后输出到执行结果中。

## 特点

### 1. 非破坏性 ✅
- 数据透传：原样传递输入数据到下一个Agent
- 不修改数据结构
- 不影响工作流执行

### 2. 灵活插入 ✅
- 可以插入到工作流的任意位置
- 可以插入多个Data Display Agent
- 用于监控不同阶段的数据

### 3. 多种显示格式 ✅
- **JSON**: 完整的JSON格式（带深度和长度限制）
- **Table**: 表格格式（适合数组数据）
- **Text**: 纯文本格式
- **Summary**: 数据摘要（类型、长度、键等）

### 4. 可配置 ✅
- 显示格式
- 字段过滤
- 深度限制
- 长度截断

## 使用场景

### 场景1：调试数据转换
```
Web Scraper → [Data Display] → Text Processor → [Data Display] → Twitter Publisher
                    ↓                                  ↓
              查看原始数据                        查看处理后数据
```

### 场景2：监控数据质量
```
API Collector → [Data Display] → Content Generator
                      ↓
                 验证API返回格式
```

### 场景3：快速检查
```
RSS Collector → [Data Display]
                      ↓
                 查看订阅内容
```

## 配置选项

### 基本配置
- **Name**: Agent名称
- **Description**: 描述
- **Enabled**: 是否启用
- **Display Format**: 显示格式（json/table/text/summary）
- **Fields to Display**: 要显示的字段（逗号分隔，空=全部）

### 高级配置
- **Max Depth**: 最大嵌套深度（1-10，默认5）
- **Truncate Length**: 字符串截断长度（100-10000，默认1000）

## 配置示例

### 示例1：完整JSON显示
```json
{
  "name": "Data Inspector",
  "displayFormat": "json",
  "maxDepth": 10,
  "truncateLength": 5000
}
```

### 示例2：表格显示
```json
{
  "name": "Table View",
  "displayFormat": "table",
  "fieldsToDisplay": "title,author,date"
}
```

### 示例3：快速摘要
```json
{
  "name": "Quick Summary",
  "displayFormat": "summary",
  "maxDepth": 2
}
```

## 输出格式

### JSON格式
```json
{
  "success": true,
  "data": { ... }, // 原始数据（透传）
  "metadata": {
    "displayData": {
      // 格式化后的数据
    },
    "summary": {
      "type": "object",
      "keyCount": 5,
      "keys": ["title", "content", ...]
    }
  }
}
```

### Table格式
```json
{
  "metadata": {
    "displayData": {
      "headers": ["title", "author", "date"],
      "rows": [
        ["Article 1", "John", "2024-01-01"],
        ["Article 2", "Jane", "2024-01-02"]
      ],
      "count": 2
    }
  }
}
```

### Summary格式
```json
{
  "metadata": {
    "displayData": {
      "type": "array",
      "length": 10,
      "sample": [...]
    }
  }
}
```

## 在详情页显示

当工作流执行时，Data Display Agent的输出会显示在执行结果中：

```
Workflow Execution Results
├── Agent 1: Web Scraper
│   └── Output: {...}
├── Agent 2: Data Display ⭐
│   └── Display: {
│         "type": "array",
│         "count": 10,
│         "data": [...]
│       }
├── Agent 3: Text Processor
│   └── Output: {...}
```

## 技术实现

### Agent类
- **类名**: DataDisplayAgent
- **继承**: ValidateAgent
- **类别**: VALIDATE
- **文件**: `packages/backend/src/agents/validate/DataDisplayAgent.ts`

### 核心方法
- `execute()`: 格式化并显示数据
- `formatDataForDisplay()`: 根据配置格式化数据
- `generateSummary()`: 生成数据摘要

### 特殊处理
- 即使执行失败，也会透传输入数据
- 不会中断工作流执行
- 错误只记录在metadata中

## 优势

### 1. 零影响
- 不修改数据
- 不影响性能
- 可以随时添加/删除

### 2. 即时反馈
- 执行时立即看到数据
- 无需额外工具
- 直接在详情页显示

### 3. 灵活配置
- 多种显示格式
- 可配置详细程度
- 适应不同需求

### 4. 易于使用
- 配置简单
- 无需外部依赖
- 开箱即用

## 使用建议

### 开发阶段
- 在每个Agent后添加Data Display
- 验证数据转换是否正确
- 快速定位问题

### 测试阶段
- 在关键节点添加Data Display
- 监控数据质量
- 验证业务逻辑

### 生产环境
- 在关键节点保留Data Display
- 设置为summary格式减少输出
- 用于监控和告警

## 统计

- **Agent总数**: 9个（新增1个）
- **VALIDATE类别**: 1个（从0到1）
- **调试工具**: 1个

## 下一步

现在你可以：
1. ✅ 在工作流中添加Data Display Agent
2. ✅ 配置显示格式
3. ✅ 执行工作流
4. ✅ 在详情页查看中间数据

**这是一个非常实用的调试工具！** 🎉

