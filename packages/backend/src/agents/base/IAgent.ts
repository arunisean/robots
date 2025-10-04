import { EventEmitter } from 'events';
import {
  AgentCategory,
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentStatus,
  AgentMetrics,
  ExecutionContext,
  ResourceAllocation,
  ValidationResult
} from '@multi-agent-platform/shared';

/**
 * Core interface that all agents must implement
 * Provides unified contract for agent lifecycle and execution
 */
export interface IAgent extends EventEmitter {
  // Agent metadata
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly category: AgentCategory;
  readonly description: string;

  // Lifecycle methods
  initialize(config: AgentConfig): Promise<void>;
  execute(input: AgentInput): Promise<AgentOutput>;
  cleanup(): Promise<void>;

  // State management
  getStatus(): AgentStatus;
  getMetrics(): AgentMetrics;
  
  // Configuration management
  validateConfig(config: AgentConfig): ConfigValidationResult;
  updateConfig(config: Partial<AgentConfig>): Promise<void>;
  
  // Resource management
  allocateResources(allocation: ResourceAllocation): Promise<void>;
  releaseResources(): Promise<void>;
  
  // Health and monitoring
  healthCheck(): Promise<boolean>;
  getLastError(): Error | null;
}

/**
 * Extended interface for agents that support scheduling
 */
export interface ISchedulableAgent extends IAgent {
  schedule(cronExpression: string): Promise<void>;
  unschedule(): Promise<void>;
  getNextExecution(): Date | null;
}

/**
 * Extended interface for agents that support streaming
 */
export interface IStreamingAgent extends IAgent {
  startStream(input: AgentInput): AsyncIterableIterator<Partial<AgentOutput>>;
  stopStream(): Promise<void>;
}

/**
 * Extended interface for agents that support batch processing
 */
export interface IBatchAgent extends IAgent {
  executeBatch(inputs: AgentInput[]): Promise<AgentOutput[]>;
  getBatchStatus(batchId: string): Promise<BatchStatus>;
}

/**
 * Batch execution status
 */
export interface BatchStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

/**
 * Agent execution context with additional metadata
 */
export interface AgentExecutionContext extends ExecutionContext {
  parentAgentId?: string;
  workflowExecutionId?: string;
  retryCount: number;
  maxRetries: number;
  priority: number;
  tags: Record<string, string>;
}

/**
 * Agent factory interface for creating agent instances
 */
export interface IAgentFactory {
  createAgent(type: string, config: AgentConfig): Promise<IAgent>;
  getAvailableTypes(): string[];
  validateAgentType(type: string): boolean;
}

/**
 * Agent registry interface for managing agent instances
 */
export interface IAgentRegistry {
  register(agent: IAgent): Promise<void>;
  unregister(agentId: string): Promise<void>;
  get(agentId: string): IAgent | null;
  list(category?: AgentCategory): IAgent[];
  find(predicate: (agent: IAgent) => boolean): IAgent[];
}

/**
 * Agent execution result with detailed metrics
 */
export interface AgentExecutionResult extends AgentOutput {
  executionId: string;
  agentId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  resourceUsage: ResourceUsage;
  warnings: string[];
  debugInfo?: Record<string, any>;
}

/**
 * Resource usage tracking
 */
export interface ResourceUsage {
  cpuTime: number; // milliseconds
  memoryPeak: number; // bytes
  memoryAverage: number; // bytes
  networkRequests: number;
  networkBytes: number;
  storageReads: number;
  storageWrites: number;
  storageBytes: number;
}

/**
 * Simple configuration validation result
 */
export interface ConfigValidationResult {
  success: boolean;
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Agent configuration validation result
 */
export interface AgentValidationResult extends ValidationResult {
  configErrors: ConfigError[];
  resourceWarnings: string[];
  securityIssues: SecurityIssue[];
}

/**
 * Configuration error details
 */
export interface ConfigError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

/**
 * Security issue details
 */
export interface SecurityIssue {
  type: 'permission' | 'vulnerability' | 'exposure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation?: string;
}