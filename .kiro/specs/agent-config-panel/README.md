# Agent配置面板 Spec

## 概述

这个spec定义了Agent配置面板（No-Code Config Panel）的完整实现方案。配置面板是Agent Type架构中最关键的用户交互组件，让用户能够通过可视化表单配置Agent参数，而无需编写JSON代码。

## 文档结构

- **requirements.md** - 需求文档（12个用户故事和验收标准）
- **design.md** - 设计文档（架构、组件、数据模型）
- **tasks.md** - 实施任务列表（20个主要任务，分4个阶段）
- **README.md** - 本文档（快速参考）

## 快速开始

### 1. 阅读需求文档
了解用户需求和验收标准：
```bash
cat .kiro/specs/agent-config-panel/requirements.md
```

### 2. 查看设计文档
理解技术架构和实现方案：
```bash
cat .kiro/specs/agent-config-panel/design.md
```

### 3. 开始执行任务
打开任务文件，从Phase 1开始：
```bash
cat .kiro/specs/agent-config-panel/tasks.md
```

## 核心功能

### 动态表单生成
根据Agent类型的ConfigSchema自动生成配置表单，支持多种字段类型和验证规则。

### 支持的字段类型
- Input（文本、URL、邮箱）
- Textarea（多行文本）
- Select（下拉选择）
- Checkbox（复选框）
- Slider（滑块）
- Number（数字输入）
- Password（密码输入）
- Object（嵌套对象）

### 实时验证
在用户输入时提供即时反馈，支持必填、格式、范围等验证规则。

### 条件显示
根据其他字段的值动态显示/隐藏字段，简化用户界面。

### 配置预设
提供预定义的配置模板，让用户快速开始。

### Code/No-Code切换
高级用户可以在可视化表单和JSON编辑器之间切换。

## 实施阶段

### Phase 1: 核心功能 (MVP)
**目标：** 实现基本的配置表单功能

**关键任务：**
1. 创建类型定义和工具函数
2. 实现基础字段组件
3. 实现DynamicFormField
4. 实现NoCodeConfigPanel主容器
5. 集成到工作流创建页面

**完成标准：**
- 用户可以打开配置面板
- 可以填写基础字段（input, textarea, select, checkbox）
- 可以保存配置到Agent
- 有基本的验证和错误提示

### Phase 2: 增强功能
**目标：** 增强用户体验和功能完整性

**关键任务：**
1. 实现字段分组
2. 添加更多字段类型
3. 实现条件显示
4. 实现配置预设
5. 优化实时验证

**完成标准：**
- 字段按分组组织
- 支持所有常用字段类型
- 字段可以根据条件显示/隐藏
- 用户可以选择和应用预设
- 验证性能良好

### Phase 3: 高级功能
**目标：** 提供高级功能满足专业用户需求

**关键任务：**
1. 实现Code/No-Code模式切换
2. 实现异步验证
3. 实现配置摘要生成

**完成标准：**
- 可以在表单和代码模式间切换
- 保存时调用后端验证
- Agent卡片显示配置摘要

### Phase 4: 完善体验
**目标：** 优化性能、无障碍访问、国际化

**关键任务：**
1. 响应式设计
2. 无障碍访问
3. 国际化
4. 性能优化
5. 错误处理
6. 测试（可选）
7. 文档（可选）

**完成标准：**
- 在所有设备上都能良好使用
- 支持键盘导航和屏幕阅读器
- 支持中英文
- 性能流畅
- 错误处理完善

## 技术栈

- **React** - UI框架
- **TypeScript** - 类型安全
- **TailwindCSS** - 样式
- **Zod** - 运行时验证
- **react-window** - 虚拟滚动（可选）
- **monaco-editor** - 代码编辑器（可选）

## 文件结构

