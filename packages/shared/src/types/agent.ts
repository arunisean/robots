import { z } from 'zod';

// Agent分类枚举 - Trading focused categories
export enum AgentCategory {
  // New trading-focused names
  MONITOR = 'monitor',   // Collect market data and on-chain information
  ANALYZE = 'analyze',   // Generate trading signals and analyze data
  EXECUTE = 'execute',   // Execute trades and manage positions
  VERIFY = 'verify',     // Validate execution and monitor risk
  
  // Legacy names for backward compatibility (deprecated)
  WORK = 'monitor',      // @deprecated Use MONITOR instead
  PROCESS = 'analyze',   // @deprecated Use ANALYZE instead
  PUBLISH = 'execute',   // @deprecated Use EXECUTE instead
  VALIDATE = 'verify'    // @deprecated Use VERIFY instead
}

// Backward compatibility aliases for migration
export const AgentCategoryAliases: Record<string, AgentCategory> = {
  work: AgentCategory.MONITOR,
  process: AgentCategory.ANALYZE,
  publish: AgentCategory.EXECUTE,
  validate: AgentCategory.VERIFY
};

// Agent状态枚举
export enum AgentStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  RUNNING = 'running',
  ERROR = 'error',
  PAUSED = 'paused'
}

// 执行状态枚举
export enum ExecutionStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PENDING = 'pending',
  CANCELLED = 'cancelled'
}

// Agent输入接口
export interface AgentInput {
  data: any;
  metadata: InputMetadata;
  context: ExecutionContext;
}

// Agent输出接口
export interface AgentOutput {
  data: any;
  metadata: OutputMetadata;
  metrics: ExecutionMetrics;
  status: ExecutionStatus;
}

// 输入元数据
export interface InputMetadata {
  source: string;
  timestamp: Date;
  version: string;
  format: string;
  size?: number;
}

// 输出元数据
export interface OutputMetadata {
  generatedAt: Date;
  processingTime: number;
  version: string;
  format: string;
  size?: number;
}

// 执行上下文
export interface ExecutionContext {
  userId: string;
  workflowId?: string;
  executionId: string;
  environment: 'development' | 'staging' | 'production';
  resources: ResourceAllocation;
}

// 资源分配
export interface ResourceAllocation {
  memory: number; // MB
  cpu: number; // CPU cores
  timeout: number; // seconds
  storage: number; // MB
}

// 执行指标
export interface ExecutionMetrics {
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  memoryUsed: number; // MB
  cpuUsed: number; // percentage
  networkRequests: number;
  errors: number;
}

// Agent配置基础接口
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  category: AgentCategory;
  enabled: boolean;
  schedule?: ScheduleConfig;
  resources: ResourceAllocation;
  settings: Record<string, any>;
  // Monitor Agent特定配置
  dataSources?: any[];
  // Analyze Agent特定配置
  processingRules?: any[];
  // 其他可选配置
  [key: string]: any;
}

// 调度配置
export interface ScheduleConfig {
  type: 'cron' | 'interval' | 'manual';
  expression?: string; // cron expression
  interval?: number; // milliseconds
  timezone?: string;
}

// Agent信息
export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  version: string;
  rating: number;
  downloads: number;
  author: string;
  tags: string[];
  requirements: SystemRequirements;
  createdAt: Date;
  updatedAt: Date;
}

// 系统要求
export interface SystemRequirements {
  minMemory: number; // MB
  minCpu: number; // cores
  minStorage: number; // MB
  dependencies: string[];
  permissions: string[];
}

// Agent实例
export interface AgentInstance {
  id: string;
  agentId: string;
  name: string;
  config: AgentConfig;
  status: AgentStatus;
  createdAt: Date;
  lastExecuted?: Date;
  metrics: AgentMetrics;
}

// Agent指标
export interface AgentMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionTime?: number;
  uptime: number; // percentage
  errorRate: number; // percentage
}

// Zod验证模式
export const AgentConfigSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  version: z.string(),
  category: z.nativeEnum(AgentCategory),
  enabled: z.boolean(),
  schedule: z.object({
    type: z.enum(['cron', 'interval', 'manual']),
    expression: z.string().optional(),
    interval: z.number().optional(),
    timezone: z.string().optional(),
  }).optional(),
  resources: z.object({
    memory: z.number().min(64).max(8192),
    cpu: z.number().min(0.1).max(8),
    timeout: z.number().min(1).max(3600),
    storage: z.number().min(10).max(10240),
  }),
  settings: z.record(z.any()),
});

export const AgentInputSchema = z.object({
  data: z.any(),
  metadata: z.object({
    source: z.string(),
    timestamp: z.date(),
    version: z.string(),
    format: z.string(),
    size: z.number().optional(),
  }),
  context: z.object({
    userId: z.string(),
    workflowId: z.string().optional(),
    executionId: z.string(),
    environment: z.enum(['development', 'staging', 'production']),
    resources: z.object({
      memory: z.number(),
      cpu: z.number(),
      timeout: z.number(),
      storage: z.number(),
    }),
  }),
});

export const AgentOutputSchema = z.object({
  data: z.any(),
  metadata: z.object({
    generatedAt: z.date(),
    processingTime: z.number(),
    version: z.string(),
    format: z.string(),
    size: z.number().optional(),
  }),
  metrics: z.object({
    startTime: z.date(),
    endTime: z.date().optional(),
    duration: z.number().optional(),
    memoryUsed: z.number(),
    cpuUsed: z.number(),
    networkRequests: z.number(),
    errors: z.number(),
  }),
  status: z.nativeEnum(ExecutionStatus),
});