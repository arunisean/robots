import { z } from 'zod';
import { AgentCategory } from './agent';

// 工作流相关类型

// 工作流接口
export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  connections: NodeConnection[];
  triggers: WorkflowTrigger[];
  settings: WorkflowSettings;
  metadata: WorkflowMetadata;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

// 工作流状态
export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
  ERROR = 'error'
}

// 工作流节点
export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  position: NodePosition;
  config: NodeConfig;
  agentId?: string;
  agentCategory?: AgentCategory;
  enabled: boolean;
}

// 节点类型
export enum NodeType {
  AGENT = 'agent',
  TRIGGER = 'trigger',
  CONDITION = 'condition',
  TRANSFORMER = 'transformer',
  DELAY = 'delay',
  WEBHOOK = 'webhook',
  SCHEDULE = 'schedule'
}

// 节点位置
export interface NodePosition {
  x: number;
  y: number;
}

// 节点配置
export interface NodeConfig {
  // Agent节点配置
  agentConfig?: Record<string, any>;
  
  // 触发器配置
  triggerConfig?: {
    type: 'manual' | 'schedule' | 'webhook' | 'event';
    schedule?: string; // cron expression
    webhookUrl?: string;
    eventType?: string;
  };
  
  // 条件配置
  conditionConfig?: {
    expression: string;
    trueNode?: string;
    falseNode?: string;
  };
  
  // 转换器配置
  transformerConfig?: {
    script: string;
    language: 'javascript' | 'python';
    inputMapping: Record<string, string>;
    outputMapping: Record<string, string>;
  };
  
  // 延迟配置
  delayConfig?: {
    duration: number; // milliseconds
    unit: 'seconds' | 'minutes' | 'hours' | 'days';
  };
  
  // 通用配置
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
  timeout?: number; // seconds
}

// 节点连接
export interface NodeConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePort?: string;
  targetPort?: string;
  condition?: string;
  enabled: boolean;
}

// 工作流触发器
export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  name: string;
  config: TriggerConfig;
  enabled: boolean;
}

// 触发器类型
export enum TriggerType {
  MANUAL = 'manual',
  SCHEDULE = 'schedule',
  WEBHOOK = 'webhook',
  EVENT = 'event',
  FILE_WATCH = 'file_watch',
  API_CALL = 'api_call'
}

// 触发器配置
export interface TriggerConfig {
  // 调度触发器
  schedule?: {
    cron: string;
    timezone: string;
    startDate?: Date;
    endDate?: Date;
  };
  
  // Webhook触发器
  webhook?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    authentication?: {
      type: 'none' | 'basic' | 'bearer' | 'api_key';
      credentials?: Record<string, string>;
    };
  };
  
  // 事件触发器
  event?: {
    source: string;
    eventType: string;
    filters?: Record<string, any>;
  };
  
  // 文件监控触发器
  fileWatch?: {
    path: string;
    pattern: string;
    events: ('create' | 'modify' | 'delete')[];
  };
}

// 工作流设置
export interface WorkflowSettings {
  maxConcurrentExecutions: number;
  executionTimeout: number; // seconds
  retryPolicy: {
    enabled: boolean;
    maxRetries: number;
    backoffStrategy: 'fixed' | 'exponential' | 'linear';
    backoffMs: number;
  };
  errorHandling: {
    strategy: 'stop' | 'continue' | 'retry';
    notifyOnError: boolean;
    errorWebhook?: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    retention: number; // days
    includeData: boolean;
  };
}

// 工作流元数据
export interface WorkflowMetadata {
  tags: string[];
  category: string;
  author: string;
  documentation?: string;
  changelog: ChangelogEntry[];
  stats: WorkflowStats;
}

// 变更日志条目
export interface ChangelogEntry {
  version: string;
  date: Date;
  changes: string[];
  author: string;
}

// 工作流统计
export interface WorkflowStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecuted?: Date;
  popularity: number;
  rating: number;
}

// 工作流执行
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  triggeredBy: string;
  input?: any;
  output?: any;
  error?: ExecutionError;
  nodeExecutions: NodeExecution[];
  metrics: ExecutionMetrics;
}

// 执行状态
export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

// 执行错误
export interface ExecutionError {
  code: string;
  message: string;
  nodeId?: string;
  stack?: string;
  details?: Record<string, any>;
}

// 节点执行
export interface NodeExecution {
  id: string;
  nodeId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: ExecutionError;
  retryCount: number;
}

// 执行指标
export interface ExecutionMetrics {
  totalNodes: number;
  executedNodes: number;
  failedNodes: number;
  skippedNodes: number;
  dataProcessed: number; // bytes
  apiCalls: number;
  resourceUsage: {
    cpu: number; // percentage
    memory: number; // MB
    storage: number; // MB
  };
}

// 工作流模板
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  workflow: Partial<Workflow>;
  parameters: TemplateParameter[];
  instructions: string[];
  examples: TemplateExample[];
  author: string;
  rating: number;
  downloads: number;
  createdAt: Date;
  updatedAt: Date;
}

// 模板参数
export interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  description: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// 模板示例
export interface TemplateExample {
  name: string;
  description: string;
  parameters: Record<string, any>;
  expectedOutput?: any;
}

// 工作流版本
export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: string;
  name: string;
  description: string;
  changes: string[];
  workflow: Workflow;
  createdAt: Date;
  createdBy: string;
  active: boolean;
}

// Zod验证模式
export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  version: z.string(),
  status: z.nativeEnum(WorkflowStatus),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.nativeEnum(NodeType),
    name: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
    config: z.record(z.any()),
    agentId: z.string().optional(),
    agentCategory: z.nativeEnum(AgentCategory).optional(),
    enabled: z.boolean(),
  })),
  connections: z.array(z.object({
    id: z.string(),
    sourceNodeId: z.string(),
    targetNodeId: z.string(),
    sourcePort: z.string().optional(),
    targetPort: z.string().optional(),
    condition: z.string().optional(),
    enabled: z.boolean(),
  })),
  triggers: z.array(z.object({
    id: z.string(),
    type: z.nativeEnum(TriggerType),
    name: z.string(),
    config: z.record(z.any()),
    enabled: z.boolean(),
  })),
  settings: z.object({
    maxConcurrentExecutions: z.number().min(1).max(100),
    executionTimeout: z.number().min(1).max(86400),
    retryPolicy: z.object({
      enabled: z.boolean(),
      maxRetries: z.number().min(0).max(10),
      backoffStrategy: z.enum(['fixed', 'exponential', 'linear']),
      backoffMs: z.number().min(100),
    }),
    errorHandling: z.object({
      strategy: z.enum(['stop', 'continue', 'retry']),
      notifyOnError: z.boolean(),
      errorWebhook: z.string().optional(),
    }),
    logging: z.object({
      level: z.enum(['debug', 'info', 'warn', 'error']),
      retention: z.number().min(1).max(365),
      includeData: z.boolean(),
    }),
  }),
  metadata: z.object({
    tags: z.array(z.string()),
    category: z.string(),
    author: z.string(),
    documentation: z.string().optional(),
    changelog: z.array(z.object({
      version: z.string(),
      date: z.date(),
      changes: z.array(z.string()),
      author: z.string(),
    })),
    stats: z.object({
      totalExecutions: z.number(),
      successfulExecutions: z.number(),
      failedExecutions: z.number(),
      averageExecutionTime: z.number(),
      lastExecuted: z.date().optional(),
      popularity: z.number(),
      rating: z.number(),
    }),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
  ownerId: z.string(),
});