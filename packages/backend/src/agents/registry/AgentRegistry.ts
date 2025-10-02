import { AgentCategory } from '@multi-agent-platform/shared';
import { IAgent, IAgentRegistry } from '../base/IAgent';
import { Logger } from '../../utils/logger';
import { EventEmitter } from 'events';

/**
 * Registry for managing agent instances
 * Implements the Registry pattern for agent lifecycle management
 */
export class AgentRegistry extends EventEmitter implements IAgentRegistry {
  private agents: Map<string, IAgent> = new Map();
  private agentsByCategory: Map<AgentCategory, Set<string>> = new Map();
  private logger: Logger;

  constructor() {
    super();
    this.logger = new Logger('AgentRegistry');
    this.initializeCategoryMaps();
  }

  /**
   * Register an agent instance
   */
  async register(agent: IAgent): Promise<void> {
    this.logger.info(`Registering agent: ${agent.name} (${agent.id})`);

    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with ID ${agent.id} is already registered`);
    }

    try {
      // Add to main registry
      this.agents.set(agent.id, agent);

      // Add to category index
      const categorySet = this.agentsByCategory.get(agent.category);
      if (categorySet) {
        categorySet.add(agent.id);
      }

      // Set up event listeners for the agent
      this.setupAgentEventListeners(agent);

      this.emit('agentRegistered', { agentId: agent.id, agent });
      this.logger.info(`Successfully registered agent: ${agent.name}`);
    } catch (error) {
      this.logger.error(`Failed to register agent ${agent.name}:`, error);
      throw error;
    }
  }

  /**
   * Unregister an agent instance
   */
  async unregister(agentId: string): Promise<void> {
    this.logger.info(`Unregistering agent: ${agentId}`);

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} is not registered`);
    }

    try {
      // Clean up the agent
      await agent.cleanup();

      // Remove from main registry
      this.agents.delete(agentId);

      // Remove from category index
      const categorySet = this.agentsByCategory.get(agent.category);
      if (categorySet) {
        categorySet.delete(agentId);
      }

      // Remove event listeners
      agent.removeAllListeners();

      this.emit('agentUnregistered', { agentId, agent });
      this.logger.info(`Successfully unregistered agent: ${agentId}`);
    } catch (error) {
      this.logger.error(`Failed to unregister agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get an agent by ID
   */
  get(agentId: string): IAgent | null {
    return this.agents.get(agentId) || null;
  }

  /**
   * List all agents or agents by category
   */
  list(category?: AgentCategory): IAgent[] {
    if (category) {
      const categorySet = this.agentsByCategory.get(category);
      if (!categorySet) {
        return [];
      }

      return Array.from(categorySet)
        .map(agentId => this.agents.get(agentId))
        .filter((agent): agent is IAgent => agent !== undefined);
    }

    return Array.from(this.agents.values());
  }

  /**
   * Find agents matching a predicate
   */
  find(predicate: (agent: IAgent) => boolean): IAgent[] {
    return Array.from(this.agents.values()).filter(predicate);
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const stats: RegistryStats = {
      totalAgents: this.agents.size,
      agentsByCategory: {},
      agentsByStatus: {},
      healthyAgents: 0,
      unhealthyAgents: 0
    };

    // Count by category
    for (const [category, agentSet] of this.agentsByCategory) {
      stats.agentsByCategory[category] = agentSet.size;
    }

    // Count by status and health
    for (const agent of this.agents.values()) {
      const status = agent.getStatus();
      stats.agentsByStatus[status] = (stats.agentsByStatus[status] || 0) + 1;

      // Check health (this would be async in real implementation)
      // For now, assume agents with ERROR status are unhealthy
      if (status === 'error') {
        stats.unhealthyAgents++;
      } else {
        stats.healthyAgents++;
      }
    }

    return stats;
  }

  /**
   * Perform health check on all agents
   */
  async performHealthCheck(): Promise<HealthCheckResult[]> {
    this.logger.info('Performing health check on all registered agents');

    const results: HealthCheckResult[] = [];

    for (const agent of this.agents.values()) {
      try {
        const isHealthy = await agent.healthCheck();
        results.push({
          agentId: agent.id,
          agentName: agent.name,
          healthy: isHealthy,
          lastError: agent.getLastError()?.message
        });
      } catch (error) {
        results.push({
          agentId: agent.id,
          agentName: agent.name,
          healthy: false,
          lastError: error.message
        });
      }
    }

    this.emit('healthCheckCompleted', { results });
    return results;
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status: string): IAgent[] {
    return this.find(agent => agent.getStatus() === status);
  }

  /**
   * Get active agents
   */
  getActiveAgents(): IAgent[] {
    return this.getAgentsByStatus('active');
  }

  /**
   * Get running agents
   */
  getRunningAgents(): IAgent[] {
    return this.getAgentsByStatus('running');
  }

  /**
   * Get agents with errors
   */
  getErrorAgents(): IAgent[] {
    return this.getAgentsByStatus('error');
  }

  /**
   * Shutdown all agents
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down all registered agents');

    const shutdownPromises = Array.from(this.agents.values()).map(async (agent) => {
      try {
        await agent.cleanup();
        this.logger.debug(`Agent ${agent.name} shut down successfully`);
      } catch (error) {
        this.logger.error(`Failed to shutdown agent ${agent.name}:`, error);
      }
    });

    await Promise.allSettled(shutdownPromises);

    // Clear all registries
    this.agents.clear();
    for (const categorySet of this.agentsByCategory.values()) {
      categorySet.clear();
    }

    this.emit('registryShutdown');
    this.logger.info('Agent registry shutdown completed');
  }

  /**
   * Update agent configuration
   */
  async updateAgentConfig(agentId: string, config: any): Promise<void> {
    const agent = this.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    await agent.updateConfig(config);
    this.emit('agentConfigUpdated', { agentId, config });
  }

  /**
   * Restart an agent
   */
  async restartAgent(agentId: string): Promise<void> {
    const agent = this.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    this.logger.info(`Restarting agent: ${agent.name}`);

    try {
      await agent.cleanup();
      // Re-initialize would require the original config
      // This is a simplified restart
      this.emit('agentRestarted', { agentId });
    } catch (error) {
      this.logger.error(`Failed to restart agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Initialize category maps
   */
  private initializeCategoryMaps(): void {
    for (const category of Object.values(AgentCategory)) {
      this.agentsByCategory.set(category, new Set());
    }
  }

  /**
   * Set up event listeners for an agent
   */
  private setupAgentEventListeners(agent: IAgent): void {
    // Forward agent events with registry context
    agent.on('initialized', (data) => {
      this.emit('agentInitialized', { ...data, registry: this });
    });

    agent.on('executionStarted', (data) => {
      this.emit('agentExecutionStarted', { ...data, registry: this });
    });

    agent.on('executionCompleted', (data) => {
      this.emit('agentExecutionCompleted', { ...data, registry: this });
    });

    agent.on('executionFailed', (data) => {
      this.emit('agentExecutionFailed', { ...data, registry: this });
    });

    agent.on('error', (data) => {
      this.emit('agentError', { ...data, registry: this });
      this.logger.error(`Agent ${agent.name} error:`, data.error);
    });

    agent.on('configUpdated', (data) => {
      this.emit('agentConfigUpdated', { ...data, registry: this });
    });
  }
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  totalAgents: number;
  agentsByCategory: Record<string, number>;
  agentsByStatus: Record<string, number>;
  healthyAgents: number;
  unhealthyAgents: number;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  agentId: string;
  agentName: string;
  healthy: boolean;
  lastError?: string;
}