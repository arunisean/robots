import { AgentCategory, AgentConfig } from './agent';

/**
 * Workflow status
 */
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

/**
 * Workflow execution status
 */
export type WorkflowExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Workflow execution trigger type
 */
export type WorkflowTriggerType = 'manual' | 'scheduled' | 'webhook' | 'api';

/**
 * Agent execution status
 */
export type AgentExecutionStatus = 'success' | 'failed' | 'skipped';

/**
 * Workflow agent configuration
 */
export interface WorkflowAgent {
  id: string;
  agentType: string;
  agentCategory: AgentCategory;
  config: AgentConfig;
  order: number;
  nextAgentId?: string;
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  nodes: WorkflowAgent[];
  connections: WorkflowConnection[];
  decisionConfig?: any; // Optional conditional execution rules (DecisionConfig from strategy-template)
}

/**
 * Workflow connection between agents
 */
export interface WorkflowConnection {
  from: string;
  to: string;
  condition?: string; // Optional condition for conditional execution
}

/**
 * Workflow settings
 */
export interface WorkflowSettings {
  maxConcurrentExecutions: number;
  executionTimeout: number; // in seconds
  retryPolicy: RetryPolicy;
  errorHandling: ErrorHandlingPolicy;
  logging: LoggingPolicy;
  riskControls?: any; // Optional risk control configuration (RiskControlConfig from strategy-template)
}

/**
 * Retry policy
 */
export interface RetryPolicy {
  enabled: boolean;
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential';
  backoffMs: number;
}

/**
 * Error handling policy
 */
export interface ErrorHandlingPolicy {
  strategy: 'stop' | 'continue' | 'skip';
  notifyOnError: boolean;
}

/**
 * Logging policy
 */
export interface LoggingPolicy {
  level: 'debug' | 'info' | 'warn' | 'error';
  retention: number; // days
  includeData: boolean;
}

/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
  tags: string[];
  category: string;
  author?: string;
  changelog?: ChangelogEntry[];
  stats?: WorkflowStats;
  [key: string]: any;
}

/**
 * Changelog entry
 */
export interface ChangelogEntry {
  version: string;
  date: Date;
  changes: string[];
  author: string;
}

/**
 * Workflow statistics
 */
export interface WorkflowStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  popularity?: number;
  rating?: number;
}

/**
 * Complete workflow
 */
export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  status: WorkflowStatus;
  definition: WorkflowDefinition;
  settings: WorkflowSettings;
  metadata: WorkflowMetadata;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  executionCount?: number;
  successCount?: number;
  failureCount?: number;
  avgExecutionTime?: number;
}

/**
 * Workflow execution
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  triggeredBy?: string;
  triggerType: WorkflowTriggerType;
  inputData: Record<string, any>;
  error?: string;
  metadata: Record<string, any>;
  results?: AgentExecutionResult[];
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  id: string;
  executionId: string;
  agentId: string;
  agentType: string;
  agentCategory: AgentCategory;
  status: AgentExecutionStatus;
  orderIndex: number;
  inputData: any;
  outputData: any;
  startTime: Date;
  endTime: Date;
  duration: number; // in milliseconds
  error?: string;
  metrics: AgentExecutionMetrics;
}

/**
 * Agent execution metrics
 */
export interface AgentExecutionMetrics {
  memoryUsed: number; // in MB
  cpuTime: number; // in seconds
  networkCalls?: number;
  llmCalls?: number;
  [key: string]: any;
}

/**
 * Execution event
 */
export interface ExecutionEvent {
  id: string;
  executionId: string;
  eventType: ExecutionEventType;
  agentId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

/**
 * Execution event types
 */
export type ExecutionEventType =
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.cancelled'
  | 'agent.started'
  | 'agent.progress'
  | 'agent.completed'
  | 'agent.failed'
  | 'agent.skipped';

/**
 * Create workflow DTO
 */
export interface CreateWorkflowDto {
  name: string;
  description?: string;
  version?: string;
  definition: WorkflowDefinition;
  settings?: Partial<WorkflowSettings>;
  metadata?: Partial<WorkflowMetadata>;
}

/**
 * Update workflow DTO
 */
export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  version?: string;
  status?: WorkflowStatus;
  definition?: WorkflowDefinition;
  settings?: Partial<WorkflowSettings>;
  metadata?: Partial<WorkflowMetadata>;
}

/**
 * Execute workflow DTO
 */
export interface ExecuteWorkflowDto {
  inputData?: Record<string, any>;
  triggerType?: WorkflowTriggerType;
  metadata?: Record<string, any>;
}

/**
 * Workflow filters
 */
export interface WorkflowFilters {
  status?: WorkflowStatus;
  category?: string;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'executionCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Execution filters
 */
export interface ExecutionFilters {
  workflowId?: string;
  status?: WorkflowExecutionStatus;
  triggeredBy?: string;
  triggerType?: WorkflowTriggerType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Workflow template
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  definition: WorkflowDefinition;
  settings: WorkflowSettings;
  metadata: WorkflowMetadata;
  tags: string[];
  authorId?: string;
  downloads: number;
  rating: number;
  featured: boolean;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Workflow validation result
 */
export interface WorkflowValidationResult {
  isValid: boolean;
  errors: WorkflowValidationError[];
  warnings: string[];
}

/**
 * Workflow validation error
 */
export interface WorkflowValidationError {
  type: 'missing_agent' | 'invalid_connection' | 'circular_dependency' | 'invalid_config' | 'incompatible_data';
  message: string;
  agentId?: string;
  field?: string;
}

/**
 * Data flow validation result
 */
export interface DataFlowValidationResult {
  compatible: boolean;
  sourceAgent: string;
  targetAgent: string;
  sourceOutputType: string;
  targetInputType: string;
  transformationRequired: boolean;
  errors: string[];
}

/**
 * Execution options
 */
export interface ExecutionOptions {
  dryRun?: boolean;
  skipValidation?: boolean;
  startFromAgent?: string;
  stopAtAgent?: string;
  timeout?: number;
  retryPolicy?: Partial<RetryPolicy>;
  paperTrading?: boolean; // Enable paper trading mode (simulated execution)
  virtualPortfolio?: VirtualPortfolio; // Virtual portfolio for paper trading
}

/**
 * Virtual portfolio for paper trading
 */
export interface VirtualPortfolio {
  userId: string;
  balance: number; // Available balance in base currency
  positions: VirtualPosition[];
  totalValue: number; // Total portfolio value
  currency: string; // Base currency (e.g., 'USDT')
}

/**
 * Execution summary
 */
export interface ExecutionSummary {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: WorkflowExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  agentsExecuted: number;
  agentsSucceeded: number;
  agentsFailed: number;
  totalDataProcessed: number;
  error?: string;
}
