# Design Document

## Overview

本设计文档描述了Web3交易自动化平台前端的重新设计方案。目标是将前端从通用工作流平台转变为专注于交易自动化的用户界面，与后端的策略模板系统完全对齐。

设计遵循以下原则：
- **交易优先**: UI专注于交易策略的浏览、配置和监控
- **简洁直观**: 降低技术门槛，让非技术用户也能快速上手
- **实时反馈**: 提供实时的交易执行状态和性能指标
- **响应式设计**: 支持桌面、平板和移动设备
- **Web3集成**: 无缝集成钱包连接和身份认证

## Architecture

### 页面结构

```
/                           # 主页 - 平台介绍和快速入口
/strategies                 # 策略库 - 浏览和配置策略模板
/dashboard                  # 交易仪表板 - 监控活跃策略
/dashboard/[instanceId]     # 策略详情 - 单个策略的详细信息
/help                       # 帮助文档
```

### 组件层次结构

```
App (_app.tsx)
├── WalletProvider (Web3认证上下文)
└── Layout (页面布局)
    ├── Navbar (导航栏)
    ├── Page Content (页面内容)
    │   ├── HomePage
    │   ├── StrategiesPage
    │   │   ├── StrategyCard
    │   │   └── StrategyConfigModal
    │   ├── DashboardPage
    │   │   ├── StrategyInstanceCard
    │   │   └── PerformanceChart
    │   └── StrategyDetailPage
    │       ├── ExecutionLog
    │       ├── TradeHistory
    │       └── PerformanceMetrics
    └── Footer (页脚)
```

### 状态管理

使用React Query进行服务器状态管理：
- **策略模板**: 缓存策略模板列表，减少API调用
- **策略实例**: 实时查询用户的活跃策略
- **交易历史**: 分页加载交易记录
- **实时数据**: 使用轮询或WebSocket更新运行中的策略

使用React Context进行全局状态：
- **WalletContext**: 钱包连接状态和用户认证
- **ThemeContext**: 主题配置（未来扩展）

## Components and Interfaces

### 1. Navbar Component

**功能**: 全局导航栏，提供页面导航和钱包连接

**Props**:
```typescript
interface NavbarProps {
  // 无props，从WalletContext获取状态
}
```

**UI元素**:
- Logo和平台名称
- 导航菜单: 首页 | 策略库 | 我的仪表板 | 帮助
- 钱包连接按钮（显示地址或"连接钱包"）
- 移动端汉堡菜单

**样式**:
- 固定在顶部，白色背景，底部边框
- 响应式：桌面显示完整菜单，移动端显示汉堡菜单

### 2. StrategyCard Component

**功能**: 显示单个策略模板的卡片

**Props**:
```typescript
interface StrategyCardProps {
  template: StrategyTemplate;
  onSelect: (template: StrategyTemplate) => void;
}

interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  riskProfile: {
    level: 'low' | 'medium' | 'high';
    requiredCapital: number;
  };
  performanceMetrics?: {
    totalReturn: number;
    winRate: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
  usageCount: number;
  activeUsers: number;
}
```

**UI元素**:
- 策略名称和难度标签
- 简短描述（最多3行）
- 性能指标网格（4个指标）
- 风险等级和最低资金要求
- "配置并启动"按钮

**样式**:
- 白色卡片，圆角，悬停时阴影加深
- 难度标签颜色编码：绿色（初级）、黄色（中级）、红色（高级）
- 性能指标使用颜色区分：绿色（正收益）、红色（负收益）

### 3. StrategyConfigModal Component

**功能**: 配置策略参数的模态框

**Props**:
```typescript
interface StrategyConfigModalProps {
  template: StrategyTemplate;
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (config: StrategyConfig) => Promise<void>;
}

interface StrategyConfig {
  name: string;
  parameters: Record<string, any>;
  paperTrading: boolean;
}
```

**UI元素**:
- 模态框标题和关闭按钮
- 参数表单（动态生成，基于template.parameters）
- 每个参数包含：标签、描述、输入框、单位
- 纸上交易模式提示（黄色警告框）
- 取消和启动按钮

