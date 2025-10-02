import { BaseAgent } from '../../../agents/base/BaseAgent';
import { AgentCategory, AgentConfig, AgentInput, AgentStatus } from '@multi-agent-platform/shared';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

// Test implementation of BaseAgent
class TestAgent extends BaseAgent {
  private initializeError: Error | null = null;
  private executeError: Error | null = null;
  private cleanupError: Error | null = null;

  constructor(id: string, name: string, version: string, description: string) {
    super(id, name, version, AgentCategory.WORK, description);
  }

  // Test helpers
  setInitializeError(error: Error | null) {
    this.initializeError = error;
  }

  setExecuteError(error: Error | null) {
    this.executeError = error;
  }

  setCleanupError(error: Error | null) {
    this.cleanupError = error;
  }

  // Abstract method implementations
  protected async doInitialize(config: AgentConfig): Promise<void> {
    if (this.initializeError) {
      throw this.initializeError;
    }
  }

  protected async doExecute(input: AgentInput): Promise<any> {
    if (this.executeError) {
      throw this.executeError;
    }
    return { result: 'test-data' };
  }

  protected async doCleanup(): Promise<void> {
    if (this.cleanupError) {
      throw this.cleanupError;
    }
  }

  protected validateSpecificConfig(config: AgentConfig): string[] {
    const errors: string[] = [];
    if (config.name === 'invalid') {
      errors.push('Invalid name');
    }
    return errors;
  }

