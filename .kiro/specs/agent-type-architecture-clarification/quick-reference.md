# Agent Type系统 - 快速参考

## 🚀 快速开始

### 获取所有Agent类型

```typescript
import { agentTypeRegistry } from './services/AgentTypeRegistry';

// 获取所有类型
const allTypes = agentTypeRegistry.getAllTypes();
console.log(`共有 ${allTypes.length} 个Agent类型`);

// 按Category获取
const workTypes = agentTypeRegistry.getTypesByCategory(AgentCategory.WORK);
console.log(`WORK类型: ${workTypes.length} 个`);
```

### 搜索Agent类型

```typescript
// 搜索
const results = agentTypeRegistry.searchTypes('抓取');
console.log(`找到 ${results.length} 个匹配的类型`);

// 复杂筛选
const filtered = agentTypeRegistry.filterTypes({
  category: AgentCategory.WORK,
  complexity: 'easy',
  minRating: 4.5
});
```

### 验证配置

```typescript
const config = {
  name: '我的抓取器',
  url: 'https://example.com',
  selectors: { title: 'h1' }
};

const validation = agentTypeRegistry.validateConfig('work.web_scraper', config);
if (validation.isValid) {
  console.log('配置有效！');
} else {
  console.log('错误:', validation.errors);
}
```

### 获取推荐

```typescript
const recommendations = agentTypeRegistry.getRecommendedTypes(
  '我想抓取网页内容并生成文章'
);
console.log('推荐的Agent:', recommendations);
```

## 📋 可用的Agent类型

### WORK (数据收集)

```typescript
'work.web_scraper'      // 网页抓取器 - 使用CSS选择器抓取网页
'work.api_collector'    // API收集器 - 从REST API收集数据
'work.rss_collector'    // RSS收集器 - 从RSS/Atom订阅源收集
```

### PROCESS (数据处理)

```typescript
'process.content_generator'  // 内容生成器 - AI驱动的内容生成
'process.text_processor'     // 文本处理器 - 文本清洗和转换
```

### PUBLISH (内容发布)

```typescript
'publish.twitter'    // Twitter发布器 - 发布到Twitter
'publish.linkedin'   // LinkedIn发布器 - 发布到LinkedIn
'publish.website'    // 网站发布器 - 发布到网站
```

## 🔧 ConfigSchema构建

### 使用Builder创建Schema

```typescript
import { ConfigSchemaBuilder, ConfigFields } from '@multi-agent-platform/shared';

const schema = new ConfigSchemaBuilder()
  .addBasicFields()                    // 添加name, description, enabled
  .addField('url', ConfigFields.url('目标URL'))
  .addField('method', ConfigFields.select(
    'HTTP方法',
    'HTTP请求方法',
    ['GET', 'POST', 'PUT', 'DELETE'],
    'GET'
  ))
  .addScheduleFields()                 // 添加调度配置
  .addErrorHandlingFields()            // 添加错误处理
  .setRequired(['name', 'url'])
  .build();
```

### 预定义字段

```typescript
ConfigFields.url(title, description)           // URL字段
ConfigFields.cssSelector(title, description)   // CSS选择器
ConfigFields.apiKey(title, description)        // API密钥
ConfigFields.text(title, description, placeholder)  // 文本输入
ConfigFields.textarea(title, description, placeholder)  // 文本区域
ConfigFields.select(title, description, options, default)  // 下拉选择
ConfigFields.number(title, description, min, max, default)  // 数字输入
ConfigFields.boolean(title, description, default)  // 布尔值
ConfigFields.object(title, description, properties)  // 对象
```

## 🗺️ Type到Implementation映射

### 查询映射

```typescript
import { 
  getImplementationInfo,
  hasImplementation,
  AGENT_TYPE_TO_CLASS_MAP 
} from './data/agent-type-mappings';

// 检查是否有实现
if (hasImplementation('work.web_scraper')) {
  const info = getImplementationInfo('work.web_scraper');
  console.log('实现类:', info.className);
  console.log('模块路径:', info.modulePath);
}

// 直接查询映射表
const className = AGENT_TYPE_TO_CLASS_MAP['work.web_scraper'];
// => 'WebScraperAgent'
```

### 添加新的映射

```typescript
// 在 agent-type-mappings.ts 中添加
export const AGENT_TYPE_TO_CLASS_MAP = {
  // ... 现有映射
  'work.my_collector': 'MyCollectorAgent',  // 新增
};

export const AGENT_CLASS_TO_MODULE_MAP = {
  // ... 现有映射
  'MyCollectorAgent': '../agents/work/MyCollectorAgent',  // 新增
};
```

## 📡 API端点

### GET /api/agent-types

获取所有Agent类型（支持筛选）

```bash
# 获取所有
GET /api/agent-types

# 按Category筛选
GET /api/agent-types?category=WORK

# 搜索
GET /api/agent-types?search=抓取

# 只返回摘要
GET /api/agent-types?summary=true

# 复杂筛选
GET /api/agent-types?category=WORK&complexity=easy&minRating=4.5
```

### GET /api/agent-types/:id

