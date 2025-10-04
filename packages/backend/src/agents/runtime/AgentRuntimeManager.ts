import { EventEmitter } from 'events';
import { AgentSandbox, ResourceUsage } from './AgentSandbox';
import { IAgent } from '../base/IAgent';
import { ResourceAllocation, ExecutionMetrics, AgentStatus } from '@multi-agent-platform/shared';
import { Logger } from '../../utils/logger';
import { getErrorMessage } from '../../utils/error-handler';
import { MetricsCollector } from './MetricsCollector';
import { LifecycleManager } from './LifecycleManager';

/**
 * Agent Runtime Manager
 * Manages agent sandboxes, lifecycle, and resource allocation
 */
export class AgentRuntimeManager extends EventEmitter {
  private logger: Logger;
  private sandboxes: Map<string, AgentSandbox> = new Map();
  private agents: Map<string, IAgent> = new Map();
  private metricsCollector: MetricsCollector;
  private lifecycleManager: LifecycleManager;
  private healthCheckInterval?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor() {
    super();
    this.logger = new Logger('AgentRuntimeManager');
    this.metricsCollector = new MetricsCollector();
    this.lifecycleManager = new LifecycleManager();
    this.setupEventHandlers();
    this.startHealthChecks();
  }

  /**
   * Register an agent with the runtime manager
   */
  async registerAgent(agent: IAgent): Promise<void> {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent ${agent.id} is already registered`);
    }

    this.logger.info(`Registering agent: ${agent.id}`);

    try {
      // Register with lifecycle manager
      await this.lifecycleManager.registerAgent(agent);

      // Store agent reference
      this.agents.set(agent.id, agent);

      // Set up agent event listeners
      this.setupAgentEventListeners(agent);

      this.emit('agentRegistered', { agentId: agent.id, agent });
      this.logger.info(`Agent registered successfully: ${agent.id}`);

    } catch (error) {
      this.logger.error(`Failed to register agent ${agent.id}:`, error);
      throw error;
    }
  }

  /**
   * Unregister an agent from the runtime manager
   */
  async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    this.logger.info(`Unregistering agent: ${agentId}`);

    try {
      // Stop sandbox if running
      await this.stopAgentSandbox(agentId);

      // Unregister from lifecycle manager
      await this.lifecycleManager.unregisterAgent(agentId);

      // Remove agent reference
      this.agents.delete(agentId);

      // Clean up event listeners
      agent.removeAllListeners();

      this.emit('agentUnregistered', { agentId, agent });
      this.logger.info(`Agent unregistered successfully: ${agentId}`);

    } catch (error) {
      this.logger.error(`Failed to unregister agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Start an agent in sandbox environment
   */
  async startAgent(agentId: string, resourceAllocation?: ResourceAllocation): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    if (this.sandboxes.has(agentId)) {
      throw new Error(`Agent ${agentId} is already running`);
    }

    this.logger.info(`Starting agent: ${agentId}`);

    try {
      // Use provided resource allocation or agent's default
      const resources = resourceAllocation || this.getDefaultResourceAllocation(agent);

      // Generate agent code for sandbox
      const agentCode = await this.generateAgentCode(agent);

      // Create and start sandbox
      const sandbox = new AgentSandbox(agentId, agentCode, resources);
      this.setupSandboxEventListeners(sandbox);

      await sandbox.start();
      this.sandboxes.set(agentId, sandbox);

      // Update agent status
      await this.lifecycleManager.updateAgentStatus(agentId, AgentStatus.RUNNING);

      // Start metrics collection
      this.metricsCollector.startCollecting(agentId, sandbox);

      this.emit('agentStarted', { agentId, resources });
      this.logger.info(`Agent started successfully: ${agentId}`);

    } catch (error) {
      this.logger.error(`Failed to start agent ${agentId}:`, error);
      await this.lifecycleManager.updateAgentStatus(agentId, AgentStatus.ERROR);
      throw error;
    }
  }

