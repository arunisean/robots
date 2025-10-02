import { AgentRegistry } from '../../../agents/registry/AgentRegistry';
import { AgentCategory, AgentConfig, AgentStatus } from '@multi-agent-platform/shared';
import { IAgent } from '../../../agents/base/IAgent';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

// Mock agent implementation
class MockAgent implements IAgent {
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly category: AgentCategory;
  public readonly description: string;
  
  private status: AgentStatus = AgentStatus.INACTIVE;
  private lastError: Error | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(id: string, name: string, category: AgentCategory) {
    this.id = id;
    this.name = name;
    this.version = '1.0.0';
    this.category = category;
    this.description = 'Mock agent for testing';
  }

  async initialize(config: AgentConfig): Promise<void> {
    this.status = AgentStatus.ACTIVE;
  }

  async execute(input: any): Promise<any> {
    this.status = AgentStatus.RUNNING;
    // Simulate execution
    await new Promise(resolve => setTimeout(resolve, 10));
    this.status = AgentStatus.ACTIVE;
    return { result: 'success' };
  }

  async cleanup(): Promise<void> {
    this.status = AgentStatus.INACTIVE;
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getMetrics(): any {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      errorRate: 0
    };
  }

  validateConfig(config: AgentConfig): any {
    return { success: true };
  }

  async updateConfig(config: Partial<AgentConfig>): Promise<void> {
    // Mock implementation
  }

  async allocateResources(allocation: any): Promise<void> {
    // Mock implementation
  }

  async releaseResources(): Promise<void> {
    // Mock implementation
  }

  async healthCheck(): Promise<boolean> {
    return this.status !== AgentStatus.ERROR;
  }

  getLastError(): Error | null {
    return this.lastError;
  }

  setError(error: Error) {
    this.lastError = error;
    this.status = AgentStatus.ERROR;
  }

  // Event emitter methods
  on(event: string, listener: Function): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
      return true;
    }
    return false;
  }

  removeAllListeners(): this {
    this.eventListeners.clear();
    return this;
  }
}

