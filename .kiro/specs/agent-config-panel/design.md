# Agent配置面板设计文档

## 概述

Agent配置面板是一个动态表单生成系统，根据Agent类型的ConfigSchema自动生成可视化配置界面。它是实现"No-Code"理念的核心组件，让用户无需编写JSON即可配置Agent参数。

### 设计目标

1. **动态性**：根据不同Agent类型的schema自动生成表单
2. **易用性**：提供直观的UI和实时反馈
3. **灵活性**：支持多种字段类型和复杂的配置结构
4. **可扩展性**：易于添加新的字段类型和验证规则
5. **性能**：即使在复杂表单中也保持流畅

## 架构

### 组件层次结构

```
NoCodeConfigPanel (容器组件)
├── ConfigPanelHeader (头部：标题、模式切换、预设选择)
├── ConfigPanelBody (主体：表单或代码编辑器)
│   ├── FormMode (表单模式)
│   │   ├── FieldGroup (字段分组)
│   │   │   └── DynamicFormField (动态字段)
│   │   │       ├── InputField (文本输入)
│   │   │       ├── TextareaField (多行文本)
│   │   │       ├── SelectField (下拉选择)
│   │   │       ├── CheckboxField (复选框)
│   │   │       ├── SliderField (滑块)
│   │   │       ├── NumberField (数字输入)
│   │   │       └── ObjectField (对象字段，递归)
│   │   └── FieldValidation (验证提示)
│   └── CodeMode (代码模式)
│       └── JsonEditor (JSON编辑器)
└── ConfigPanelFooter (底部：保存、取消、重置按钮)
```

### 数据流

```
ConfigSchema (from API)
    ↓
SchemaParser (解析schema)
    ↓
FormStructure (表单结构)
    ↓
DynamicFormField (渲染字段)
    ↓
User Input (用户输入)
    ↓
Validator (验证)
    ↓
ConfigData (配置数据)
    ↓
onSave callback (保存回调)
```

## 组件设计

### 1. NoCodeConfigPanel (主容器)

**职责：**
- 管理配置面板的整体状态
- 协调子组件之间的交互
- 处理保存、取消、重置操作

**Props：**
```typescript
interface NoCodeConfigPanelProps {
  agentTypeId: string;              // Agent类型ID
  configSchema: ConfigSchema;        // 配置schema
  initialConfig?: Record<string, any>; // 初始配置
  configPresets?: ConfigPreset[];    // 配置预设
  onSave: (config: Record<string, any>) => void;  // 保存回调
  onCancel: () => void;              // 取消回调
  language?: 'zh' | 'en';            // 语言
}
```

**State：**
```typescript
interface ConfigPanelState {
  mode: 'form' | 'code';             // 当前模式
  config: Record<string, any>;       // 当前配置
  errors: Record<string, string>;    // 验证错误
  touched: Record<string, boolean>;  // 字段是否被触摸
  selectedPreset: string | null;     // 选中的预设
  isModified: boolean;               // 是否已修改
  isValidating: boolean;             // 是否正在验证
}
```

### 2. SchemaParser (Schema解析器)

**职责：**
- 解析ConfigSchema
- 提取字段定义、分组、顺序
- 构建表单结构

**核心方法：**
```typescript
class SchemaParser {
  // 解析schema为表单结构
  static parse(schema: ConfigSchema): FormStructure;
  
  // 提取字段列表
  static extractFields(schema: ConfigSchema): FieldDefinition[];
  
  // 按分组组织字段
  static groupFields(fields: FieldDefinition[]): FieldGroup[];
  
  // 排序字段
  static sortFields(fields: FieldDefinition[]): FieldDefinition[];
  
  // 解析字段依赖关系
  static parseDependencies(fields: FieldDefinition[]): DependencyMap;
}
```