  /**
   * Stop an agent sandbox
   */
  async stopAgent(agentId: string): Promise<void> {
    await this.stopAgentSandbox(agentId);
  }

  /**
   * Execute an agent with input data
   */
  async executeAgent(agentId: string, input: any): Promise<any> {
    const sandbox = this.sandboxes.get(agentId);
    if (!sandbox) {
      throw new Error(`Agent ${agentId} is not running`);
    }

    this.logger.info(`Executing agent: ${agentId}`);

    try {
      // Update agent status
      await this.lifecycleManager.updateAgentStatus(agentId, AgentStatus.RUNNING);

      // Execute in sandbox
      const result = await sandbox.execute(input);

      // Update agent status
      await this.lifecycleManager.updateAgentStatus(agentId, AgentStatus.ACTIVE);

      this.emit('agentExecuted', { agentId, input, result });
      return result;

    } catch (error) {
      this.logger.error(`Agent execution failed: ${agentId}`, error);
      await this.lifecycleManager.updateAgentStatus(agentId, AgentStatus.ERROR);
      throw error;
    }
  }

  /**
   * Get agent execution metrics
   */
  getAgentMetrics(agentId: string): ExecutionMetrics | null {
    const sandbox = this.sandboxes.get(agentId);
    return sandbox ? sandbox.getMetrics() : null;
  }

  /**
   * Get agent resource usage
   */
  getAgentResourceUsage(agentId: string): ResourceUsage | null {
    const sandbox = this.sandboxes.get(agentId);
    return sandbox ? sandbox.getResourceUsage() : null;
  }

  /**
   * Get all running agents
   */
  getRunningAgents(): string[] {
    return Array.from(this.sandboxes.keys());
  }

  /**
   * Get runtime statistics
   */
  getRuntimeStats(): RuntimeStats {
    const totalAgents = this.agents.size;
    const runningAgents = this.sandboxes.size;
    const healthyAgents = Array.from(this.sandboxes.values())
      .filter(sandbox => sandbox.isHealthy()).length;

    const totalMemoryUsed = Array.from(this.sandboxes.values())
      .reduce((sum, sandbox) => sum + sandbox.getResourceUsage().memoryUsed, 0);

    const averageCpuUsage = Array.from(this.sandboxes.values())
      .reduce((sum, sandbox) => sum + sandbox.getResourceUsage().cpuUsagePercent, 0) / 
      Math.max(1, runningAgents);

    return {
      totalAgents,
      runningAgents,
      healthyAgents,
      unhealthyAgents: runningAgents - healthyAgents,
      totalMemoryUsed,
      averageCpuUsage,
      uptime: process.uptime() * 1000 // Convert to milliseconds
    };
  }

  /**
   * Perform health check on all running agents
   */
  async performHealthCheck(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const [agentId, sandbox] of this.sandboxes) {
      const agent = this.agents.get(agentId);
      if (!agent) continue;

      try {
        const isHealthy = sandbox.isHealthy();
        const resourceUsage = sandbox.getResourceUsage();
        const metrics = sandbox.getMetrics();

        results.push({
          agentId,
          agentName: agent.name,
          healthy: isHealthy,
          resourceUsage,
          metrics,
          lastCheck: new Date()
        });

      } catch (error) {
        results.push({
          agentId,
          agentName: agent.name,
          healthy: false,
          error: getErrorMessage(error),
          lastCheck: new Date()
        });
      }
    }

