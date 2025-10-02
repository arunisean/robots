import { EventEmitter } from 'events';
import { IAgent } from '../base/IAgent';
import { AgentStatus } from '@multi-agent-platform/shared';
import { Logger } from '../../utils/logger';

/**
 * Lifecycle Manager
 * Manages agent lifecycle states and transitions
 */
export class LifecycleManager extends EventEmitter {
  private logger: Logger;
  private agentStates: Map<string, AgentLifecycleState> = new Map();
  private stateTransitions: Map<string, StateTransition[]> = new Map();
  private lifecycleHooks: Map<string, LifecycleHook[]> = new Map();

  constructor() {
    super();
    this.logger = new Logger('LifecycleManager');
    this.setupValidTransitions();
  }

  /**
   * Register an agent with lifecycle management
   */
  async registerAgent(agent: IAgent): Promise<void> {
    if (this.agentStates.has(agent.id)) {
      throw new Error(`Agent ${agent.id} is already registered`);
    }

    this.logger.info(`Registering agent lifecycle: ${agent.id}`);

    const lifecycleState: AgentLifecycleState = {
      agentId: agent.id,
      agentName: agent.name,
      currentStatus: AgentStatus.INACTIVE,
      previousStatus: null,
      statusHistory: [
        {
          status: AgentStatus.INACTIVE,
          timestamp: new Date(),
          reason: 'Agent registered'
        }
      ],
      registeredAt: new Date(),
      lastStatusChange: new Date(),
      totalStatusChanges: 1,
      uptime: 0,
      errorCount: 0,
      restartCount: 0
    };

    this.agentStates.set(agent.id, lifecycleState);
    this.stateTransitions.set(agent.id, []);

    // Execute registration hooks
    await this.executeHooks(agent.id, 'registered', { agent });

    this.emit('agentRegistered', { agentId: agent.id, state: lifecycleState });
    this.logger.info(`Agent lifecycle registered: ${agent.id}`);
  }