获取特定Agent类型的详细信息

```bash
GET /api/agent-types/work.web_scraper
```

### GET /api/agent-types/categories/:category

按Category获取Agent类型

```bash
GET /api/agent-types/categories/WORK
GET /api/agent-types/categories/PROCESS
GET /api/agent-types/categories/PUBLISH
```

### POST /api/agent-types/:id/validate

验证配置

```bash
POST /api/agent-types/work.web_scraper/validate
Content-Type: application/json

{
  "name": "测试抓取器",
  "url": "https://example.com",
  "selectors": {
    "title": "h1",
    "content": ".content"
  }
}
```

### POST /api/agent-types/recommend

获取推荐

```bash
POST /api/agent-types/recommend
Content-Type: application/json

{
  "scenario": "我想抓取网页内容并生成文章发布到Twitter"
}
```

### GET /api/agent-types/statistics

获取统计信息

```bash
GET /api/agent-types/statistics
```

## 🧪 测试

### 运行功能测试

```bash
cd packages/backend
npx ts-node src/scripts/test-agent-types.ts
```

### 运行映射测试

```bash
cd packages/backend
npx ts-node src/scripts/test-implementation-mapping.ts
```

## 📝 添加新Agent类型的步骤

### 1. 创建实现类（可选，可以先定义Type）

```typescript
// packages/backend/src/agents/work/MyAgent.ts
export class MyAgent extends WorkAgent {
  // 实现必需的方法
}
```

### 2. 添加Type定义

```typescript
// packages/backend/src/data/sample-agent-types.ts
{
  id: 'work.my_agent',
  name: 'My Agent',
  displayName: { zh: '我的Agent', en: 'My Agent' },
  description: '描述',
  icon: '🎯',
  category: AgentCategory.WORK,
  // ... 其他字段
  configSchema: (() => {
    const builder = new ConfigSchemaBuilder()
      .addBasicFields()
      // 添加自定义字段
      .setRequired(['name']);
    return builder.build();
  })(),
  implementation: getImplementationInfo('work.my_agent') || undefined
}
```

### 3. 添加映射

```typescript
// packages/backend/src/data/agent-type-mappings.ts
export const AGENT_TYPE_TO_CLASS_MAP = {
  // ...
  'work.my_agent': 'MyAgent',
};

export const AGENT_CLASS_TO_MODULE_MAP = {
  // ...
  'MyAgent': '../agents/work/MyAgent',
};
```

### 4. 测试

```bash
npx ts-node src/scripts/test-agent-types.ts
npx ts-node src/scripts/test-implementation-mapping.ts
```

## 🎨 前端使用示例

### 获取Agent类型列表

```typescript
// 在React组件中
const [agentTypes, setAgentTypes] = useState([]);

useEffect(() => {
  fetch('/api/agent-types?summary=true')
    .then(res => res.json())
    .then(data => setAgentTypes(data.data));
}, []);
```

### 按Category显示

```typescript
const [workTypes, setWorkTypes] = useState([]);

useEffect(() => {
  fetch('/api/agent-types/categories/WORK')
    .then(res => res.json())
    .then(data => setWorkTypes(data.data));
}, []);
```

### 验证配置

```typescript
const validateConfig = async (typeId, config) => {
  const response = await fetch(`/api/agent-types/${typeId}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  const result = await response.json();
  return result.data;
};
```

## 🔍 常见问题

### Q: 如何添加新的配置字段？

A: 在ConfigSchema中使用addField方法：

```typescript
.addField('myField', {
  type: 'string',
  title: '我的字段',
  description: '字段描述',
  ui: { widget: 'input' }
})
```

### Q: 如何实现字段依赖？

A: 使用conditional配置：

```typescript
.addField('conditionalField', {
  type: 'string',
  title: '条件字段',
  ui: {
    widget: 'input',
    conditional: {
      field: 'parentField',
      value: 'specificValue'
    }
  }
})
```

### Q: 如何添加配置预设？

A: 在Type定义的configPresets数组中添加：

```typescript
configPresets: [
  {
    id: 'preset-id',
    name: '预设名称',
    description: '预设描述',
    scenario: '适用场景',
    config: { /* 配置对象 */ },
    tags: ['标签'],
    isOfficial: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]
```

### Q: Type定义和Implementation不一致怎么办？

A: 运行映射测试检查：

```bash
npx ts-node src/scripts/test-implementation-mapping.ts
```

会显示所有不一致的地方。

## 📚 相关文档

- [完整设计文档](./design.md)
- [实施状态报告](./implementation-status.md)
- [最终总结](./final-summary.md)
- [进度报告](./progress.md)

## 🎯 快速链接

- **Type定义**: `packages/shared/src/types/agent-type.ts`
- **Schema工具**: `packages/shared/src/utils/config-schema.ts`
- **Agent类型**: `packages/backend/src/data/sample-agent-types.ts`
- **映射表**: `packages/backend/src/data/agent-type-mappings.ts`
- **Registry**: `packages/backend/src/services/AgentTypeRegistry.ts`
- **API路由**: `packages/backend/src/routes/agent-types.ts`
