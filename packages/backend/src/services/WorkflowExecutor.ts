import { EventEmitter } from 'events';
import {
  Workflow,
  WorkflowExecution,
  WorkflowExecutionStatus,
  WorkflowTriggerType,
  AgentExecutionResult,
  AgentExecutionStatus,
  ExecutionOptions,
  AgentInput,
  AgentOutput,
  AgentCategory
} from '@multi-agent-platform/shared';
import { ExecutionRepository } from '../database/repositories';
import { AgentFactory } from '../agents/factory/AgentFactory';
import { IAgent } from '../agents/base/IAgent';
import { Logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error-handler';

/**
 * Execution context for a workflow run
 */
interface ExecutionContext {
  executionId: string;
  workflowId: string;
  userId?: string;
  startTime: Date;
  agentResults: Map<string, any>;
  currentAgentIndex: number;
}

/**
 * Orchestrates workflow execution
 * Manages sequential agent execution and data flow
 */
export class WorkflowExecutor extends EventEmitter {
  private executionRepo: ExecutionRepository;
  private agentFactory: AgentFactory;
  private logger: Logger;
  private activeExecutions: Map<string, ExecutionContext>;

  constructor(executionRepo: ExecutionRepository, agentFactory: AgentFactory) {
    super();
    this.executionRepo = executionRepo;
    this.agentFactory = agentFactory;
    this.logger = new Logger('WorkflowExecutor');
    this.activeExecutions = new Map();
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflow: Workflow,
    options: ExecutionOptions = {},
    userId?: string
  ): Promise<WorkflowExecution> {
    this.logger.info(`Starting workflow execution: ${workflow.id} (${workflow.name})`);

    // Create execution record
    const execution = await this.executionRepo.createExecution({
      workflowId: workflow.id,
      triggeredBy: userId,
      triggerType: options.dryRun ? 'manual' : ('manual' as WorkflowTriggerType),
      inputData: {},
      metadata: {
        dryRun: options.dryRun || false,
        options
      }
    });

    // Create execution context
    const context: ExecutionContext = {
      executionId: execution.id,
      workflowId: workflow.id,
      userId,
      startTime: new Date(),
      agentResults: new Map(),
      currentAgentIndex: 0
    };

    this.activeExecutions.set(execution.id, context);

    try {
      // Emit execution started event
      await this.emitExecutionEvent(execution.id, 'execution.started', {
        workflowId: workflow.id,
        workflowName: workflow.name
      });

      // Update execution status to running
      await this.executionRepo.updateStatus(execution.id, 'running');

      // If dry run, just validate and return
      if (options.dryRun) {
        this.logger.info(`Dry run mode - skipping actual execution`);
        await this.executionRepo.updateStatus(execution.id, 'completed');
        return await this.executionRepo.findById(execution.id) as WorkflowExecution;
      }

      // Sort agents by order
      const sortedAgents = [...workflow.definition.nodes].sort((a, b) => a.order - b.order);

      // Determine start and end points
      const startIndex = options.startFromAgent 
        ? sortedAgents.findIndex(a => a.id === options.startFromAgent)
        : 0;
      
      const endIndex = options.stopAtAgent
        ? sortedAgents.findIndex(a => a.id === options.stopAtAgent)
        : sortedAgents.length - 1;

      if (startIndex === -1 || endIndex === -1) {
        throw new Error('Invalid start or stop agent specified');
      }

      // Execute agents sequentially
      let previousOutput: any = null;

      for (let i = startIndex; i <= endIndex; i++) {
        const agentNode = sortedAgents[i];
        context.currentAgentIndex = i;

        this.logger.info(`Executing agent ${i + 1}/${sortedAgents.length}: ${agentNode.id} (${agentNode.agentType})`);

        try {
          // Execute agent
          const result = await this.executeAgent(
            agentNode,
            previousOutput,
            context,
            workflow.settings.executionTimeout
          );

          // Store result
          context.agentResults.set(agentNode.id, result.outputData);
          previousOutput = result.outputData;

          // Save agent result to database
          await this.executionRepo.createAgentResult({
            executionId: execution.id,
            agentId: agentNode.id,
            agentType: agentNode.agentType,
            agentCategory: agentNode.agentCategory,
            status: 'success',
            orderIndex: i,
            inputData: result.inputData,
            outputData: result.outputData,
            startTime: result.startTime,
            endTime: result.endTime,
            metrics: result.metrics
          });

        } catch (error) {
          this.logger.error(`Agent execution failed: ${agentNode.id}`, error);

          // Save failed agent result
          await this.executionRepo.createAgentResult({
            executionId: execution.id,
            agentId: agentNode.id,
            agentType: agentNode.agentType,
            agentCategory: agentNode.agentCategory,
            status: 'failed',
            orderIndex: i,
            inputData: previousOutput,
            outputData: {},
            startTime: new Date(),
            endTime: new Date(),
            error: getErrorMessage(error),
            metrics: {}
          });

          // Emit agent failed event
          await this.emitExecutionEvent(execution.id, 'agent.failed', {
            agentId: agentNode.id,
            agentType: agentNode.agentType,
            error: getErrorMessage(error)
          }, agentNode.id);

          // Handle error based on workflow settings
          if (workflow.settings.errorHandling.strategy === 'stop') {
            throw error;
          } else if (workflow.settings.errorHandling.strategy === 'skip') {
            this.logger.warn(`Skipping failed agent: ${agentNode.id}`);
            continue;
          }
          // 'continue' strategy - just log and continue
        }
      }

      // Mark execution as completed
      await this.executionRepo.updateStatus(execution.id, 'completed');

      // Emit execution completed event
      await this.emitExecutionEvent(execution.id, 'execution.completed', {
        workflowId: workflow.id,
        duration: Date.now() - context.startTime.getTime(),
        agentsExecuted: context.agentResults.size
      });

      this.logger.info(`Workflow execution completed: ${execution.id}`);

      // Get final execution with results
      const finalExecution = await this.executionRepo.findById(execution.id);
      if (finalExecution) {
        finalExecution.results = await this.executionRepo.findAgentResultsByExecutionId(execution.id);
      }

      return finalExecution as WorkflowExecution;

    } catch (error) {
      this.logger.error(`Workflow execution failed: ${execution.id}`, error);

      // Mark execution as failed
      await this.executionRepo.updateStatus(execution.id, 'failed', getErrorMessage(error));

      // Emit execution failed event
      await this.emitExecutionEvent(execution.id, 'execution.failed', {
        workflowId: workflow.id,
        error: getErrorMessage(error)
      });

      throw error;

    } finally {
      // Clean up
      this.activeExecutions.delete(execution.id);
    }
  }

  /**
   * Execute a single agent
   */
  private async executeAgent(
    agentNode: any,
    inputData: any,
    context: ExecutionContext,
    timeout: number
  ): Promise<{
    inputData: any;
    outputData: any;
    startTime: Date;
    endTime: Date;
    metrics: any;
  }> {
    const startTime = new Date();

    // Emit agent started event
    await this.emitExecutionEvent(context.executionId, 'agent.started', {
      agentId: agentNode.id,
      agentType: agentNode.agentType,
      agentCategory: agentNode.agentCategory
    }, agentNode.id);

    try {
      // Create agent instance
      const agent = await this.agentFactory.createAgent(agentNode.agentType, agentNode.config);

      // Prepare input
      const agentInput = this.prepareAgentInput(agentNode, inputData);

      // Execute agent with timeout
      const output = await this.executeWithTimeout(
        agent,
        agentInput,
        timeout * 1000 // Convert to milliseconds
      );

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Emit agent completed event
      await this.emitExecutionEvent(context.executionId, 'agent.completed', {
        agentId: agentNode.id,
        agentType: agentNode.agentType,
        duration,
        outputSize: JSON.stringify(output).length
      }, agentNode.id);

      // Get metrics
      const metrics = agent.getMetrics();

      // Cleanup agent
      await agent.cleanup();

      return {
        inputData: agentInput,
        outputData: output,
        startTime,
        endTime,
        metrics: {
          duration,
          memoryUsed: (metrics as any).memoryUsed || 0,
          cpuTime: (metrics as any).cpuTime || 0
        }
      };

    } catch (error) {
      const endTime = new Date();
      this.logger.error(`Agent execution error: ${agentNode.id}`, error);
      throw error;
    }
  }

  /**
   * Execute agent with timeout
   */
  private async executeWithTimeout(
    agent: IAgent,
    input: AgentInput,
    timeoutMs: number
  ): Promise<AgentOutput> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Agent execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const result = await agent.execute(input);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Prepare agent input based on category
   */
  private prepareAgentInput(agentNode: any, previousOutput: any): AgentInput {
    const baseContext = {
      userId: '',
      workflowId: '',
      executionId: '',
      environment: 'production' as const,
      resources: {
        memory: 256,
        cpu: 0.5,
        timeout: 300,
        storage: 100
      }
    };

    // Work agents typically don't need input from previous agents
    if (agentNode.agentCategory === AgentCategory.WORK) {
      return {
        data: {},
        context: baseContext,
        metadata: {
          timestamp: new Date(),
          source: 'workflow_executor'
        } as any
      };
    }

    // Other agents receive output from previous agent
    return {
      data: previousOutput || {},
      context: baseContext,
      metadata: {
        timestamp: new Date(),
        source: 'workflow_executor',
        previousAgent: previousOutput?.metadata?.agentId
      } as any
    };
  }

  /**
   * Get input type for agent category
   */
  private getInputTypeForCategory(category: AgentCategory): string {
    switch (category) {
      case AgentCategory.WORK:
        return 'work';
      case AgentCategory.PROCESS:
        return 'process';
      case AgentCategory.PUBLISH:
        return 'publish';
      case AgentCategory.VALIDATE:
        return 'validate';
      default:
        return 'unknown';
    }
  }

  /**
   * Cancel a running execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    this.logger.info(`Cancelling execution: ${executionId}`);

    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error(`Execution ${executionId} is not running`);
    }

    try {
      // Update status
      await this.executionRepo.updateStatus(executionId, 'cancelled');

      // Emit event
      await this.emitExecutionEvent(executionId, 'execution.cancelled', {
        workflowId: context.workflowId,
        cancelledAt: new Date()
      });

      // Clean up
      this.activeExecutions.delete(executionId);

      this.logger.info(`Execution cancelled: ${executionId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel execution ${executionId}:`, error);
      throw error;
    }
  }

  /**
   * Retry a failed execution
   */
  async retryExecution(
    workflow: Workflow,
    failedExecutionId: string,
    fromAgentId?: string,
    userId?: string
  ): Promise<WorkflowExecution> {
    this.logger.info(`Retrying execution: ${failedExecutionId}`);

    // Get failed execution
    const failedExecution = await this.executionRepo.findById(failedExecutionId);
    if (!failedExecution) {
      throw new Error(`Execution ${failedExecutionId} not found`);
    }

    if (failedExecution.status !== 'failed') {
      throw new Error(`Execution ${failedExecutionId} is not in failed state`);
    }

    // Execute workflow with retry options
    const options: ExecutionOptions = {
      startFromAgent: fromAgentId
    };

    return await this.executeWorkflow(workflow, options, userId);
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Check if execution is active
   */
  isExecutionActive(executionId: string): boolean {
    return this.activeExecutions.has(executionId);
  }

  /**
   * Get execution context
   */
  getExecutionContext(executionId: string): ExecutionContext | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Emit execution event
   */
  private async emitExecutionEvent(
    executionId: string,
    eventType: string,
    data: Record<string, any>,
    agentId?: string
  ): Promise<void> {
    try {
      // Save event to database
      await this.executionRepo.createEvent({
        executionId,
        eventType: eventType as any,
        agentId,
        data
      });

      // Emit event for real-time listeners
      this.emit('executionEvent', {
        executionId,
        eventType,
        agentId,
        data,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Failed to emit execution event:', error);
      // Don't throw - event emission failure shouldn't stop execution
    }
  }
}