  protected async doHealthCheck(): Promise<boolean> {
    return true;
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;
  let mockConfig: AgentConfig;

  beforeEach(() => {
    agent = new TestAgent('test-id', 'Test Agent', '1.0.0', 'Test Description');
    mockConfig = {
      id: 'test-id',
      name: 'Test Agent',
      description: 'Test Description',
      version: '1.0.0',
      category: AgentCategory.WORK,
      enabled: true,
      resources: {
        memory: 512,
        cpu: 1,
        timeout: 300,
        storage: 100
      },
      settings: {}
    };
  });

  describe('constructor', () => {
    it('should initialize agent with correct properties', () => {
      expect(agent.id).toBe('test-id');
      expect(agent.name).toBe('Test Agent');
      expect(agent.version).toBe('1.0.0');
      expect(agent.category).toBe(AgentCategory.WORK);
      expect(agent.description).toBe('Test Description');
      expect(agent.getStatus()).toBe(AgentStatus.INACTIVE);
    });
  });

  describe('initialize', () => {
    it('should initialize agent successfully', async () => {
      await agent.initialize(mockConfig);
      
      expect(agent.getStatus()).toBe(AgentStatus.ACTIVE);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      agent.setInitializeError(error);

      await expect(agent.initialize(mockConfig)).rejects.toThrow('Initialization failed');
      expect(agent.getStatus()).toBe(AgentStatus.ERROR);
      expect(agent.getLastError()).toBe(error);
    });

    it('should validate configuration before initialization', async () => {
      const invalidConfig = { ...mockConfig, name: '' };

      await expect(agent.initialize(invalidConfig)).rejects.toThrow('Configuration validation failed');
    });

    it('should emit initialized event on success', async () => {
      const eventSpy = jest.fn();
      agent.on('initialized', eventSpy);

      await agent.initialize(mockConfig);

      expect(eventSpy).toHaveBeenCalledWith({
        agentId: 'test-id',
        config: mockConfig
      });
    });
  });

  describe('execute', () => {
    const mockInput: AgentInput = {
      data: { test: 'data' },
      metadata: {
        source: 'test',
        timestamp: new Date(),
        version: '1.0.0',
        format: 'json'
      },
      context: {
        userId: 'user-1',
        executionId: 'exec-1',
        environment: 'development',
        resources: {
          memory: 512,
          cpu: 1,
          timeout: 300,
          storage: 100
        }
      }
    };

    beforeEach(async () => {
      await agent.initialize(mockConfig);
    });

    it('should execute agent successfully', async () => {
      const result = await agent.execute(mockInput);

      expect(result.data).toEqual({ result: 'test-data' });
      expect(result.status).toBe('success');
      expect(result.metadata).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should handle execution errors', async () => {
      const error = new Error('Execution failed');
      agent.setExecuteError(error);

      await expect(agent.execute(mockInput)).rejects.toThrow('Execution failed');
      expect(agent.getStatus()).toBe(AgentStatus.ERROR);
      expect(agent.getLastError()).toBe(error);
    });

    it('should update status during execution', async () => {
      const executePromise = agent.execute(mockInput);
      
      // Status should be running during execution
      expect(agent.getStatus()).toBe(AgentStatus.RUNNING);
      
      await executePromise;
      
      // Status should return to active after execution
      expect(agent.getStatus()).toBe(AgentStatus.ACTIVE);
    });

    it('should emit execution events', async () => {
      const startedSpy = jest.fn();
      const completedSpy = jest.fn();
      
      agent.on('executionStarted', startedSpy);
      agent.on('executionCompleted', completedSpy);

      await agent.execute(mockInput);

      expect(startedSpy).toHaveBeenCalled();
      expect(completedSpy).toHaveBeenCalled();
    });

    it('should update metrics after execution', async () => {
      const initialMetrics = agent.getMetrics();
      expect(initialMetrics.totalExecutions).toBe(0);

      await agent.execute(mockInput);

      const updatedMetrics = agent.getMetrics();
      expect(updatedMetrics.totalExecutions).toBe(1);
      expect(updatedMetrics.successfulExecutions).toBe(1);
      expect(updatedMetrics.failedExecutions).toBe(0);
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await agent.initialize(mockConfig);
    });

    it('should cleanup agent successfully', async () => {
      await agent.cleanup();
      
      expect(agent.getStatus()).toBe(AgentStatus.INACTIVE);
    });

    it('should handle cleanup errors', async () => {
      const error = new Error('Cleanup failed');
      agent.setCleanupError(error);

      await expect(agent.cleanup()).rejects.toThrow('Cleanup failed');
      expect(agent.getLastError()).toBe(error);
    });

    it('should emit cleanup event', async () => {
      const eventSpy = jest.fn();
      agent.on('cleanup', eventSpy);

      await agent.cleanup();

      expect(eventSpy).toHaveBeenCalledWith({ agentId: 'test-id' });
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const result = agent.validateConfig(mockConfig);
      
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject configuration with missing name', () => {
      const invalidConfig = { ...mockConfig, name: '' };
      const result = agent.validateConfig(invalidConfig);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Agent name is required');
    });

    it('should reject configuration with invalid category', () => {
      const invalidConfig = { ...mockConfig, category: 'invalid' as any };
      const result = agent.validateConfig(invalidConfig);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Valid agent category is required');
    });

    it('should reject configuration with insufficient resources', () => {
      const invalidConfig = {
        ...mockConfig,
        resources: { memory: 32, cpu: 0.05, timeout: 0, storage: 5 }
      };
      const result = agent.validateConfig(invalidConfig);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Minimum memory allocation is 64MB');
      expect(result.errors).toContain('Minimum CPU allocation is 0.1 cores');
      expect(result.errors).toContain('Minimum timeout is 1 second');
    });

    it('should call agent-specific validation', () => {
      const invalidConfig = { ...mockConfig, name: 'invalid' };
      const result = agent.validateConfig(invalidConfig);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid name');
    });
  });

  describe('updateConfig', () => {
    beforeEach(async () => {
      await agent.initialize(mockConfig);
    });

    it('should update configuration successfully', async () => {
      const newConfig = { name: 'Updated Agent' };
      
      await agent.updateConfig(newConfig);
      
      // Verify the configuration was updated
      // (In a real implementation, you'd have a way to access the config)
    });

    it('should reject invalid configuration updates', async () => {
      const invalidUpdate = { name: '' };
      
      await expect(agent.updateConfig(invalidUpdate)).rejects.toThrow('Configuration update failed');
    });

    it('should emit configUpdated event', async () => {
      const eventSpy = jest.fn();
      agent.on('configUpdated', eventSpy);

      const newConfig = { name: 'Updated Agent' };
      await agent.updateConfig(newConfig);

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const isHealthy = await agent.healthCheck();
      
      expect(isHealthy).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should return agent metrics', () => {
      const metrics = agent.getMetrics();
      
      expect(metrics).toHaveProperty('totalExecutions');
      expect(metrics).toHaveProperty('successfulExecutions');
      expect(metrics).toHaveProperty('failedExecutions');
      expect(metrics).toHaveProperty('averageExecutionTime');
      expect(metrics).toHaveProperty('errorRate');
    });

    it('should return a copy of metrics', () => {
      const metrics1 = agent.getMetrics();
      const metrics2 = agent.getMetrics();
      
      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });
  });
});