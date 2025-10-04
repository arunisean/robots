import {
  AgentCategory,
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentStatus,
  AgentMetrics,
  ExecutionStatus,
  ResourceAllocation
} from '@multi-agent-platform/shared';
import {
  IAgent,
  AgentExecutionContext,
  AgentExecutionResult,
  ResourceUsage,
  ConfigValidationResult,
  AgentValidationResult
} from './IAgent';
import { Logger } from '../../utils/logger';
import { EventEmitter } from 'events';

// Simple validation result interface
interface ValidationResult {
  success: boolean;
  isValid: boolean;
  errors?: string[];
}

/**
 * Abstract base class implementing common agent functionality
 * Uses template method pattern to define execution flow
 */
export abstract class BaseAgent extends EventEmitter implements IAgent {
  protected config!: AgentConfig;
  protected status: AgentStatus = AgentStatus.INACTIVE;
  protected metrics!: AgentMetrics;
  protected lastError: Error | null = null;
  protected resourceAllocation: ResourceAllocation | null = null;
  protected logger: Logger;
  protected startTime: Date | null = null;
  protected resourceUsage!: ResourceUsage;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly version: string,
    public readonly category: AgentCategory,
    public readonly description: string
  ) {
    super();
    this.logger = new Logger(`Agent:${this.name}`);
    this.initializeMetrics();
    this.initializeResourceUsage();
  }

  /**
   * Initialize agent with configuration
   */
  async initialize(config: AgentConfig): Promise<void> {
    try {
      this.logger.info(`Initializing agent ${this.name}`);
      
      // Validate configuration
      const validation = this.validateConfig(config);
      if (!validation.success) {
        throw new Error(`Configuration validation failed: ${validation.errors?.join(', ')}`);
      }

      this.config = config;
      this.status = AgentStatus.INACTIVE;

      // Perform agent-specific initialization
      await this.doInitialize(config);

      this.status = AgentStatus.ACTIVE;
      this.emit('initialized', { agentId: this.id, config });
      
      this.logger.info(`Agent ${this.name} initialized successfully`);
    } catch (error) {
      this.lastError = error as Error;
      this.status = AgentStatus.ERROR;
      this.emit('error', { agentId: this.id, error });
      throw error;
    }
  }

  /**
   * Execute agent with input data using template method pattern
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    const executionId = this.generateExecutionId();
    this.startTime = new Date();
    
    try {
      this.logger.info(`Starting execution ${executionId} for agent ${this.name}`);
      this.status = AgentStatus.RUNNING;
      this.emit('executionStarted', { agentId: this.id, executionId, input });

      // Pre-execution validation and setup
      await this.preExecute(input);

      // Execute core business logic (implemented by subclasses)
      const result = await this.doExecute(input);

      // Post-execution processing
      const output = await this.postExecute(result, input);

      // Record successful execution
      this.recordSuccess(Date.now() - this.startTime.getTime());
      this.status = AgentStatus.ACTIVE;

      const executionResult: AgentExecutionResult = {
        ...output,
        executionId,
        agentId: this.id,
        startTime: this.startTime,
        endTime: new Date(),
        duration: Date.now() - this.startTime.getTime(),
        resourceUsage: this.resourceUsage,
        warnings: []
      };

      this.emit('executionCompleted', { agentId: this.id, result: executionResult });
      this.logger.info(`Execution ${executionId} completed successfully`);

      return output;
    } catch (error) {
      this.lastError = error as Error;
      this.recordFailure(error as Error, Date.now() - (this.startTime?.getTime() || Date.now()));
      this.status = AgentStatus.ERROR;

      this.emit('executionFailed', { agentId: this.id, executionId, error });
      this.logger.error(`Execution ${executionId} failed:`, error);

      throw error;
    }
  }

  /**
   * Cleanup agent resources
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.info(`Cleaning up agent ${this.name}`);
      
      await this.doCleanup();
      await this.releaseResources();
      
      this.status = AgentStatus.INACTIVE;
      this.emit('cleanup', { agentId: this.id });
      
      this.logger.info(`Agent ${this.name} cleaned up successfully`);
    } catch (error) {
      this.lastError = error as Error;
      this.logger.error(`Cleanup failed for agent ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Get current agent status
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Get agent metrics
   */
  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  /**
   * Validate agent configuration
   */
  validateConfig(config: AgentConfig): ConfigValidationResult {
    const errors: string[] = [];

    // Basic validation
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Agent name is required');
    }

    if (!config.category || !Object.values(AgentCategory).includes(config.category)) {
      errors.push('Valid agent category is required');
    }

    if (!config.resources) {
      errors.push('Resource allocation is required');
    } else {
      if (config.resources.memory < 64) {
        errors.push('Minimum memory allocation is 64MB');
      }
      if (config.resources.cpu < 0.1) {
        errors.push('Minimum CPU allocation is 0.1 cores');
      }
      if (config.resources.timeout < 1) {
        errors.push('Minimum timeout is 1 second');
      }
    }

    // Agent-specific validation
    const specificValidation = this.validateSpecificConfig(config);
    errors.push(...specificValidation);

    return {
      success: errors.length === 0,
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Update agent configuration
   */
  async updateConfig(config: Partial<AgentConfig>): Promise<void> {
    const newConfig = { ...this.config, ...config };
    const validation = this.validateConfig(newConfig);
    
    if (!validation.success) {
      throw new Error(`Configuration update failed: ${validation.errors?.join(', ')}`);
    }

    const oldConfig = this.config;
    this.config = newConfig;

    try {
      await this.onConfigUpdate(oldConfig, newConfig);
      this.emit('configUpdated', { agentId: this.id, oldConfig, newConfig });
    } catch (error) {
      // Rollback on failure
      this.config = oldConfig;
      throw error;
    }
  }

  /**
   * Allocate resources for agent execution
   */
  async allocateResources(allocation: ResourceAllocation): Promise<void> {
    this.resourceAllocation = allocation;
    await this.onResourcesAllocated(allocation);
    this.emit('resourcesAllocated', { agentId: this.id, allocation });
  }

  /**
   * Release allocated resources
   */
  async releaseResources(): Promise<void> {
    if (this.resourceAllocation) {
      await this.onResourcesReleased(this.resourceAllocation);
      this.emit('resourcesReleased', { agentId: this.id, allocation: this.resourceAllocation });
      this.resourceAllocation = null;
    }
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.doHealthCheck();
    } catch (error) {
      this.logger.error(`Health check failed for agent ${this.name}:`, error);
      return false;
    }
  }

  /**
   * Get last execution error
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  // Abstract methods to be implemented by subclasses

  /**
   * Agent-specific initialization logic
   */
  protected abstract doInitialize(config: AgentConfig): Promise<void>;

  /**
   * Core execution logic - must be implemented by subclasses
   */
  protected abstract doExecute(input: AgentInput): Promise<any>;

  /**
   * Agent-specific cleanup logic
   */
  protected abstract doCleanup(): Promise<void>;

  /**
   * Agent-specific configuration validation
   */
  protected abstract validateSpecificConfig(config: AgentConfig): string[];

  /**
   * Agent-specific health check logic
   */
  protected abstract doHealthCheck(): Promise<boolean>;

  // Template method hooks (optional overrides)

  /**
   * Pre-execution hook
   */
  protected async preExecute(input: AgentInput): Promise<void> {
    // Default implementation - can be overridden
    this.logger.debug(`Pre-execution for agent ${this.name}`);
  }

  /**
   * Post-execution hook
   */
  protected async postExecute(result: any, input: AgentInput): Promise<AgentOutput> {
    return {
      data: result,
      metadata: {
        generatedAt: new Date(),
        processingTime: Date.now() - (this.startTime?.getTime() || Date.now()),
        version: this.version,
        format: 'json'
      },
      metrics: {
        startTime: this.startTime || new Date(),
        endTime: new Date(),
        duration: Date.now() - (this.startTime?.getTime() || Date.now()),
        memoryUsed: this.resourceUsage.memoryPeak,
        cpuUsed: this.resourceUsage.cpuTime,
        networkRequests: this.resourceUsage.networkRequests,
        errors: 0
      },
      status: ExecutionStatus.SUCCESS
    };
  }

  /**
   * Configuration update hook
   */
  protected async onConfigUpdate(oldConfig: AgentConfig, newConfig: AgentConfig): Promise<void> {
    // Default implementation - can be overridden
    this.logger.info(`Configuration updated for agent ${this.name}`);
  }

  /**
   * Resource allocation hook
   */
  protected async onResourcesAllocated(allocation: ResourceAllocation): Promise<void> {
    // Default implementation - can be overridden
    this.logger.debug(`Resources allocated for agent ${this.name}:`, allocation);
  }

  /**
   * Resource release hook
   */
  protected async onResourcesReleased(allocation: ResourceAllocation): Promise<void> {
    // Default implementation - can be overridden
    this.logger.debug(`Resources released for agent ${this.name}`);
  }

  // Private helper methods

  private initializeMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      lastExecutionTime: undefined,
      uptime: 0,
      errorRate: 0
    };
  }

  private initializeResourceUsage(): void {
    this.resourceUsage = {
      cpuTime: 0,
      memoryPeak: 0,
      memoryAverage: 0,
      networkRequests: 0,
      networkBytes: 0,
      storageReads: 0,
      storageWrites: 0,
      storageBytes: 0
    };
  }

  private recordSuccess(duration: number): void {
    this.metrics.totalExecutions++;
    this.metrics.successfulExecutions++;
    this.metrics.lastExecutionTime = duration;
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (this.metrics.totalExecutions - 1) + duration) / 
      this.metrics.totalExecutions;
    this.metrics.errorRate = this.metrics.failedExecutions / this.metrics.totalExecutions;
  }

  private recordFailure(error: Error, duration: number): void {
    this.metrics.totalExecutions++;
    this.metrics.failedExecutions++;
    this.metrics.lastExecutionTime = duration;
    this.metrics.errorRate = this.metrics.failedExecutions / this.metrics.totalExecutions;
  }

  private generateExecutionId(): string {
    return `${this.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}