    this.emit('healthCheckCompleted', { results });
    return results;
  }

  /**
   * Shutdown the runtime manager
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.logger.info('Shutting down runtime manager');

    try {
      // Stop health checks
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Stop all running agents
      const shutdownPromises = Array.from(this.sandboxes.keys())
        .map(agentId => this.stopAgentSandbox(agentId));

      await Promise.allSettled(shutdownPromises);

      // Shutdown components
      await this.metricsCollector.shutdown();
      await this.lifecycleManager.shutdown();

      this.emit('shutdown');
      this.logger.info('Runtime manager shutdown completed');

    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      throw error;
    }
  }

  // Private methods

  private async stopAgentSandbox(agentId: string): Promise<void> {
    const sandbox = this.sandboxes.get(agentId);
    if (!sandbox) {
      return;
    }

    this.logger.info(`Stopping agent sandbox: ${agentId}`);

    try {
      // Stop metrics collection
      this.metricsCollector.stopCollecting(agentId);

      // Stop sandbox
      await sandbox.stop();
      this.sandboxes.delete(agentId);

      // Update agent status
      await this.lifecycleManager.updateAgentStatus(agentId, AgentStatus.INACTIVE);

      this.emit('agentStopped', { agentId });
      this.logger.info(`Agent sandbox stopped: ${agentId}`);

    } catch (error) {
      this.logger.error(`Error stopping agent sandbox ${agentId}:`, error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    // Handle process signals
    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM, shutting down gracefully');
      this.shutdown().catch(console.error);
    });

    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT, shutting down gracefully');
      this.shutdown().catch(console.error);
    });
  }

  private setupAgentEventListeners(agent: IAgent): void {
    agent.on('error', (data) => {
      this.logger.error(`Agent error: ${agent.id}`, data.error);
      this.emit('agentError', { agentId: agent.id, error: data.error });
    });

    agent.on('configUpdated', (data) => {
      this.logger.info(`Agent config updated: ${agent.id}`);
      this.emit('agentConfigUpdated', { agentId: agent.id, config: data.config });
    });
  }

  private setupSandboxEventListeners(sandbox: AgentSandbox): void {
    sandbox.on('error', (data) => {
      this.logger.error(`Sandbox error: ${data.agentId}`, data.error);
      this.emit('sandboxError', data);
    });

    sandbox.on('resourceLimitExceeded', (data) => {
      this.logger.warn(`Resource limit exceeded: ${data.agentId}`, data);
      this.emit('resourceLimitExceeded', data);
    });

    sandbox.on('metricsUpdate', (data) => {
      this.metricsCollector.recordMetrics(data.agentId, data.metrics);
    });
  }

  private getDefaultResourceAllocation(agent: IAgent): ResourceAllocation {
    // Get from agent config or use defaults based on category
    const defaults = {
      memory: 256,
      cpu: 0.5,
      timeout: 300,
      storage: 100
    };

    // Category-specific defaults
    switch (agent.category) {
      case 'work':
        return { ...defaults, memory: 256, timeout: 300 };
      case 'process':
        return { ...defaults, memory: 512, cpu: 1, timeout: 600 };
      case 'publish':
        return { ...defaults, memory: 256, timeout: 180 };
      case 'validate':
        return { ...defaults, memory: 384, timeout: 240 };
      default:
        return defaults;
    }
  }

  private async generateAgentCode(agent: IAgent): Promise<string> {
    // This would generate the actual agent code for sandbox execution
    // For now, return a placeholder that creates the agent instance
    return `
// Agent code for ${agent.id}
const agent = {
  id: '${agent.id}',
  name: '${agent.name}',
  category: '${agent.category}',
  
  async execute(input) {
    // This would be the actual agent implementation
    // For now, return a mock result
    return {
      status: 'success',
      data: { message: 'Agent executed successfully', input },
      timestamp: new Date().toISOString()
    };
  }
};

// Make agent available to sandbox
agentInstance = agent;
`;
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error('Health check failed:', error);
      }
    }, 30000); // Every 30 seconds
  }
}

// Type definitions
export interface RuntimeStats {
  totalAgents: number;
  runningAgents: number;
  healthyAgents: number;
  unhealthyAgents: number;
  totalMemoryUsed: number;
  averageCpuUsage: number;
  uptime: number;
}

export interface HealthCheckResult {
  agentId: string;
  agentName: string;
  healthy: boolean;
  resourceUsage?: ResourceUsage;
  metrics?: ExecutionMetrics;
  error?: string;
  lastCheck: Date;
}