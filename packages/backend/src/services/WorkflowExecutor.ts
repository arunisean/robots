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
  AgentCategory,
  DecisionConfig
} from '@multi-agent-platform/shared';
import { ExecutionRepository } from '../database/repositories';
import { AgentFactory } from '../agents/factory/AgentFactory';
import { IAgent } from '../agents/base/IAgent';
import { Logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error-handler';
import { eventBroadcaster } from './EventBroadcaster';
import { DecisionEngine } from './DecisionEngine';
import { RiskControlMiddleware } from './RiskControlMiddleware';

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
  private decisionEngine: DecisionEngine;
  private riskControl: RiskControlMiddleware;
  private logger: Logger;
  private activeExecutions: Map<string, ExecutionContext>;

  constructor(
    executionRepo: ExecutionRepository,
    agentFactory: AgentFactory,
    riskControl?: RiskControlMiddleware
  ) {
    super();
    this.executionRepo = executionRepo;
    this.agentFactory = agentFactory;
    this.decisionEngine = new DecisionEngine();
    this.riskControl = riskControl || new RiskControlMiddleware();
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

      // Broadcast WebSocket event
      eventBroadcaster.emitExecutionStarted(execution.id, workflow.id, {
        workflowName: workflow.name,
        agentCount: workflow.definition.nodes.length
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

      // Execute agents with parallel support for Monitor agents and conditional logic
      let previousOutput: any = null;
      let analyzeOutput: any = null; // Store Analyze output for decision evaluation
      let i = startIndex;

      while (i <= endIndex) {
        const currentAgent = sortedAgents[i];

        // Check if this is a Monitor agent and if there are consecutive Monitor agents
        if (currentAgent.agentCategory === AgentCategory.MONITOR) {
          // Find all consecutive Monitor agents
          const monitorAgents = [];
          let j = i;
          while (j <= endIndex && sortedAgents[j].agentCategory === AgentCategory.MONITOR) {
            monitorAgents.push(sortedAgents[j]);
            j++;
          }

          this.logger.info(`Executing ${monitorAgents.length} Monitor agents in parallel`);

          // Execute Monitor agents in parallel
          const monitorResults = await this.executeMonitorAgentsParallel(
            monitorAgents,
            execution.id,
            workflow.id,
            context,
            workflow.settings.executionTimeout
          );

          // Aggregate results
          previousOutput = this.aggregateMonitorResults(monitorResults);

          // Move index past all Monitor agents
          i = j;
        } else {
          // Execute non-Monitor agents sequentially
          const agentNode = currentAgent;
          context.currentAgentIndex = i;

          this.logger.info(`Executing agent ${i + 1}/${sortedAgents.length}: ${agentNode.id} (${agentNode.agentType})`);

          // Broadcast agent started event
          eventBroadcaster.emitAgentStarted(
            execution.id,
            workflow.id,
            agentNode.id,
            agentNode.agentType
          );

          // Broadcast progress
          const progress = Math.round(((i + 1) / sortedAgents.length) * 100);
          eventBroadcaster.emitExecutionProgress(
            execution.id,
            workflow.id,
            progress,
            agentNode.id
          );

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

            // Store Analyze output for decision evaluation
            if (agentNode.agentCategory === AgentCategory.ANALYZE) {
              analyzeOutput = result.outputData;
            }

            // Record trade result after Verify stage
            if (agentNode.agentCategory === AgentCategory.VERIFY && userId) {
              await this.recordTradeResult(
                userId,
                result.outputData,
                execution.id,
                context
              );
            }

            // Broadcast agent completed event
            eventBroadcaster.emitAgentCompleted(
              execution.id,
              workflow.id,
              agentNode.id,
              agentNode.agentType,
              result.outputData
            );

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

            // Broadcast agent failed event
            eventBroadcaster.emitAgentFailed(
              execution.id,
              workflow.id,
              agentNode.id,
              agentNode.agentType,
              getErrorMessage(error)
            );

            // Handle error based on workflow settings
            if (workflow.settings.errorHandling.strategy === 'stop') {
              throw error;
            } else if (workflow.settings.errorHandling.strategy === 'skip') {
              this.logger.warn(`Skipping failed agent: ${agentNode.id}`);
            }
            // 'continue' strategy - just log and continue
          }

          // Check if next agent is Execute and we have decision config or risk controls
          const nextAgent = i + 1 <= endIndex ? sortedAgents[i + 1] : null;
          if (nextAgent &&
            nextAgent.agentCategory === AgentCategory.EXECUTE &&
            agentNode.agentCategory === AgentCategory.ANALYZE) {

            let shouldExecute = true;

            // 1. Evaluate decision rules if configured
            if (workflow.definition.decisionConfig) {
              shouldExecute = await this.evaluateDecision(
                workflow.definition.decisionConfig,
                analyzeOutput || previousOutput,
                execution.id,
                context
              );

              if (!shouldExecute) {
                this.logger.info('Decision evaluation failed - skipping Execute agents');
              }
            }

            // 2. Check risk controls if decision passed and risk config exists
            if (shouldExecute && workflow.settings.riskControls) {
              const riskCheckPassed = await this.checkRiskControls(
                userId,
                analyzeOutput || previousOutput,
                workflow.settings.riskControls,
                execution.id,
                context
              );

              if (!riskCheckPassed) {
                this.logger.warn('Risk control check failed - skipping Execute agents');
                shouldExecute = false;
              }
            }

            // Skip Execute agents if either check failed
            if (!shouldExecute) {
              while (i + 1 <= endIndex && sortedAgents[i + 1].agentCategory === AgentCategory.EXECUTE) {
                const skippedAgent = sortedAgents[i + 1];

                // Log skipped agent
                await this.executionRepo.createAgentResult({
                  executionId: execution.id,
                  agentId: skippedAgent.id,
                  agentType: skippedAgent.agentType,
                  agentCategory: skippedAgent.agentCategory,
                  status: 'skipped',
                  orderIndex: i + 1,
                  inputData: previousOutput,
                  outputData: {},
                  startTime: new Date(),
                  endTime: new Date(),
                  error: 'Skipped due to decision or risk control failure',
                  metrics: {}
                });

                // Emit skipped event
                await this.emitExecutionEvent(execution.id, 'agent.skipped', {
                  agentId: skippedAgent.id,
                  agentType: skippedAgent.agentType,
                  reason: 'Decision evaluation or risk control failed'
                }, skippedAgent.id);

                i++;
              }
            } else if (workflow.settings.riskControls) {
              // Increment active trades counter before execution
              this.riskControl.incrementActiveTrades(userId || 'unknown');
            }
          }

          i++;
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

      // Broadcast execution completed event
      eventBroadcaster.emitExecutionCompleted(execution.id, workflow.id, {
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

      // Broadcast execution failed event
      eventBroadcaster.emitExecutionFailed(execution.id, workflow.id, getErrorMessage(error));

      throw error;

    } finally {
      // Clean up
      this.activeExecutions.delete(execution.id);
    }
  }

  /**
   * Execute multiple Monitor agents in parallel
   */
  private async executeMonitorAgentsParallel(
    monitorAgents: any[],
    executionId: string,
    workflowId: string,
    context: ExecutionContext,
    timeout: number
  ): Promise<Array<{
    agentId: string;
    agentType: string;
    success: boolean;
    outputData?: any;
    error?: string;
    startTime: Date;
    endTime: Date;
    metrics: any;
  }>> {
    const startTime = new Date();

    // Execute all Monitor agents concurrently
    const results = await Promise.allSettled(
      monitorAgents.map(async (agentNode, index) => {
        const agentStartTime = new Date();

        try {
          // Broadcast agent started event
          eventBroadcaster.emitAgentStarted(
            executionId,
            workflowId,
            agentNode.id,
            agentNode.agentType
          );

          // Execute agent
          const result = await this.executeAgent(
            agentNode,
            null, // Monitor agents don't need previous output
            context,
            timeout
          );

          // Store result
          context.agentResults.set(agentNode.id, result.outputData);

          // Broadcast agent completed event
          eventBroadcaster.emitAgentCompleted(
            executionId,
            workflowId,
            agentNode.id,
            agentNode.agentType,
            result.outputData
          );

          // Save agent result to database
          await this.executionRepo.createAgentResult({
            executionId,
            agentId: agentNode.id,
            agentType: agentNode.agentType,
            agentCategory: agentNode.agentCategory,
            status: 'success',
            orderIndex: context.currentAgentIndex + index,
            inputData: result.inputData,
            outputData: result.outputData,
            startTime: result.startTime,
            endTime: result.endTime,
            metrics: result.metrics
          });

          return {
            agentId: agentNode.id,
            agentType: agentNode.agentType,
            success: true,
            outputData: result.outputData,
            startTime: result.startTime,
            endTime: result.endTime,
            metrics: result.metrics
          };

        } catch (error) {
          this.logger.error(`Monitor agent execution failed: ${agentNode.id}`, error);

          // Save failed agent result
          await this.executionRepo.createAgentResult({
            executionId,
            agentId: agentNode.id,
            agentType: agentNode.agentType,
            agentCategory: agentNode.agentCategory,
            status: 'failed',
            orderIndex: context.currentAgentIndex + index,
            inputData: {},
            outputData: {},
            startTime: agentStartTime,
            endTime: new Date(),
            error: getErrorMessage(error),
            metrics: {}
          });

          // Broadcast agent failed event
          eventBroadcaster.emitAgentFailed(
            executionId,
            workflowId,
            agentNode.id,
            agentNode.agentType,
            getErrorMessage(error)
          );

          return {
            agentId: agentNode.id,
            agentType: agentNode.agentType,
            success: false,
            error: getErrorMessage(error),
            startTime: agentStartTime,
            endTime: new Date(),
            metrics: {}
          };
        }
      })
    );

    const endTime = new Date();
    const totalDuration = endTime.getTime() - startTime.getTime();

    // Process results
    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Handle rejected promises
        const agentNode = monitorAgents[index];
        this.logger.error(`Monitor agent promise rejected: ${agentNode.id}`, result.reason);
        return {
          agentId: agentNode.id,
          agentType: agentNode.agentType,
          success: false,
          error: getErrorMessage(result.reason),
          startTime,
          endTime,
          metrics: {}
        };
      }
    });

    // Calculate execution metrics
    const successCount = processedResults.filter(r => r.success).length;
    const failureCount = processedResults.length - successCount;

    const durations = processedResults.map(r =>
      r.endTime.getTime() - r.startTime.getTime()
    );

    const longestDuration = Math.max(...durations);
    const shortestDuration = Math.min(...durations);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    // Find bottleneck agent
    const bottleneckIndex = durations.indexOf(longestDuration);
    const bottleneckAgent = processedResults[bottleneckIndex];

    // Calculate parallel efficiency (how much faster than sequential)
    const sequentialDuration = durations.reduce((a, b) => a + b, 0);
    const parallelEfficiency = ((sequentialDuration - totalDuration) / sequentialDuration) * 100;

    const metrics = {
      stage: 'monitor',
      executionMode: 'parallel',
      totalAgents: processedResults.length,
      successCount,
      failureCount,
      totalDuration,
      sequentialDuration,
      parallelEfficiency: Math.round(parallelEfficiency * 100) / 100,
      bottleneck: {
        agentId: bottleneckAgent.agentId,
        agentType: bottleneckAgent.agentType,
        duration: longestDuration
      },
      durations: {
        min: shortestDuration,
        max: longestDuration,
        avg: Math.round(avgDuration),
        individual: processedResults.map(r => ({
          agentId: r.agentId,
          duration: r.endTime.getTime() - r.startTime.getTime()
        }))
      }
    };

    this.logger.info(
      `Parallel Monitor execution completed: ${successCount}/${processedResults.length} succeeded, ` +
      `total time: ${totalDuration}ms (vs ${sequentialDuration}ms sequential), ` +
      `efficiency: ${metrics.parallelEfficiency}%, bottleneck: ${bottleneckAgent.agentId} (${longestDuration}ms)`
    );

    // Emit metrics event
    await this.emitExecutionEvent(executionId, 'agent.progress', metrics);

    // Store metrics in context for later analysis
    if (!context.agentResults.has('_parallelMetrics')) {
      context.agentResults.set('_parallelMetrics', []);
    }
    context.agentResults.get('_parallelMetrics').push(metrics);

    return processedResults;
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
   * Record trade result after Verify stage
   */
  private async recordTradeResult(
    userId: string,
    verifyOutput: any,
    executionId: string,
    context: ExecutionContext
  ): Promise<void> {
    try {
      // Extract P&L from verify output
      const profitLoss = verifyOutput?.profitLoss || verifyOutput?.pnl || 0;
      const profitLossPercentage = verifyOutput?.profitLossPercentage || verifyOutput?.pnlPercentage || 0;
      const tradeSize = verifyOutput?.tradeSize || verifyOutput?.positionSize || 0;

      if (profitLoss === 0 && profitLossPercentage === 0) {
        this.logger.info('No P&L data in verify output - skipping trade result recording');
        return;
      }

      // Record trade result
      await this.riskControl.recordTradeResult({
        userId,
        strategyInstanceId: context.workflowId,
        profitLoss,
        profitLossPercentage,
        tradeSize,
        timestamp: new Date(),
        executionId
      });

      this.logger.info(
        `Recorded trade result for user ${userId}: ` +
        `P&L ${profitLoss} (${profitLossPercentage.toFixed(2)}%)`
      );

      // Check if daily loss threshold exceeded
      const userState = this.riskControl.getUserRiskState(userId);
      if (userState.dailyLoss > 10) { // Assuming 10% is a critical threshold
        this.logger.error(
          `CRITICAL: User ${userId} daily loss ${userState.dailyLoss.toFixed(2)}% exceeds threshold!`
        );

        // Emit critical alert
        await this.emitExecutionEvent(executionId, 'agent.progress', {
          stage: 'risk_alert',
          severity: 'critical',
          type: 'daily_loss_exceeded',
          dailyLoss: userState.dailyLoss,
          message: 'Daily loss threshold exceeded - strategy should be paused'
        });
      }

      // Emit trade result event
      await this.emitExecutionEvent(executionId, 'agent.progress', {
        stage: 'trade_result',
        profitLoss,
        profitLossPercentage,
        tradeSize,
        dailyLoss: userState.dailyLoss,
        activeTrades: userState.activeTrades
      });

    } catch (error) {
      this.logger.error('Error recording trade result:', error);
      // Don't throw - recording failure shouldn't stop execution
    }
  }

  /**
   * Check risk controls before Execute stage
   */
  private async checkRiskControls(
    userId: string | undefined,
    analyzeOutput: any,
    riskConfig: any,
    executionId: string,
    context: ExecutionContext
  ): Promise<boolean> {
    if (!userId) {
      this.logger.warn('No userId provided - skipping risk controls');
      return true; // Allow execution if no user context
    }

    this.logger.info('Checking risk controls before Execute stage');

    try {
      // Extract trade parameters from analyze output
      const tradeSize = analyzeOutput?.tradeSize || analyzeOutput?.positionSize || 0;
      const portfolioValue = analyzeOutput?.portfolioValue || 10000; // Default fallback

      if (tradeSize === 0) {
        this.logger.warn('Trade size is 0 - allowing execution');
        return true;
      }

      // Perform risk check
      const riskCheckResult = await this.riskControl.checkBeforeExecution(
        userId,
        tradeSize,
        portfolioValue,
        riskConfig,
        context.workflowId
      );

      // Log risk check result
      await this.emitExecutionEvent(executionId, 'agent.progress', {
        stage: 'risk_control',
        allowed: riskCheckResult.allowed,
        checks: riskCheckResult.checks.map(c => ({
          type: c.type,
          passed: c.passed,
          reason: c.reason,
          severity: c.severity
        })),
        warnings: riskCheckResult.warnings
      });

      // Store risk check result in context
      context.agentResults.set('_riskCheckResult', riskCheckResult);

      if (!riskCheckResult.allowed) {
        const failedChecks = riskCheckResult.checks
          .filter(c => !c.passed)
          .map(c => c.type)
          .join(', ');

        this.logger.warn(
          `Risk control check FAILED for user ${userId}: ${failedChecks}`
        );

        // Emit risk control event
        await this.emitExecutionEvent(executionId, 'agent.failed', {
          stage: 'risk_control',
          reason: 'Risk limits exceeded',
          failedChecks: riskCheckResult.checks.filter(c => !c.passed)
        });
      } else {
        this.logger.info(`Risk control check PASSED for user ${userId}`);

        // Log warnings if any
        if (riskCheckResult.warnings.length > 0) {
          this.logger.warn(`Risk warnings: ${riskCheckResult.warnings.join(', ')}`);
        }
      }

      return riskCheckResult.allowed;

    } catch (error) {
      this.logger.error('Error checking risk controls:', error);

      // Log error event
      await this.emitExecutionEvent(executionId, 'agent.failed', {
        stage: 'risk_control',
        error: getErrorMessage(error)
      });

      // On error, default to not executing (fail-safe)
      return false;
    }
  }

  /**
   * Evaluate decision rules to determine if execution should proceed
   */
  private async evaluateDecision(
    decisionConfig: DecisionConfig,
    data: any,
    executionId: string,
    context: ExecutionContext
  ): Promise<boolean> {
    this.logger.info('Evaluating decision rules');

    try {
      // Validate decision config
      const validation = this.decisionEngine.validateConfig(decisionConfig);
      if (!validation.valid) {
        this.logger.error('Invalid decision config:', validation.errors);
        throw new Error(`Invalid decision config: ${validation.errors.join(', ')}`);
      }

      // Evaluate decision
      const result = this.decisionEngine.evaluateDecision(decisionConfig, data);

      // Log decision result
      await this.emitExecutionEvent(executionId, 'agent.progress', {
        stage: 'decision',
        passed: result.passed,
        operator: result.operator,
        rulesEvaluated: result.ruleResults.length,
        rulesPassed: result.ruleResults.filter(r => r.passed).length,
        executionTime: result.executionTime,
        details: result.ruleResults.map(r => ({
          field: r.rule.field,
          operator: r.rule.operator,
          expected: r.expectedValue,
          actual: r.actualValue,
          passed: r.passed,
          error: r.error
        }))
      });

      // Store decision result in context
      context.agentResults.set('_decisionResult', result);

      this.logger.info(
        `Decision evaluation ${result.passed ? 'PASSED' : 'FAILED'}: ` +
        `${result.ruleResults.filter(r => r.passed).length}/${result.ruleResults.length} rules passed`
      );

      return result.passed;

    } catch (error) {
      this.logger.error('Error evaluating decision:', error);

      // Log error event
      await this.emitExecutionEvent(executionId, 'agent.failed', {
        stage: 'decision',
        error: getErrorMessage(error)
      });

      // On error, default to not executing (fail-safe)
      return false;
    }
  }

  /**
   * Aggregate results from parallel Monitor agents
   */
  private aggregateMonitorResults(
    results: Array<{
      agentId: string;
      agentType: string;
      success: boolean;
      outputData?: any;
      error?: string;
      startTime: Date;
      endTime: Date;
      metrics: any;
    }>,
    strategy: 'merge' | 'first' | 'last' | 'average' | 'weighted' = 'merge'
  ): any {
    // Filter successful results
    const successfulResults = results.filter(r => r.success && r.outputData);

    if (successfulResults.length === 0) {
      this.logger.warn('No successful Monitor agents - returning empty data');
      return {
        monitorData: {},
        metadata: {
          totalAgents: results.length,
          successfulAgents: 0,
          failedAgents: results.length,
          aggregationStrategy: 'none',
          timestamp: new Date(),
          errors: results.filter(r => !r.success).map(r => ({
            agentId: r.agentId,
            error: r.error
          }))
        }
      };
    }

    // Base metadata
    const metadata = {
      totalAgents: results.length,
      successfulAgents: successfulResults.length,
      failedAgents: results.length - successfulResults.length,
      aggregationStrategy: strategy,
      timestamp: new Date(),
      sources: successfulResults.map(r => ({
        agentId: r.agentId,
        agentType: r.agentType,
        duration: r.endTime.getTime() - r.startTime.getTime()
      }))
    };

    // Apply aggregation strategy
    let aggregatedData: any;

    switch (strategy) {
      case 'first':
        // Use data from first successful agent
        aggregatedData = {
          ...successfulResults[0].outputData,
          monitorData: {
            [successfulResults[0].agentId]: successfulResults[0].outputData
          },
          metadata
        };
        break;

      case 'last':
        // Use data from last successful agent
        const lastResult = successfulResults[successfulResults.length - 1];
        aggregatedData = {
          ...lastResult.outputData,
          monitorData: {
            [lastResult.agentId]: lastResult.outputData
          },
          metadata
        };
        break;

      case 'average':
        // Average numeric values across agents
        aggregatedData = {
          monitorData: {},
          metadata
        };

        // Collect all numeric fields
        const numericFields = new Map<string, number[]>();
        for (const result of successfulResults) {
          aggregatedData.monitorData[result.agentId] = result.outputData;

          if (typeof result.outputData === 'object') {
            for (const [key, value] of Object.entries(result.outputData)) {
              if (typeof value === 'number') {
                if (!numericFields.has(key)) {
                  numericFields.set(key, []);
                }
                numericFields.get(key)!.push(value);
              }
            }
          }
        }

        // Calculate averages
        for (const [key, values] of numericFields.entries()) {
          const sum = values.reduce((a, b) => a + b, 0);
          aggregatedData[key] = sum / values.length;
          aggregatedData[`${key}_min`] = Math.min(...values);
          aggregatedData[`${key}_max`] = Math.max(...values);
          aggregatedData[`${key}_count`] = values.length;
        }
        break;

      case 'weighted':
        // Weight by execution speed (faster agents have more weight)
        aggregatedData = {
          monitorData: {},
          metadata
        };

        // Calculate weights based on execution time (faster = higher weight)
        const durations = successfulResults.map(r =>
          r.endTime.getTime() - r.startTime.getTime()
        );
        const maxDuration = Math.max(...durations);
        const weights = durations.map(d => (maxDuration - d + 1) / maxDuration);
        const totalWeight = weights.reduce((a, b) => a + b, 0);

        // Collect weighted numeric fields
        const weightedFields = new Map<string, Array<{ value: number; weight: number }>>();

        for (let i = 0; i < successfulResults.length; i++) {
          const result = successfulResults[i];
          const weight = weights[i] / totalWeight;

          aggregatedData.monitorData[result.agentId] = {
            ...result.outputData,
            weight
          };

          if (typeof result.outputData === 'object') {
            for (const [key, value] of Object.entries(result.outputData)) {
              if (typeof value === 'number') {
                if (!weightedFields.has(key)) {
                  weightedFields.set(key, []);
                }
                weightedFields.get(key)!.push({ value, weight });
              }
            }
          }
        }

        // Calculate weighted averages
        for (const [key, values] of weightedFields.entries()) {
          const weightedSum = values.reduce((sum, item) => sum + (item.value * item.weight), 0);
          aggregatedData[key] = weightedSum;
        }
        break;

      case 'merge':
      default:
        // Merge all data (default strategy)
        aggregatedData = {
          monitorData: {},
          metadata
        };

        // Merge data from all successful agents
        for (const result of successfulResults) {
          if (result.outputData) {
            // Store each agent's data under its agent ID
            aggregatedData.monitorData[result.agentId] = result.outputData;

            // Also merge top-level data for convenience
            if (typeof result.outputData === 'object' && !Array.isArray(result.outputData)) {
              // Merge non-conflicting keys
              for (const [key, value] of Object.entries(result.outputData)) {
                if (!(key in aggregatedData) || key === 'metadata') {
                  aggregatedData[key] = value;
                } else if (typeof value === 'number' && typeof aggregatedData[key] === 'number') {
                  // For numeric conflicts, create an array
                  if (!Array.isArray(aggregatedData[key])) {
                    aggregatedData[key] = [aggregatedData[key]];
                  }
                  aggregatedData[key].push(value);
                }
              }
            }
          }
        }
        break;
    }

    this.logger.info(
      `Aggregated data from ${successfulResults.length} Monitor agents using '${strategy}' strategy ` +
      `(${results.length - successfulResults.length} failed)`
    );

    return aggregatedData;
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