describe('AgentRegistry', () => {
  let registry: AgentRegistry;
  let mockAgent1: MockAgent;
  let mockAgent2: MockAgent;
  let mockAgent3: MockAgent;

  beforeEach(() => {
    registry = new AgentRegistry();
    mockAgent1 = new MockAgent('agent-1', 'Test Agent 1', AgentCategory.WORK);
    mockAgent2 = new MockAgent('agent-2', 'Test Agent 2', AgentCategory.PROCESS);
    mockAgent3 = new MockAgent('agent-3', 'Test Agent 3', AgentCategory.WORK);
  });

  describe('register', () => {
    it('should register agent successfully', async () => {
      await registry.register(mockAgent1);
      
      const retrievedAgent = registry.get('agent-1');
      expect(retrievedAgent).toBe(mockAgent1);
    });

    it('should throw error when registering duplicate agent ID', async () => {
      await registry.register(mockAgent1);
      
      await expect(registry.register(mockAgent1))
        .rejects.toThrow('Agent with ID agent-1 is already registered');
    });

    it('should emit agentRegistered event', async () => {
      const eventSpy = jest.fn();
      registry.on('agentRegistered', eventSpy);

      await registry.register(mockAgent1);

      expect(eventSpy).toHaveBeenCalledWith({
        agentId: 'agent-1',
        agent: mockAgent1
      });
    });
  });

  describe('unregister', () => {
    beforeEach(async () => {
      await registry.register(mockAgent1);
    });

    it('should unregister agent successfully', async () => {
      await registry.unregister('agent-1');
      
      const retrievedAgent = registry.get('agent-1');
      expect(retrievedAgent).toBeNull();
    });

    it('should throw error when unregistering non-existent agent', async () => {
      await expect(registry.unregister('non-existent'))
        .rejects.toThrow('Agent with ID non-existent is not registered');
    });

    it('should cleanup agent during unregistration', async () => {
      const cleanupSpy = jest.spyOn(mockAgent1, 'cleanup');
      
      await registry.unregister('agent-1');
      
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should emit agentUnregistered event', async () => {
      const eventSpy = jest.fn();
      registry.on('agentUnregistered', eventSpy);

      await registry.unregister('agent-1');

      expect(eventSpy).toHaveBeenCalledWith({
        agentId: 'agent-1',
        agent: mockAgent1
      });
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await registry.register(mockAgent1);
    });

    it('should return registered agent', () => {
      const agent = registry.get('agent-1');
      expect(agent).toBe(mockAgent1);
    });

    it('should return null for non-existent agent', () => {
      const agent = registry.get('non-existent');
      expect(agent).toBeNull();
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await registry.register(mockAgent1);
      await registry.register(mockAgent2);
      await registry.register(mockAgent3);
    });

    it('should return all agents when no category specified', () => {
      const agents = registry.list();
      
      expect(agents).toHaveLength(3);
      expect(agents).toContain(mockAgent1);
      expect(agents).toContain(mockAgent2);
      expect(agents).toContain(mockAgent3);
    });

    it('should return agents by category', () => {
      const workAgents = registry.list(AgentCategory.WORK);
      const processAgents = registry.list(AgentCategory.PROCESS);
      
      expect(workAgents).toHaveLength(2);
      expect(workAgents).toContain(mockAgent1);
      expect(workAgents).toContain(mockAgent3);
      
      expect(processAgents).toHaveLength(1);
      expect(processAgents).toContain(mockAgent2);
    });

    it('should return empty array for category with no agents', () => {
      const publishAgents = registry.list(AgentCategory.PUBLISH);
      expect(publishAgents).toHaveLength(0);
    });
  });

  describe('find', () => {
    beforeEach(async () => {
      await registry.register(mockAgent1);
      await registry.register(mockAgent2);
      await registry.register(mockAgent3);
    });

    it('should find agents matching predicate', () => {
      const workAgents = registry.find(agent => agent.category === AgentCategory.WORK);
      
      expect(workAgents).toHaveLength(2);
      expect(workAgents).toContain(mockAgent1);
      expect(workAgents).toContain(mockAgent3);
    });

    it('should return empty array when no agents match', () => {
      const matchingAgents = registry.find(agent => agent.name === 'Non-existent');
      expect(matchingAgents).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await registry.register(mockAgent1);
      await registry.register(mockAgent2);
      await registry.register(mockAgent3);
      
      // Set one agent to error status
      mockAgent2.setError(new Error('Test error'));
    });

    it('should return correct registry statistics', () => {
      const stats = registry.getStats();
      
      expect(stats.totalAgents).toBe(3);
      expect(stats.agentsByCategory[AgentCategory.WORK]).toBe(2);
      expect(stats.agentsByCategory[AgentCategory.PROCESS]).toBe(1);
      expect(stats.healthyAgents).toBe(2);
      expect(stats.unhealthyAgents).toBe(1);
    });
  });

  describe('performHealthCheck', () => {
    beforeEach(async () => {
      await registry.register(mockAgent1);
      await registry.register(mockAgent2);
      
      // Set one agent to error status
      mockAgent2.setError(new Error('Test error'));
    });

    it('should perform health check on all agents', async () => {
      const results = await registry.performHealthCheck();
      
      expect(results).toHaveLength(2);
      
      const agent1Result = results.find(r => r.agentId === 'agent-1');
      const agent2Result = results.find(r => r.agentId === 'agent-2');
      
      expect(agent1Result?.healthy).toBe(true);
      expect(agent2Result?.healthy).toBe(false);
      expect(agent2Result?.lastError).toBe('Test error');
    });

    it('should emit healthCheckCompleted event', async () => {
      const eventSpy = jest.fn();
      registry.on('healthCheckCompleted', eventSpy);

      await registry.performHealthCheck();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('getAgentsByStatus', () => {
    beforeEach(async () => {
      await registry.register(mockAgent1);
      await registry.register(mockAgent2);
      await registry.register(mockAgent3);
      
      // Initialize agents to make them active
      await mockAgent1.initialize({} as any);
      await mockAgent2.initialize({} as any);
      await mockAgent3.initialize({} as any);
      
      // Set different statuses
      mockAgent2.setError(new Error('Test error'));
    });

    it('should return agents by status', () => {
      const activeAgents = registry.getAgentsByStatus('active');
      const errorAgents = registry.getAgentsByStatus('error');
      
      expect(activeAgents).toHaveLength(2);
      expect(errorAgents).toHaveLength(1);
      expect(errorAgents[0]).toBe(mockAgent2);
    });
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await registry.register(mockAgent1);
      await registry.register(mockAgent2);
    });

    it('should shutdown all agents', async () => {
      const cleanup1Spy = jest.spyOn(mockAgent1, 'cleanup');
      const cleanup2Spy = jest.spyOn(mockAgent2, 'cleanup');

      await registry.shutdown();

      expect(cleanup1Spy).toHaveBeenCalled();
      expect(cleanup2Spy).toHaveBeenCalled();
      expect(registry.list()).toHaveLength(0);
    });

    it('should emit registryShutdown event', async () => {
      const eventSpy = jest.fn();
      registry.on('registryShutdown', eventSpy);

      await registry.shutdown();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('updateAgentConfig', () => {
    beforeEach(async () => {
      await registry.register(mockAgent1);
    });

    it('should update agent configuration', async () => {
      const updateSpy = jest.spyOn(mockAgent1, 'updateConfig');
      const newConfig = { name: 'Updated Agent' };

      await registry.updateAgentConfig('agent-1', newConfig);

      expect(updateSpy).toHaveBeenCalledWith(newConfig);
    });

    it('should throw error for non-existent agent', async () => {
      await expect(registry.updateAgentConfig('non-existent', {}))
        .rejects.toThrow('Agent with ID non-existent not found');
    });

    it('should emit agentConfigUpdated event', async () => {
      const eventSpy = jest.fn();
      registry.on('agentConfigUpdated', eventSpy);

      const newConfig = { name: 'Updated Agent' };
      await registry.updateAgentConfig('agent-1', newConfig);

      expect(eventSpy).toHaveBeenCalledWith({
        agentId: 'agent-1',
        config: newConfig
      });
    });
  });
});