**验证逻辑**:
- 实时验证参数值（最小值、最大值、必填）
- 显示验证错误消息
- 禁用启动按钮直到所有参数有效

### 4. StrategyInstanceCard Component

**功能**: 显示用户策略实例的卡片

**Props**:
```typescript
interface StrategyInstanceCardProps {
  instance: StrategyInstance;
  onViewDetails: (id: string) => void;
  onStop: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface StrategyInstance {
  id: string;
  userId: string;
  templateId: string;
  workflowId: string;
  name: string;
  status: 'running' | 'stopped' | 'paused' | 'error';
  paperTrading: boolean;
  parameters: Record<string, any>;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfitLoss: number;
  winRate: number;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
}
```

**UI元素**:
- 策略名称和状态标签
- 纸上交易标识（如适用）
- 统计数据网格：总交易数、胜率、总盈亏
- 操作按钮：查看详情、停止、删除
- 最后执行时间

**样式**:
- 状态颜色编码：绿色（运行中）、灰色（已停止）、黄色（暂停）、红色（错误）
- 盈亏颜色：绿色（正）、红色（负）

### 5. PerformanceChart Component

**功能**: 显示策略性能图表

**Props**:
```typescript
interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  type: 'equity' | 'pnl' | 'trades';
}

interface PerformanceDataPoint {
  timestamp: Date;
  value: number;
}
```

**实现**:
- 使用 recharts 库绘制折线图
- 支持三种图表类型：权益曲线、盈亏曲线、交易量
- 响应式设计，自适应容器宽度

### 6. TradeHistory Component

**功能**: 显示交易历史列表

**Props**:
```typescript
interface TradeHistoryProps {
  instanceId: string;
  limit?: number;
}

interface Trade {
  id: string;
  timestamp: Date;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  fee: number;
  profitLoss?: number;
  status: 'completed' | 'pending' | 'failed';
}
```

**UI元素**:
- 表格显示交易记录
- 列：时间、交易对、方向、数量、价格、总额、手续费、盈亏、状态
- 分页控制
- 导出CSV功能（未来）

## Data Models

### Frontend Type Definitions

```typescript
// src/types/strategy.ts

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  riskProfile: {
    level: 'low' | 'medium' | 'high';
    requiredCapital: number;
    maxLoss: number;
    maxPositionSize: number;
  };
  performanceMetrics?: {
    totalReturn: number;
    winRate: number;
    maxDrawdown: number;
    sharpeRatio: number;
    avgTradeReturn: number;
  };
  parameters: StrategyParameter[];
  workflow: WorkflowDefinition;
  usageCount: number;
  activeUsers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StrategyParameter {
  key: string;
  label: string;
  description: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  defaultValue: any;
  unit?: string;
  validation: {
    required: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    options?: any[];
  };
}

export interface StrategyInstance {
  id: string;
  userId: string;
  templateId: string;
  workflowId: string;
  name: string;
  status: 'running' | 'stopped' | 'paused' | 'error';
  paperTrading: boolean;
  parameters: Record<string, any>;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfitLoss: number;
  winRate: number;
  currentDrawdown: number;
  maxDrawdown: number;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  errorMessage?: string;
}

export interface Trade {
  id: string;
  instanceId: string;
  timestamp: Date;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  fee: number;
  profitLoss?: number;
  status: 'completed' | 'pending' | 'failed';
  exchange: string;
  orderId: string;
}

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  currentDrawdown: number;
  recoveryFactor: number;
}
```

## API Integration

### API Service Layer

创建新的API服务层，替换现有的workflowAPI：

