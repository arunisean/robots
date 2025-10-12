# Agent配置面板实施任务

## Phase 1: 核心功能 (MVP)

### 1. 创建类型定义和工具函数

- [ ] 1.1 创建类型定义文件
  - 在 `packages/frontend/src/components/agent-config/types/` 创建类型定义
  - 定义 FormStructure, FieldDefinition, FieldGroup 等接口
  - 定义 ValidationRules, UIConfig, ConditionalConfig 接口
  - 导出所有类型供其他组件使用
  - _需求: 1.1, 2.1_

- [ ] 1.2 实现SchemaParser工具类
  - 创建 `utils/SchemaParser.ts`
  - 实现 parse() 方法解析ConfigSchema
  - 实现 extractFields() 提取字段列表
  - 实现 groupFields() 按分组组织字段
  - 实现 sortFields() 排序字段
  - 实现 parseDependencies() 解析依赖关系
  - 添加单元测试验证解析逻辑
  - _需求: 1.1, 1.2, 1.3_

- [ ] 1.3 实现Validator工具类
  - 创建 `utils/Validator.ts`
  - 实现 validateField() 验证单个字段
  - 实现 validateConfig() 验证整个配置
  - 支持 required, pattern, min/max, format 等规则
  - 生成友好的错误消息（中英文）
  - 添加单元测试验证各种验证规则
  - _需求: 3.1, 3.2, 3.3_

### 2. 实现基础字段组件

- [ ] 2.1 创建InputField组件
  - 创建 `fields/InputField.tsx`
  - 支持 text, url, email 类型
  - 实现 placeholder, helpText 显示
  - 实现错误状态显示（红色边框）
  - 实现成功状态显示（绿色边框）
  - 支持 onChange 和 onBlur 事件
  - _需求: 2.1, 3.6, 3.7_

- [ ] 2.2 创建TextareaField组件
  - 创建 `fields/TextareaField.tsx`
  - 支持多行文本输入
  - 自动调整高度（可选）
  - 显示字符计数（如果有maxLength）
  - 实现错误和成功状态
  - _需求: 2.2_

- [ ] 2.3 创建SelectField组件
  - 创建 `fields/SelectField.tsx`
  - 支持单选下拉框
  - 从 enum 值生成选项
  - 支持占位符选项
  - 实现错误和成功状态
  - _需求: 2.3_

- [ ] 2.4 创建CheckboxField组件
  - 创建 `fields/CheckboxField.tsx`
  - 支持布尔值切换
  - 显示标签和描述
  - 实现选中/未选中状态
  - _需求: 2.6_

- [ ] 2.5 创建NumberField组件
  - 创建 `fields/NumberField.tsx`
  - 支持数字输入
  - 实现 min/max 限制
  - 支持步进按钮
  - 实现错误和成功状态
  - _需求: 2.4_

### 3. 实现DynamicFormField组件

- [ ] 3.1 创建DynamicFormField组件
  - 创建 `DynamicFormField.tsx`
  - 根据 field.ui.widget 选择对应的字段组件
  - 渲染字段标签、必填标识
  - 渲染帮助文本
  - 渲染错误消息
  - 处理 onChange 和 onBlur 事件
  - _需求: 1.1, 2.1-2.6_

- [ ] 3.2 实现字段组件映射
  - 创建 getFieldComponent() 函数
  - 映射 widget 类型到组件
  - 处理未知 widget 类型（降级到 InputField）
  - _需求: 1.1_

- [ ] 3.3 实现字段值获取和设置
  - 创建 getNestedValue() 函数处理嵌套路径
  - 创建 setNestedValue() 函数设置嵌套值
  - 支持点号路径（如 "schedule.type"）
  - _需求: 1.1_

### 4. 实现NoCodeConfigPanel主容器

- [ ] 4.1 创建NoCodeConfigPanel组件
  - 创建 `NoCodeConfigPanel.tsx`
  - 定义组件 Props 和 State
  - 实现状态管理（config, errors, touched）
  - 实现模态框布局（使用 fixed 定位）
  - 添加关闭按钮和遮罩层
  - _需求: 1.1, 7.1_