**数据结构：**
```typescript
interface FormStructure {
  groups: FieldGroup[];              // 字段分组
  fields: FieldDefinition[];         // 所有字段
  dependencies: DependencyMap;       // 依赖关系
}

interface FieldGroup {
  id: string;                        // 分组ID
  name: string;                      // 分组名称
  order: number;                     // 显示顺序
  collapsible: boolean;              // 是否可折叠
  defaultExpanded: boolean;          // 默认是否展开
  fields: FieldDefinition[];         // 分组内的字段
}

interface FieldDefinition {
  path: string;                      // 字段路径（如 "schedule.type"）
  type: string;                      // 数据类型
  title: string;                     // 显示标题
  description?: string;              // 描述
  required: boolean;                 // 是否必填
  default?: any;                     // 默认值
  ui: UIConfig;                      // UI配置
  validation: ValidationRules;       // 验证规则
  conditional?: ConditionalConfig;   // 条件显示配置
}

interface UIConfig {
  widget: WidgetType;                // 控件类型
  placeholder?: string;              // 占位符
  helpText?: string;                 // 帮助文本
  group?: string;                    // 所属分组
  order?: number;                    // 显示顺序
}

type WidgetType = 
  | 'input' 
  | 'textarea' 
  | 'select' 
  | 'checkbox' 
  | 'slider' 
  | 'number'
  | 'password'
  | 'url'
  | 'email';
```

### 3. DynamicFormField (动态字段组件)

**职责：**
- 根据字段定义渲染对应的输入控件
- 处理用户输入
- 显示验证错误

**Props：**
```typescript
interface DynamicFormFieldProps {
  field: FieldDefinition;            // 字段定义
  value: any;                        // 当前值
  error?: string;                    // 错误信息
  touched: boolean;                  // 是否被触摸
  onChange: (value: any) => void;    // 值变化回调
  onBlur: () => void;                // 失焦回调
  language?: 'zh' | 'en';            // 语言
}
```

**实现：**
```typescript
const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  field,
  value,
  error,
  touched,
  onChange,
  onBlur,
  language = 'zh'
}) => {
  // 根据widget类型选择对应的组件
  const FieldComponent = getFieldComponent(field.ui.widget);
  
  return (
    <div className="form-field">
      <label>
        {field.title}
        {field.required && <span className="required">*</span>}
      </label>
      
      <FieldComponent
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={field.ui.placeholder}
        {...field.validation}
      />
      
      {field.ui.helpText && (
        <p className="help-text">{field.ui.helpText}</p>
      )}
      
      {touched && error && (
        <p className="error-text">{error}</p>
      )}
    </div>
  );
};
```

### 4. Validator (验证器)

**职责：**
- 验证字段值
- 生成错误消息
- 支持同步和异步验证

**核心方法：**
```typescript
class Validator {
  // 验证单个字段
  static validateField(
    field: FieldDefinition,
    value: any,
    allValues: Record<string, any>
  ): string | null;
  
  // 验证整个配置
  static validateConfig(
    schema: ConfigSchema,
    config: Record<string, any>
  ): Record<string, string>;
  
  // 异步验证（调用API）
  static async validateConfigAsync(
    agentTypeId: string,
    config: Record<string, any>
  ): Promise<ValidationResult>;
}
```

**验证规则：**
```typescript
interface ValidationRules {
  required?: boolean;                // 必填
  pattern?: string;                  // 正则表达式
  minLength?: number;                // 最小长度
  maxLength?: number;                // 最大长度
  minimum?: number;                  // 最小值
  maximum?: number;                  // 最大值
  format?: 'uri' | 'email' | 'date'; // 格式
  custom?: (value: any) => string | null; // 自定义验证
}
```

### 5. ConditionalRenderer (条件渲染器)

**职责：**
- 根据条件决定字段是否显示
- 监听依赖字段的变化
- 清除隐藏字段的值

**实现：**
```typescript
const useConditionalVisibility = (
  field: FieldDefinition,
  allValues: Record<string, any>
): boolean => {
  if (!field.conditional) return true;
  
  const { field: dependentField, value: expectedValue } = field.conditional;
  const actualValue = getNestedValue(allValues, dependentField);
  
  return actualValue === expectedValue;
};
```

### 6. PresetSelector (预设选择器)

**职责：**
- 显示可用的配置预设
- 应用预设到表单
- 标识官方预设