```typescript
// src/services/strategyAPI.ts

import { authService } from './authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = authService.getToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

// Strategy Template API
export const strategyTemplateAPI = {
  list: async (filters?: {
    category?: string;
    difficulty?: string;
    tags?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString();
    return fetchAPI<{ data: StrategyTemplate[]; pagination: any }>(
      `/api/strategy-templates${query ? `?${query}` : ''}`
    );
  },

  getById: async (id: string) => {
    return fetchAPI<{ data: StrategyTemplate }>(`/api/strategy-templates/${id}`);
  },

  instantiate: async (id: string, config: {
    name: string;
    parameters: Record<string, any>;
    paperTrading?: boolean;
  }) => {
    return fetchAPI<{ data: StrategyInstance }>(
      `/api/strategy-templates/${id}/instantiate`,
      {
        method: 'POST',
        body: JSON.stringify(config),
      }
    );
  },
};

// Strategy Instance API
export const strategyInstanceAPI = {
  list: async (filters?: {
    status?: string;
    paperTrading?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString();
    return fetchAPI<{ data: StrategyInstance[]; pagination: any }>(
      `/api/strategy-instances${query ? `?${query}` : ''}`
    );
  },

  getById: async (id: string) => {
    return fetchAPI<{ data: StrategyInstance }>(`/api/strategy-instances/${id}`);
  },

  start: async (id: string) => {
    return fetchAPI<{ data: StrategyInstance }>(
      `/api/strategy-instances/${id}/start`,
      { method: 'POST' }
    );
  },

  stop: async (id: string) => {
    return fetchAPI<{ data: StrategyInstance }>(
      `/api/strategy-instances/${id}/stop`,
      { method: 'POST' }
    );
  },

  delete: async (id: string) => {
    return fetchAPI<void>(`/api/strategy-instances/${id}`, { method: 'DELETE' });
  },

  getTrades: async (id: string, limit = 50, offset = 0) => {
    return fetchAPI<{ data: Trade[]; pagination: any }>(
      `/api/strategy-instances/${id}/trades?limit=${limit}&offset=${offset}`
    );
  },

  getMetrics: async (id: string) => {
    return fetchAPI<{ data: PerformanceMetrics }>(
      `/api/strategy-instances/${id}/metrics`
    );
  },
};
```

### React Query Hooks

```typescript
// src/hooks/useStrategyTemplates.ts

import { useQuery } from '@tanstack/react-query';
import { strategyTemplateAPI } from '../services/strategyAPI';

export function useStrategyTemplates(filters?: any) {
  return useQuery({
    queryKey: ['strategy-templates', filters],
    queryFn: () => strategyTemplateAPI.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useStrategyTemplate(id: string) {
  return useQuery({
    queryKey: ['strategy-template', id],
    queryFn: () => strategyTemplateAPI.getById(id),
    enabled: !!id,
  });
}

// src/hooks/useStrategyInstances.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { strategyInstanceAPI } from '../services/strategyAPI';

export function useStrategyInstances(filters?: any) {
  return useQuery({
    queryKey: ['strategy-instances', filters],
    queryFn: () => strategyInstanceAPI.list(filters),
    refetchInterval: (data) => {
      // 如果有运行中的策略，每5秒刷新一次
      const hasRunning = data?.data.some(i => i.status === 'running');
      return hasRunning ? 5000 : false;
    },
  });
}

export function useStrategyInstance(id: string) {
  return useQuery({
    queryKey: ['strategy-instance', id],
    queryFn: () => strategyInstanceAPI.getById(id),
    enabled: !!id,
    refetchInterval: (data) => {
      // 运行中的策略每5秒刷新
      return data?.data.status === 'running' ? 5000 : false;
    },
  });
}

export function useStopStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => strategyInstanceAPI.stop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-instances'] });
    },
  });
}

export function useDeleteStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => strategyInstanceAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-instances'] });
    },
  });
}
```

## Error Handling

### Error Types

```typescript
// src/types/errors.ts

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}
```

### Error Handling Strategy

1. **API错误**: 显示toast通知，包含错误消息
2. **验证错误**: 在表单字段下方显示内联错误消息
3. **认证错误**: 重定向到主页并提示连接钱包
4. **网络错误**: 显示重试按钮和友好的错误消息

### Error Boundary Component