- [ ] 4.2 实现配置初始化
  - 从 initialConfig 或 defaultConfig 初始化表单
  - 解析 ConfigSchema 生成表单结构
  - 设置初始值到 state
  - _需求: 1.5_

- [ ] 4.3 实现字段渲染逻辑
  - 遍历 formStructure.fields
  - 为每个字段渲染 DynamicFormField
  - 传递 value, error, touched 等 props
  - 处理字段值变化
  - _需求: 1.1, 1.2_

- [ ] 4.4 实现表单验证
  - 在字段 onBlur 时验证单个字段
  - 在保存时验证整个表单
  - 更新 errors state
  - 标记 touched 字段
  - _需求: 3.1, 3.2, 3.3_

- [ ] 4.5 实现保存和取消
  - 实现 handleSave() 方法
  - 验证所有必填字段
  - 调用 onSave 回调传递配置
  - 实现 handleCancel() 关闭面板
  - 实现 handleReset() 重置到默认值
  - _需求: 7.1, 7.2, 7.3, 7.6_

### 5. 集成到工作流创建页面

- [ ] 5.1 在Agent卡片添加配置按钮
  - 修改 `workflows/new.tsx` 中的 Agent 卡片
  - 添加"配置"按钮
  - 点击按钮打开配置面板
  - _需求: 8.5_

- [ ] 5.2 集成NoCodeConfigPanel组件
  - 导入 NoCodeConfigPanel 组件
  - 管理配置面板的打开/关闭状态
  - 传递 agentTypeId 和 configSchema
  - 传递 initialConfig（当前 agent.config）
  - 实现 onSave 回调更新 agent.config
  - _需求: 7.4_

- [ ] 5.3 显示配置摘要
  - 在 Agent 卡片显示配置的关键信息
  - 提取 2-3 个重要字段显示
  - 如果使用预设，显示预设名称
  - 如果是自定义配置，显示"自定义"标签
  - _需求: 8.1, 8.2, 8.3, 8.4_

## Phase 2: 增强功能

### 6. 实现字段分组

- [ ] 6.1 创建FieldGroup组件
  - 创建 `FieldGroup.tsx`
  - 支持分组标题和描述
  - 实现折叠/展开功能
  - 添加展开/折叠动画
  - _需求: 1.3_

- [ ] 6.2 在NoCodeConfigPanel中使用分组
  - 按 group 组织字段
  - 渲染 FieldGroup 组件
  - 在分组内渲染字段
  - 保存分组展开/折叠状态
  - _需求: 1.3_

### 7. 实现更多字段类型

- [ ] 7.1 创建SliderField组件
  - 创建 `fields/SliderField.tsx`
  - 实现滑块控件
  - 显示当前值
  - 支持 min, max, step
  - 实时更新值
  - _需求: 2.5_

- [ ] 7.2 创建PasswordField组件
  - 创建 `fields/PasswordField.tsx`
  - 实现密码输入框
  - 添加显示/隐藏密码按钮
  - 用于敏感字段（如 API 密钥）
  - _需求: 2.1_

- [ ] 7.3 创建ObjectField组件
  - 创建 `fields/ObjectField.tsx`
  - 递归渲染对象的子字段
  - 支持嵌套对象
  - 实现折叠/展开
  - _需求: 2.7_

### 8. 实现条件显示

- [ ] 8.1 创建useConditionalVisibility Hook
  - 创建 `hooks/useConditionalVisibility.ts`
  - 根据 conditional 配置判断字段是否显示
  - 监听依赖字段的值变化
  - 返回 isVisible 布尔值
  - _需求: 4.1, 4.2, 4.3_

- [ ] 8.2 在DynamicFormField中应用条件显示
  - 使用 useConditionalVisibility Hook
  - 根据 isVisible 决定是否渲染字段
  - 隐藏字段时清除其值
  - _需求: 4.4, 4.5_

