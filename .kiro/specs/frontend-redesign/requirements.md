# Requirements Document

## Introduction

本需求文档定义了Web3交易自动化平台前端的重新设计。当前前端基于通用工作流平台设计（agent-types, workflows），但产品已演变为专注于交易自动化的平台。需要重新设计前端以匹配后端的策略模板系统（Strategy Templates）和交易自动化功能。

## Glossary

- **Frontend**: Next.js前端应用程序
- **Backend**: Fastify后端API服务
- **Strategy Template**: 预配置的交易策略模板（如网格交易、套利交易）
- **Strategy Instance**: 用户基于模板创建的具体策略实例
- **Paper Trading**: 模拟交易模式，使用虚拟资金测试策略
- **Web3 Wallet**: 以太坊钱包（如MetaMask）用于身份认证
- **Trading Dashboard**: 实时监控交易策略执行的仪表板
- **Agent Categories**: 四类专业化代理（Monitor/Analyze/Execute/Verify）

## Requirements

### Requirement 1: 策略库页面重新设计

**User Story:** 作为交易用户，我希望浏览可用的交易策略模板，以便快速找到适合我的自动化交易策略

#### Acceptance Criteria

1. WHEN 用户访问策略库页面，THE Frontend SHALL 显示所有可用的策略模板卡片，包含名称、描述、难度、类别和性能指标
2. WHEN 用户点击策略卡片，THE Frontend SHALL 显示策略详情模态框，包含完整描述、参数配置、风险档案和历史表现
3. WHEN 用户在策略详情中配置参数，THE Frontend SHALL 实时验证参数值是否符合最小值、最大值和必填要求
4. WHEN 用户点击"启动策略"按钮，THE Frontend SHALL 调用后端API创建策略实例并显示成功确认
5. WHERE 用户选择纸上交易模式，THE Frontend SHALL 在策略实例中标记为模拟交易

### Requirement 2: 交易仪表板页面

**User Story:** 作为交易用户，我希望实时监控我的活跃策略，以便了解交易执行情况和盈亏状态

#### Acceptance Criteria

1. THE Frontend SHALL 显示用户所有策略实例的列表，包含状态、总交易数、胜率和总盈亏
2. WHEN 用户点击策略实例，THE Frontend SHALL 显示详细的交易历史、性能图表和实时执行日志
3. WHEN 策略状态为"运行中"，THE Frontend SHALL 每5秒自动刷新实时数据
4. WHEN 用户点击"停止策略"按钮，THE Frontend SHALL 调用API停止策略执行并更新UI状态
5. THE Frontend SHALL 使用颜色编码显示盈利（绿色）和亏损（红色）的交易

### Requirement 3: 主页重新设计

**User Story:** 作为新用户，我希望在主页上快速了解平台功能，以便决定是否使用该平台

#### Acceptance Criteria

1. THE Frontend SHALL 在主页显示平台标题"Web3交易自动化平台"和简短描述
2. THE Frontend SHALL 展示3个核心功能卡片：策略模板、一键启动、风险控制
3. WHERE 用户未连接钱包，THE Frontend SHALL 显示"连接钱包开始"的行动号召按钮
4. WHERE 用户已连接钱包，THE Frontend SHALL 显示"浏览策略"和"我的仪表板"快速入口
5. THE Frontend SHALL 显示平台统计数据：可用策略数、活跃用户数、总交易量

### Requirement 4: 导航栏更新

**User Story:** 作为用户，我希望通过导航栏快速访问主要功能，以便高效使用平台

#### Acceptance Criteria

1. THE Frontend SHALL 在导航栏显示以下菜单项：首页、策略库、我的仪表板、帮助
2. THE Frontend SHALL 在导航栏右侧显示钱包连接按钮和用户地址（如已连接）
3. WHEN 用户点击导航菜单项，THE Frontend SHALL 导航到对应页面
4. WHERE 用户未认证，THE Frontend SHALL 禁用"我的仪表板"菜单项
5. THE Frontend SHALL 在当前页面的菜单项上显示高亮状态

### Requirement 5: 移除旧的工作流相关页面

**User Story:** 作为开发者，我希望移除不再使用的工作流和agent-types页面，以便保持代码库整洁

#### Acceptance Criteria

1. THE Frontend SHALL 删除 `/workflows` 路由及相关页面组件
2. THE Frontend SHALL 删除 `/agent-types` 路由及相关页面组件
3. THE Frontend SHALL 删除 `WorkflowExecutionMonitor` 组件
4. THE Frontend SHALL 删除 `agent-config` 和 `agent-types` 组件目录
5. THE Frontend SHALL 更新所有内部链接，移除指向已删除页面的引用

### Requirement 6: API集成层更新

**User Story:** 作为开发者，我希望前端API层与后端策略模板API对齐，以便正确调用后端服务

#### Acceptance Criteria

1. THE Frontend SHALL 创建 `strategyTemplateAPI` 服务，包含 `list()`, `getById()`, `instantiate()` 方法
2. THE Frontend SHALL 创建 `strategyInstanceAPI` 服务，包含 `list()`, `getById()`, `start()`, `stop()`, `delete()` 方法
3. WHEN API调用失败，THE Frontend SHALL 显示用户友好的错误消息
4. THE Frontend SHALL 在API请求头中包含JWT认证令牌（如用户已登录）
5. THE Frontend SHALL 使用TypeScript类型定义确保API响应的类型安全

### Requirement 7: 响应式设计

**User Story:** 作为移动设备用户，我希望在手机上也能使用平台，以便随时随地监控交易

#### Acceptance Criteria

1. THE Frontend SHALL 在移动设备（<768px）上使用单列布局显示策略卡片
2. THE Frontend SHALL 在平板设备（768px-1024px）上使用双列布局显示策略卡片
3. THE Frontend SHALL 在桌面设备（>1024px）上使用三列布局显示策略卡片
4. THE Frontend SHALL 在移动设备上将导航栏转换为汉堡菜单
5. THE Frontend SHALL 确保所有交互元素（按钮、输入框）在触摸屏上易于点击（最小44x44px）

### Requirement 8: 性能优化

**User Story:** 作为用户，我希望页面加载快速，以便获得流畅的使用体验

#### Acceptance Criteria

1. THE Frontend SHALL 使用Next.js静态生成（SSG）预渲染策略库页面
2. THE Frontend SHALL 使用React Query缓存API响应，减少重复请求
3. THE Frontend SHALL 实现策略卡片的懒加载，仅加载可见区域的内容
4. THE Frontend SHALL 优化图片和图标，使用WebP格式和适当的尺寸
5. THE Frontend SHALL 在首次内容绘制（FCP）时间控制在1.5秒以内