```
packages/frontend/src/components/agent-config/
├── NoCodeConfigPanel.tsx          # 主容器
├── ConfigPanelHeader.tsx          # 头部
├── ConfigPanelBody.tsx            # 主体
├── ConfigPanelFooter.tsx          # 底部
├── PresetSelector.tsx             # 预设选择器
├── FieldGroup.tsx                 # 字段分组
├── DynamicFormField.tsx           # 动态字段
├── fields/                        # 字段组件
│   ├── InputField.tsx
│   ├── TextareaField.tsx
│   ├── SelectField.tsx
│   ├── CheckboxField.tsx
│   ├── SliderField.tsx
│   ├── NumberField.tsx
│   ├── PasswordField.tsx
│   └── ObjectField.tsx
├── JsonEditor.tsx                 # JSON编辑器
├── utils/                         # 工具函数
│   ├── SchemaParser.ts
│   ├── Validator.ts
│   ├── ConditionalRenderer.ts
│   ├── ConfigSummary.ts
│   └── ErrorHandler.ts
├── hooks/                         # 自定义Hooks
│   ├── useConfigForm.ts
│   ├── useFieldValidation.ts
│   └── useConditionalVisibility.ts
└── types/                         # 类型定义
    ├── schema.ts
    ├── field.ts
    └── validation.ts
```

## 开发流程

### 1. 选择任务
从 tasks.md 中选择一个未完成的任务。

### 2. 理解需求
查看任务关联的需求编号，阅读对应的需求。

### 3. 实现功能
按照设计文档实现功能。

### 4. 测试验证
验证功能是否满足验收标准。

### 5. 标记完成
在 tasks.md 中标记任务为完成。

## 验收标准

完成后，系统应该满足以下标准：

### 用户体验
- [ ] 用户可以通过表单配置Agent参数
- [ ] 表单根据Agent类型动态生成
- [ ] 提供实时验证和错误提示
- [ ] 支持配置预设快速开始
- [ ] 在所有设备上都能良好使用

### 功能完整性
- [ ] 支持所有常用字段类型
- [ ] 支持字段分组和条件显示
- [ ] 支持Code/No-Code模式切换
- [ ] 支持配置保存和应用
- [ ] 支持配置摘要显示

### 性能和质量
- [ ] 配置面板打开时间 < 500ms
- [ ] 字段验证响应时间 < 100ms
- [ ] 支持至少50个字段的表单
- [ ] 无明显的性能问题
- [ ] 错误处理完善

### 无障碍和国际化
- [ ] 支持键盘导航
- [ ] 支持屏幕阅读器
- [ ] 支持中英文
- [ ] 符合WCAG 2.1 AA标准

## 相关资源

### API文档
- GET /api/agent-types/:id - 获取Agent类型详情（包含ConfigSchema）
- POST /api/agent-types/:id/validate - 验证配置

### 现有组件
- CategorySelector - Category选择组件
- TypeSelector - Type选择组件
- workflows/new.tsx - 工作流创建页面

### 参考实现
- packages/backend/src/data/sample-agent-types.ts - Agent类型定义示例
- packages/shared/src/types/agent-type.ts - ConfigSchema类型定义

## 常见问题

### Q: 如何添加新的字段类型？
A: 
1. 在 fields/ 目录创建新的字段组件
2. 在 DynamicFormField 的 getFieldComponent() 中添加映射
3. 更新类型定义

### Q: 如何处理复杂的嵌套对象？
A: 使用 ObjectField 组件递归渲染子字段。

### Q: 如何优化大型表单的性能？
A: 
1. 使用 React.memo 避免不必要的重渲染
2. 使用 debounce 延迟验证
3. 对于超过50个字段，使用虚拟滚动

### Q: 如何测试配置面板？
A: 
1. 单元测试：测试工具函数和字段组件
2. 集成测试：测试完整的配置流程
3. E2E测试：测试用户创建工作流的完整流程

## 下一步

完成这个spec后，建议继续以下工作：

1. **补充缺失的Agent实现类**
   - APICollectorAgent
   - LinkedInPublishAgent
   - WebsitePublishAgent

2. **实现Agent详情模态框**
   - 显示完整文档
   - 配置示例
   - 使用场景

3. **实现工作流执行和监控**
   - 执行工作流
   - 实时监控
   - 结果展示

## 联系和反馈

如有问题或建议，请：
1. 查看设计文档了解详细信息
2. 查看需求文档了解验收标准
3. 查看任务列表了解实施步骤