- [ ] 8.3 实现依赖关系追踪
  - 在 SchemaParser 中解析依赖关系
  - 构建依赖图
  - 在字段值变化时更新依赖字段
  - _需求: 4.1_

### 9. 实现配置预设

- [ ] 9.1 创建PresetSelector组件
  - 创建 `PresetSelector.tsx`
  - 显示可用预设列表
  - 每个预设显示名称、描述、场景
  - 标识官方预设（徽章）
  - 支持预设选择
  - _需求: 5.1, 5.2, 5.5_

- [ ] 9.2 实现预设应用逻辑
  - 在 NoCodeConfigPanel 中添加预设状态
  - 实现 applyPreset() 方法
  - 将预设配置合并到表单
  - 标记为已应用预设
  - _需求: 5.2, 5.3_

- [ ] 9.3 实现预设修改检测
  - 比较当前配置和预设配置
  - 如果有修改，标记为"自定义"
  - 在 UI 上显示修改状态
  - _需求: 5.4_

### 10. 实现实时验证优化

- [ ] 10.1 添加防抖验证
  - 使用 debounce 延迟验证
  - 避免每次输入都验证
  - 设置合理的延迟时间（300ms）
  - _需求: 3.1, 11.3_

- [ ] 10.2 实现字段级验证
  - 只验证变化的字段
  - 避免重新验证所有字段
  - 提升性能
  - _需求: 11.3_

## Phase 3: 高级功能

### 11. 实现Code/No-Code模式切换

- [ ] 11.1 创建ConfigPanelHeader组件
  - 创建 `ConfigPanelHeader.tsx`
  - 显示面板标题
  - 添加模式切换按钮
  - 显示当前模式
  - _需求: 6.1_

- [ ] 11.2 实现模式切换逻辑
  - 在 NoCodeConfigPanel 中添加 mode state
  - 实现 toggleMode() 方法
  - 切换前验证当前模式的数据
  - 在模式间同步数据
  - _需求: 6.1, 6.4, 6.5_

- [ ] 11.3 创建JsonEditor组件
  - 创建 `JsonEditor.tsx`
  - 集成 JSON 编辑器库（monaco-editor 或 react-json-view）
  - 实现语法高亮
  - 实现实时 JSON 验证
  - 显示验证错误
  - _需求: 6.2, 6.3_

- [ ] 11.4 实现ConfigPanelBody组件
  - 创建 `ConfigPanelBody.tsx`
  - 根据 mode 渲染表单或编辑器
  - 处理模式切换动画
  - _需求: 6.1_

### 12. 实现异步验证

- [ ] 12.1 扩展Validator支持异步验证
  - 在 Validator 中添加 validateConfigAsync()
  - 调用后端 API 验证配置
  - 处理验证响应
  - 显示服务端验证错误
  - _需求: 3.5_

- [ ] 12.2 在保存时调用异步验证
  - 在 handleSave() 中调用异步验证
  - 显示验证加载状态
  - 处理验证失败
  - 只有验证通过才保存
  - _需求: 7.2, 7.3_

### 13. 实现配置摘要生成

- [ ] 13.1 创建ConfigSummary工具
  - 创建 `utils/ConfigSummary.ts`
  - 实现 generateSummary() 方法
  - 提取关键字段（required 或 order 靠前的）
  - 格式化字段值为可读文本
  - _需求: 8.1, 8.2_

- [ ] 13.2 在Agent卡片显示摘要
  - 调用 generateSummary() 生成摘要
  - 在卡片上显示 2-3 个关键配置
  - 使用标签或徽章显示
  - 点击摘要打开配置面板
  - _需求: 8.3, 8.4, 8.5_

## Phase 4: 完善体验

### 14. 实现响应式设计

- [ ] 14.1 优化桌面端布局
  - 配置面板使用模态框
  - 合适的宽度（max-w-4xl）
  - 居中显示
  - _需求: 9.1_

- [ ] 14.2 优化移动端布局
  - 配置面板全屏显示
  - 字段垂直排列
  - 增大触摸区域
  - 优化滚动体验
  - _需求: 9.3, 9.5_