```typescript
// src/components/ErrorBoundary.tsx

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Testing Strategy

### Unit Tests

使用Jest和React Testing Library测试组件：

1. **StrategyCard**: 测试渲染、点击事件、条件样式
2. **StrategyConfigModal**: 测试参数验证、表单提交
3. **StrategyInstanceCard**: 测试状态显示、操作按钮
4. **API Services**: 测试API调用、错误处理

### Integration Tests

测试页面级别的交互：

1. **StrategiesPage**: 测试策略列表加载、筛选、配置流程
2. **DashboardPage**: 测试实例列表、启动/停止操作
3. **StrategyDetailPage**: 测试详情加载、图表渲染

### E2E Tests (未来)

使用Playwright测试完整用户流程：

1. 连接钱包 → 浏览策略 → 配置参数 → 启动策略
2. 查看仪表板 → 监控执行 → 停止策略
3. 查看交易历史 → 分析性能指标

## Responsive Design

### Breakpoints

```css
/* Tailwind默认断点 */
sm: 640px   /* 移动设备（横屏） */
md: 768px   /* 平板设备 */
lg: 1024px  /* 桌面设备 */
xl: 1280px  /* 大屏幕 */
2xl: 1536px /* 超大屏幕 */
```

### Layout Adjustments

**移动设备 (<768px)**:
- 单列布局
- 汉堡菜单导航
- 简化的策略卡片（隐藏部分指标）
- 全屏模态框

**平板设备 (768px-1024px)**:
- 双列布局
- 完整导航栏
- 完整的策略卡片

**桌面设备 (>1024px)**:
- 三列布局
- 侧边栏导航（未来）
- 更多数据可视化

## Performance Optimization

### Code Splitting

```typescript
// 使用Next.js动态导入
import dynamic from 'next/dynamic';

const PerformanceChart = dynamic(() => import('../components/PerformanceChart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false, // 图表库不需要SSR
});

const StrategyConfigModal = dynamic(() => import('../components/StrategyConfigModal'));
```

### Image Optimization

```typescript
// 使用Next.js Image组件
import Image from 'next/image';

<Image
  src="/strategy-icon.png"
  alt="Strategy Icon"
  width={64}
  height={64}
  loading="lazy"
/>
```

### Data Fetching

1. **SSG**: 策略库页面使用静态生成
2. **ISR**: 每5分钟重新生成策略列表
3. **Client-side**: 用户特定数据（仪表板）使用客户端获取
4. **Caching**: React Query缓存策略，减少API调用

### Bundle Size

1. 使用tree-shaking移除未使用的代码
2. 懒加载图表库和大型组件
3. 优化依赖项（使用轻量级替代品）
4. 压缩和minify生产构建

## Migration Plan

### Phase 1: 创建新页面和组件

1. 创建新的页面结构（/, /strategies, /dashboard）
2. 实现核心组件（StrategyCard, StrategyConfigModal）
3. 创建新的API服务层
4. 设置React Query

### Phase 2: 更新导航和布局

1. 更新Navbar组件
2. 修改Layout组件
3. 更新主页内容

### Phase 3: 移除旧代码

1. 删除/workflows和/agent-types页面
2. 删除相关组件
3. 清理未使用的API服务
4. 更新所有内部链接

### Phase 4: 测试和优化

1. 编写单元测试
2. 性能优化
3. 响应式设计调整
4. 用户体验改进

## Design Decisions and Rationales

### 为什么使用React Query？

- 自动缓存和重新验证
- 简化的加载和错误状态管理
- 内置的轮询和实时更新支持
- 减少样板代码

### 为什么保留WalletProvider？

- Web3认证是核心功能
- 现有实现稳定可靠
- 避免不必要的重构

### 为什么使用模态框而不是独立页面？

- 减少页面跳转，提升用户体验
- 保持上下文，用户可以快速浏览多个策略
- 移动端友好

### 为什么使用轮询而不是WebSocket？

- 简化实现，降低复杂度
- 5秒轮询间隔对交易监控足够
- 未来可以升级到WebSocket

### 为什么移除工作流相关页面？

- 产品定位已改变，不再是通用工作流平台
- 简化用户界面，降低学习曲线
- 减少维护负担