  /**
   * Unregister an agent from lifecycle management
   */
  async unregisterAgent(agentId: string): Promise<void> {
    const state = this.agentStates.get(agentId);
    if (!state) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    this.logger.info(`Unregistering agent lifecycle: ${agentId}`);

    // Execute unregistration hooks
    await this.executeHooks(agentId, 'unregistered', { state });

    // Clean up
    this.agentStates.delete(agentId);
    this.stateTransitions.delete(agentId);
    this.lifecycleHooks.delete(agentId);

    this.emit('agentUnregistered', { agentId, finalState: state });
    this.logger.info(`Agent lifecycle unregistered: ${agentId}`);
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(
    agentId: string, 
    newStatus: AgentStatus, 
    reason?: string,
    metadata?: any
  ): Promise<void> {
    const state = this.agentStates.get(agentId);
    if (!state) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    const oldStatus = state.currentStatus;
    
    // Validate transition
    if (!this.isValidTransition(oldStatus, newStatus)) {
      throw new Error(
        `Invalid status transition for agent ${agentId}: ${oldStatus} -> ${newStatus}`
      );
    }

    this.logger.info(`Updating agent status: ${agentId} ${oldStatus} -> ${newStatus}`);

    // Update state
    state.previousStatus = oldStatus;
    state.currentStatus = newStatus;
    state.lastStatusChange = new Date();
    state.totalStatusChanges++;

    // Add to history
    const historyEntry: StatusHistoryEntry = {
      status: newStatus,
      timestamp: new Date(),
      reason: reason || 'Status updated',
      metadata
    };
    state.statusHistory.push(historyEntry);

    // Keep history limited
    if (state.statusHistory.length > 100) {
      state.statusHistory = state.statusHistory.slice(-100);
    }

    // Record transition
    const transition: StateTransition = {
      fromStatus: oldStatus,
      toStatus: newStatus,
      timestamp: new Date(),
      reason: reason || 'Status updated',
      metadata
    };
    this.stateTransitions.get(agentId)!.push(transition);

    // Update counters
    if (newStatus === AgentStatus.ERROR) {
      state.errorCount++;
    }

    if (oldStatus === AgentStatus.INACTIVE && newStatus === AgentStatus.ACTIVE) {
      state.restartCount++;
    }

    // Calculate uptime
    this.updateUptime(state);

    // Execute lifecycle hooks
    await this.executeHooks(agentId, 'statusChanged', {
      oldStatus,
      newStatus,
      reason,
      metadata,
      state
    });

    this.emit('statusChanged', {
      agentId,
      oldStatus,
      newStatus,
      reason,
      state
    });

    this.logger.info(`Agent status updated: ${agentId} -> ${newStatus}`);
  }

  /**
   * Get agent lifecycle state
   */
  getAgentState(agentId: string): AgentLifecycleState | null {
    return this.agentStates.get(agentId) || null;
  }

  /**
   * Get all agent states
   */
  getAllAgentStates(): Map<string, AgentLifecycleState> {
    return new Map(this.agentStates);
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status: AgentStatus): AgentLifecycleState[] {
    return Array.from(this.agentStates.values())
      .filter(state => state.currentStatus === status);
  }

  /**
   * Get agent status history
   */
  getStatusHistory(agentId: string): StatusHistoryEntry[] {
    const state = this.agentStates.get(agentId);
    return state ? [...state.statusHistory] : [];
  }

  /**
   * Get agent state transitions
   */
  getStateTransitions(agentId: string): StateTransition[] {
    return this.stateTransitions.get(agentId) || [];
  }

  /**
   * Register lifecycle hook
   */
  registerHook(agentId: string, event: LifecycleEvent, hook: LifecycleHook): void {
    if (!this.lifecycleHooks.has(agentId)) {
      this.lifecycleHooks.set(agentId, []);
    }

    const hooks = this.lifecycleHooks.get(agentId)!;
    hooks.push({ ...hook, event });

    this.logger.info(`Registered lifecycle hook: ${agentId} -> ${event}`);
  }

  /**
   * Unregister lifecycle hook
   */
  unregisterHook(agentId: string, hookId: string): void {
    const hooks = this.lifecycleHooks.get(agentId);
    if (hooks) {
      const index = hooks.findIndex(h => h.id === hookId);
      if (index >= 0) {
        hooks.splice(index, 1);
        this.logger.info(`Unregistered lifecycle hook: ${agentId} -> ${hookId}`);
      }
    }
  }

  /**
   * Get lifecycle statistics
   */
  getLifecycleStats(): LifecycleStats {
    const states = Array.from(this.agentStates.values());
    
    const statusCounts = states.reduce((counts, state) => {
      counts[state.currentStatus] = (counts[state.currentStatus] || 0) + 1;
      return counts;
    }, {} as Record<AgentStatus, number>);

    const totalUptime = states.reduce((sum, state) => sum + state.uptime, 0);
    const totalErrors = states.reduce((sum, state) => sum + state.errorCount, 0);
    const totalRestarts = states.reduce((sum, state) => sum + state.restartCount, 0);

    return {
      totalAgents: states.length,
      statusCounts,
      averageUptime: states.length > 0 ? totalUptime / states.length : 0,
      totalErrors,
      totalRestarts,
      averageStatusChanges: states.length > 0 ? 
        states.reduce((sum, state) => sum + state.totalStatusChanges, 0) / states.length : 0
    };
  }

  /**
   * Generate lifecycle report
   */
  generateLifecycleReport(agentId?: string): LifecycleReport {
    if (agentId) {
      return this.generateAgentLifecycleReport(agentId);
    }
    
    return this.generateSystemLifecycleReport();
  }

  /**
   * Shutdown lifecycle manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down lifecycle manager');

    // Execute shutdown hooks for all agents
    const shutdownPromises = Array.from(this.agentStates.keys())
      .map(agentId => this.executeHooks(agentId, 'shutdown', {}));

    await Promise.allSettled(shutdownPromises);

    this.emit('shutdown');
    this.logger.info('Lifecycle manager shutdown completed');
  }

  // Private methods

  private setupValidTransitions(): void {
    // Define valid status transitions
    this.validTransitions = new Map([
      [AgentStatus.INACTIVE, [AgentStatus.ACTIVE, AgentStatus.ERROR]],
      [AgentStatus.ACTIVE, [AgentStatus.RUNNING, AgentStatus.PAUSED, AgentStatus.INACTIVE, AgentStatus.ERROR]],
      [AgentStatus.RUNNING, [AgentStatus.ACTIVE, AgentStatus.PAUSED, AgentStatus.ERROR]],
      [AgentStatus.PAUSED, [AgentStatus.ACTIVE, AgentStatus.RUNNING, AgentStatus.INACTIVE, AgentStatus.ERROR]],
      [AgentStatus.ERROR, [AgentStatus.INACTIVE, AgentStatus.ACTIVE]]
    ]);
  }

  private validTransitions!: Map<AgentStatus, AgentStatus[]>;

  private isValidTransition(from: AgentStatus, to: AgentStatus): boolean {
    const validNextStates = this.validTransitions.get(from);
    return validNextStates ? validNextStates.includes(to) : false;
  }

  private updateUptime(state: AgentLifecycleState): void {
    const now = Date.now();
    const registeredTime = state.registeredAt.getTime();
    
    // Calculate total uptime (time since registration)
    state.uptime = now - registeredTime;
  }

  private async executeHooks(
    agentId: string, 
    event: LifecycleEvent, 
    context: any
  ): Promise<void> {
    const hooks = this.lifecycleHooks.get(agentId) || [];
    const eventHooks = hooks.filter(h => h.event === event);

    if (eventHooks.length === 0) {
      return;
    }

    this.logger.debug(`Executing ${eventHooks.length} hooks for ${agentId}:${event}`);

    const hookPromises = eventHooks.map(async (hook) => {
      try {
        await hook.handler(context);
        this.logger.debug(`Hook executed successfully: ${hook.id}`);
      } catch (error) {
        this.logger.error(`Hook execution failed: ${hook.id}`, error);
        // Don't throw - hooks shouldn't block lifecycle operations
      }
    });

    await Promise.allSettled(hookPromises);
  }

  private generateAgentLifecycleReport(agentId: string): LifecycleReport {
    const state = this.agentStates.get(agentId);
    if (!state) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const transitions = this.stateTransitions.get(agentId) || [];
    const recentHistory = state.statusHistory.slice(-20);

    return {
      type: 'agent',
      agentId,
      generatedAt: new Date(),
      currentStatus: state.currentStatus,
      uptime: state.uptime,
      totalStatusChanges: state.totalStatusChanges,
      errorCount: state.errorCount,
      restartCount: state.restartCount,
      recentHistory,
      transitions: transitions.slice(-10),
      recommendations: this.generateAgentRecommendations(state, transitions)
    };
  }

  private generateSystemLifecycleReport(): LifecycleReport {
    const stats = this.getLifecycleStats();
    const states = Array.from(this.agentStates.values());

    return {
      type: 'system',
      generatedAt: new Date(),
      totalAgents: stats.totalAgents,
      statusCounts: stats.statusCounts,
      averageUptime: stats.averageUptime,
      totalErrors: stats.totalErrors,
      totalRestarts: stats.totalRestarts,
      agentSummaries: states.map(state => ({
        agentId: state.agentId,
        agentName: state.agentName,
        currentStatus: state.currentStatus,
        uptime: state.uptime,
        errorCount: state.errorCount
      })),
      recommendations: this.generateSystemRecommendations(states)
    };
  }

  private generateAgentRecommendations(
    state: AgentLifecycleState, 
    transitions: StateTransition[]
  ): string[] {
    const recommendations: string[] = [];

    if (state.errorCount > 5) {
      recommendations.push('High error count - investigate error patterns and improve error handling');
    }

    if (state.restartCount > 3) {
      recommendations.push('Frequent restarts detected - check for stability issues');
    }

    const recentErrors = transitions
      .filter(t => t.toStatus === AgentStatus.ERROR)
      .filter(t => Date.now() - t.timestamp.getTime() < 3600000); // Last hour

    if (recentErrors.length > 2) {
      recommendations.push('Multiple recent errors - immediate attention required');
    }

    if (state.currentStatus === AgentStatus.ERROR) {
      recommendations.push('Agent is currently in error state - restart or investigate required');
    }

    return recommendations;
  }

  private generateSystemRecommendations(states: AgentLifecycleState[]): string[] {
    const recommendations: string[] = [];

    const errorAgents = states.filter(s => s.currentStatus === AgentStatus.ERROR);
    if (errorAgents.length > 0) {
      recommendations.push(`${errorAgents.length} agents are in error state`);
    }

    const highErrorAgents = states.filter(s => s.errorCount > 5);
    if (highErrorAgents.length > 0) {
      recommendations.push(`${highErrorAgents.length} agents have high error counts`);
    }

    const frequentRestartAgents = states.filter(s => s.restartCount > 3);
    if (frequentRestartAgents.length > 0) {
      recommendations.push(`${frequentRestartAgents.length} agents have frequent restarts`);
    }

    return recommendations;
  }
}

// Type definitions
export interface AgentLifecycleState {
  agentId: string;
  agentName: string;
  currentStatus: AgentStatus;
  previousStatus: AgentStatus | null;
  statusHistory: StatusHistoryEntry[];
  registeredAt: Date;
  lastStatusChange: Date;
  totalStatusChanges: number;
  uptime: number;
  errorCount: number;
  restartCount: number;
}

export interface StatusHistoryEntry {
  status: AgentStatus;
  timestamp: Date;
  reason: string;
  metadata?: any;
}

export interface StateTransition {
  fromStatus: AgentStatus;
  toStatus: AgentStatus;
  timestamp: Date;
  reason: string;
  metadata?: any;
}

export interface LifecycleHook {
  id: string;
  event: LifecycleEvent;
  handler: (context: any) => Promise<void>;
  description?: string;
}

export type LifecycleEvent = 'registered' | 'unregistered' | 'statusChanged' | 'shutdown';

export interface LifecycleStats {
  totalAgents: number;
  statusCounts: Record<AgentStatus, number>;
  averageUptime: number;
  totalErrors: number;
  totalRestarts: number;
  averageStatusChanges: number;
}

export interface LifecycleReport {
  type: 'agent' | 'system';
  agentId?: string;
  generatedAt: Date;
  currentStatus?: AgentStatus;
  uptime?: number;
  totalStatusChanges?: number;
  errorCount?: number;
  restartCount?: number;
  totalAgents?: number;
  statusCounts?: Record<AgentStatus, number>;
  averageUptime?: number;
  totalErrors?: number;
  totalRestarts?: number;
  recentHistory?: StatusHistoryEntry[];
  transitions?: StateTransition[];
  agentSummaries?: any[];
  recommendations: string[];
}