- [ ] 14.3 优化平板端布局
  - 配置面板占据大部分屏幕
  - 适配横屏和竖屏
  - _需求: 9.2_

### 15. 实现无障碍访问

- [ ] 15.1 添加ARIA属性
  - 为表单添加 role="form"
  - 为字段添加 aria-label, aria-required
  - 为错误添加 aria-invalid, role="alert"
  - 为帮助文本添加 aria-describedby
  - _需求: 10.3, 10.4_

- [ ] 15.2 实现键盘导航
  - 支持 Tab 键在字段间导航
  - 支持 Enter 键提交表单
  - 支持 Escape 键关闭面板
  - 显示明显的焦点指示器
  - _需求: 10.1, 10.2, 10.5_

- [ ] 15.3 测试屏幕阅读器
  - 使用 NVDA/JAWS 测试 Windows
  - 使用 VoiceOver 测试 macOS/iOS
  - 确保所有内容可朗读
  - 修复发现的问题
  - _需求: 10.3_

### 16. 实现国际化

- [ ] 16.1 提取所有UI文本
  - 创建 `i18n/config-panel.ts`
  - 提取所有按钮、标签、提示文本
  - 创建中英文翻译
  - _需求: 无（额外功能）_

- [ ] 16.2 实现语言切换
  - 根据 language prop 选择语言
  - 在所有组件中使用翻译
  - 支持动态切换语言
  - _需求: 无（额外功能）_

### 17. 性能优化

- [ ] 17.1 实现组件记忆化
  - 使用 React.memo 包装字段组件
  - 实现自定义比较函数
  - 避免不必要的重渲染
  - _需求: 11.5_

- [ ] 17.2 实现虚拟滚动
  - 对于超过 50 个字段的表单
  - 使用 react-window 实现虚拟滚动
  - 只渲染可见字段
  - _需求: 11.2_

- [ ] 17.3 优化验证性能
  - 使用 debounce 延迟验证
  - 只验证变化的字段
  - 缓存验证结果
  - _需求: 11.3_

- [ ] 17.4 懒加载JSON编辑器
  - 使用 React.lazy 懒加载编辑器
  - 只在切换到代码模式时加载
  - 显示加载状态
  - _需求: 11.1_

### 18. 错误处理和用户反馈

- [ ] 18.1 实现ErrorHandler工具
  - 创建 `utils/ErrorHandler.ts`
  - 处理各种错误类型
  - 生成友好的错误消息
  - 提供恢复建议
  - _需求: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 18.2 添加加载状态
  - 在异步操作时显示加载指示器
  - 禁用表单防止重复提交
  - 显示操作进度
  - _需求: 7.1_

- [ ] 18.3 添加成功反馈
  - 保存成功后显示提示
  - 使用 toast 或 snackbar
  - 自动关闭面板
  - _需求: 7.4_

### 19. 测试

- [ ]* 19.1 编写单元测试
  - 测试 SchemaParser
  - 测试 Validator
  - 测试各个字段组件
  - 测试工具函数
  - _需求: 无（质量保证）_

- [ ]* 19.2 编写集成测试
  - 测试完整的配置流程
  - 测试预设应用
  - 测试模式切换
  - 测试条件显示
  - _需求: 无（质量保证）_

- [ ]* 19.3 编写E2E测试
  - 测试用户创建工作流
  - 测试添加和配置Agent
  - 测试保存和执行工作流
  - _需求: 无（质量保证）_

### 20. 文档和示例

- [ ]* 20.1 编写组件文档
  - 为每个组件添加 JSDoc 注释
  - 说明 Props 和用法
  - 提供代码示例
  - _需求: 无（开发者体验）_

- [ ]* 20.2 创建Storybook故事
  - 为主要组件创建 stories
  - 展示不同状态和配置
  - 方便开发和测试
  - _需求: 无（开发者体验）_

- [ ]* 20.3 编写用户指南
  - 如何配置Agent
  - 如何使用预设
  - 如何切换模式
  - 常见问题解答
  - _需求: 无（用户体验）_