**Props：**
```typescript
interface PresetSelectorProps {
  presets: ConfigPreset[];           // 预设列表
  selectedPreset: string | null;     // 当前选中的预设
  onSelect: (presetId: string) => void; // 选择回调
  language?: 'zh' | 'en';            // 语言
}
```

### 7. JsonEditor (JSON编辑器)

**职责：**
- 提供代码编辑器界面
- 语法高亮
- 实时验证JSON格式

**实现：**
使用现有的JSON编辑器库（如react-json-view或monaco-editor）

## 数据模型

### ConfigSchema (配置Schema)

```typescript
interface ConfigSchema {
  type: 'object';
  properties: Record<string, PropertySchema>;
  required?: string[];
}

interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  title?: string;
  description?: string;
  default?: any;
  enum?: any[];
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  properties?: Record<string, PropertySchema>; // for object type
  ui?: {
    widget?: WidgetType;
    placeholder?: string;
    helpText?: string;
    group?: string;
    order?: number;
    conditional?: {
      field: string;
      value: any;
    };
  };
}
```

### ConfigPreset (配置预设)

```typescript
interface ConfigPreset {
  id: string;                        // 预设ID
  name: string;                      // 预设名称
  description: string;               // 描述
  scenario: string;                  // 适用场景
  config: Record<string, any>;       // 配置值
  tags: string[];                    // 标签
  isOfficial: boolean;               // 是否官方预设
  usageCount: number;                // 使用次数
  createdAt: string;                 // 创建时间
  updatedAt: string;                 // 更新时间
}
```

## 错误处理

### 错误类型

1. **验证错误**：字段值不符合验证规则
2. **Schema错误**：ConfigSchema格式错误
3. **API错误**：网络请求失败
4. **JSON错误**：代码模式下JSON格式错误

### 错误处理策略

```typescript
class ErrorHandler {
  // 处理验证错误
  static handleValidationError(error: ValidationError): void {
    // 高亮错误字段
    // 显示错误消息
    // 滚动到第一个错误字段
  }
  
  // 处理Schema错误
  static handleSchemaError(error: SchemaError): void {
    // 降级到JSON编辑器模式
    // 显示错误提示
  }
  
  // 处理API错误
  static handleAPIError(error: APIError): void {
    // 显示友好的错误消息
    // 提供重试选项
  }
  
  // 处理JSON错误
  static handleJSONError(error: SyntaxError): void {
    // 高亮错误位置
    // 显示错误消息
    // 阻止模式切换
  }
}
```

## 性能优化

### 1. 防抖和节流

```typescript
// 输入防抖
const debouncedValidate = useMemo(
  () => debounce((value) => validate(value), 300),
  []
);

// 滚动节流
const throttledScroll = useMemo(
  () => throttle((e) => handleScroll(e), 100),
  []
);
```

### 2. 虚拟滚动

对于字段数量超过50个的表单，使用虚拟滚动：

```typescript
import { FixedSizeList } from 'react-window';

const VirtualFieldList: React.FC = ({ fields }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={fields.length}
      itemSize={80}
    >
      {({ index, style }) => (
        <div style={style}>
          <DynamicFormField field={fields[index]} />
        </div>
      )}
    </FixedSizeList>
  );
};
```

### 3. 记忆化

```typescript
// 记忆化字段组件
const MemoizedField = React.memo(DynamicFormField, (prev, next) => {
  return (
    prev.value === next.value &&
    prev.error === next.error &&
    prev.touched === next.touched
  );
});

// 记忆化表单结构
const formStructure = useMemo(
  () => SchemaParser.parse(configSchema),
  [configSchema]
);
```

### 4. 懒加载

```typescript
// 懒加载JSON编辑器
const JsonEditor = lazy(() => import('./JsonEditor'));

// 使用Suspense
<Suspense fallback={<LoadingSpinner />}>
  <JsonEditor value={config} onChange={setConfig} />
</Suspense>
```

## 测试策略

### 单元测试

1. **SchemaParser测试**
   - 测试schema解析
   - 测试字段提取
   - 测试分组和排序

2. **Validator测试**
   - 测试各种验证规则
   - 测试错误消息生成
   - 测试异步验证

3. **字段组件测试**
   - 测试每种字段类型的渲染
   - 测试用户交互
   - 测试验证显示

### 集成测试

1. **表单流程测试**
   - 测试完整的配置流程
   - 测试预设应用
   - 测试模式切换

2. **条件显示测试**
   - 测试字段依赖关系
   - 测试动态显示/隐藏

3. **保存和验证测试**
   - 测试配置保存
   - 测试验证流程
   - 测试错误处理

### E2E测试

1. 用户创建工作流
2. 添加Agent
3. 打开配置面板
4. 填写配置
5. 保存配置
6. 创建工作流

## 无障碍访问

### ARIA属性

```typescript
<div
  role="form"
  aria-labelledby="config-panel-title"
  aria-describedby="config-panel-description"
>
  <input
    type="text"
    aria-label={field.title}
    aria-required={field.required}
    aria-invalid={!!error}
    aria-describedby={`${field.path}-help ${field.path}-error`}
  />
  
  {field.ui.helpText && (
    <p id={`${field.path}-help`} className="sr-only">
      {field.ui.helpText}
    </p>
  )}
  
  {error && (
    <p id={`${field.path}-error`} role="alert" aria-live="polite">
      {error}
    </p>
  )}
</div>
```

### 键盘导航

- Tab: 在字段间导航
- Enter: 提交表单
- Escape: 关闭面板
- Space: 切换复选框
- Arrow keys: 调整滑块值

## 国际化

### 文本资源

```typescript
const i18n = {
  zh: {
    'config.panel.title': 'Agent配置',
    'config.panel.save': '保存',
    'config.panel.cancel': '取消',
    'config.panel.reset': '重置',
    'config.mode.form': '表单模式',
    'config.mode.code': '代码模式',
    'config.preset.select': '选择预设',
    'config.preset.official': '官方',
    'config.validation.required': '此字段为必填项',
    'config.validation.pattern': '格式不正确',
    'config.validation.min': '值不能小于 {min}',
    'config.validation.max': '值不能大于 {max}',
  },
  en: {
    'config.panel.title': 'Agent Configuration',
    'config.panel.save': 'Save',
    'config.panel.cancel': 'Cancel',
    'config.panel.reset': 'Reset',
    // ...
  }
};
```

## 技术栈

- **React**: UI框架
- **TypeScript**: 类型安全
- **TailwindCSS**: 样式
- **react-hook-form**: 表单管理（可选）
- **zod**: 运行时验证
- **react-window**: 虚拟滚动
- **monaco-editor**: 代码编辑器（可选）

## 文件结构

```
packages/frontend/src/components/agent-config/
├── NoCodeConfigPanel.tsx          # 主容器组件
├── ConfigPanelHeader.tsx          # 头部组件
├── ConfigPanelBody.tsx            # 主体组件
├── ConfigPanelFooter.tsx          # 底部组件
├── PresetSelector.tsx             # 预设选择器
├── FieldGroup.tsx                 # 字段分组
├── DynamicFormField.tsx           # 动态字段
├── fields/                        # 字段类型组件
│   ├── InputField.tsx
│   ├── TextareaField.tsx
│   ├── SelectField.tsx
│   ├── CheckboxField.tsx
│   ├── SliderField.tsx
│   ├── NumberField.tsx
│   └── ObjectField.tsx
├── JsonEditor.tsx                 # JSON编辑器
├── utils/                         # 工具函数
│   ├── SchemaParser.ts
│   ├── Validator.ts
│   ├── ConditionalRenderer.ts
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

## 实现优先级

### Phase 1: 核心功能 (MVP)
1. NoCodeConfigPanel容器
2. SchemaParser
3. DynamicFormField
4. 基础字段类型（input, textarea, select, checkbox）
5. 基础验证
6. 保存和取消

### Phase 2: 增强功能
1. 更多字段类型（slider, number, password）
2. 字段分组
3. 条件显示
4. 预设选择器
5. 实时验证

### Phase 3: 高级功能
1. Code/No-Code模式切换
2. JSON编辑器
3. 异步验证
4. 配置摘要
5. 性能优化

### Phase 4: 完善体验
1. 无障碍访问
2. 国际化
3. 错误处理优化
4. 动画和过渡效果

