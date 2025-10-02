import { AgentSandbox } from '../../../agents/runtime/AgentSandbox';
import { ResourceAllocation } from '@multi-agent-platform/shared';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

// Mock worker_threads
const mockWorker = {
  postMessage: jest.fn(),
  terminate: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  off: jest.fn(),
  _eventHandlers: new Map(),
  _simulateMessage: function(message: any) {
    const handlers = this._eventHandlers.get('message') || [];
    handlers.forEach((handler: any) => handler(message));
  },
  _simulateError: function(error: Error) {
    const handlers = this._eventHandlers.get('error') || [];
    handlers.forEach((handler: any) => handler(error));
  }
};

// Override the on method to store event handlers
mockWorker.on.mockImplementation((event: string, handler: Function) => {
  if (!mockWorker._eventHandlers.has(event)) {
    mockWorker._eventHandlers.set(event, []);
  }
  mockWorker._eventHandlers.get(event).push(handler);
});

// Override the off method to remove event handlers
mockWorker.off.mockImplementation((event: string, handler: Function) => {
  const handlers = mockWorker._eventHandlers.get(event) || [];
  const index = handlers.indexOf(handler);
  if (index > -1) {
    handlers.splice(index, 1);
  }
});

jest.mock('worker_threads', () => ({
  Worker: jest.fn().mockImplementation(() => {
    // Reset the mock worker for each new instance
    mockWorker.postMessage.mockClear();
    mockWorker.terminate.mockClear();
    mockWorker.on.mockClear();
    mockWorker.off.mockClear();
    mockWorker._eventHandlers.clear();
    
    // Override the on method again for this instance
    mockWorker.on.mockImplementation((event: string, handler: Function) => {
      if (!mockWorker._eventHandlers.has(event)) {
        mockWorker._eventHandlers.set(event, []);
      }
      mockWorker._eventHandlers.get(event).push(handler);
    });
    
    mockWorker.off.mockImplementation((event: string, handler: Function) => {
      const handlers = mockWorker._eventHandlers.get(event) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    });
    
    return mockWorker;
  })
}));

// Mock fs
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('AgentSandbox', () => {
  let sandbox: AgentSandbox;
  let mockResourceAllocation: ResourceAllocation;

  beforeEach(() => {
    mockResourceAllocation = {
      memory: 512,
      cpu: 1,
      timeout: 300,
      storage: 100
    };

    sandbox = new AgentSandbox(
      'test-agent',
      'test-agent-code',
      mockResourceAllocation
    );

    jest.clearAllMocks();
  });

  // Helper function to simulate successful worker initialization
  const simulateWorkerInit = async (startPromise: Promise<void>) => {
    setTimeout(() => {
      mockWorker._simulateMessage({ type: 'initialized' });
    }, 10);
    return startPromise;
  };

  describe('constructor', () => {
    it('should initialize sandbox with correct properties', () => {
      expect(sandbox).toBeDefined();
      expect(sandbox.getMetrics()).toBeDefined();
      expect(sandbox.getResourceUsage()).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start sandbox successfully', async () => {
      const startSpy = jest.fn();
      sandbox.on('started', startSpy);

      // Simulate worker initialization
      const startPromise = sandbox.start();
      
      // Simulate the worker responding to initialization
      setTimeout(() => {
        mockWorker._simulateMessage({ type: 'initialized' });
      }, 10);

      await startPromise;

      expect(startSpy).toHaveBeenCalledWith({ agentId: 'test-agent' });
    });

    it('should throw error if already running', async () => {
      await simulateWorkerInit(sandbox.start());
      
      await expect(sandbox.start())
        .rejects.toThrow('Sandbox is already running');
    });

    it('should emit started event', async () => {
      const eventSpy = jest.fn();
      sandbox.on('started', eventSpy);

      await sandbox.start();

      expect(eventSpy).toHaveBeenCalledWith({ agentId: 'test-agent' });
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await sandbox.start();
    });

    it('should stop sandbox successfully', async () => {
      const stopSpy = jest.fn();
      sandbox.on('stopped', stopSpy);

      await sandbox.stop();

      expect(stopSpy).toHaveBeenCalled();
    });

    it('should update metrics on stop', async () => {
      await sandbox.stop();

      const metrics = sandbox.getMetrics();
      expect(metrics.endTime).toBeDefined();
      expect(metrics.duration).toBeDefined();
    });

    it('should handle multiple stop calls gracefully', async () => {
      await sandbox.stop();
      await expect(sandbox.stop()).resolves.not.toThrow();
    });
  });

  describe('execute', () => {
    beforeEach(async () => {
      await sandbox.start();
    });

    it('should throw error if not running', async () => {
      await sandbox.stop();
      
      await expect(sandbox.execute({ test: 'data' }))
        .rejects.toThrow('Sandbox is not running');
    });

    it('should handle execution timeout', async () => {
      // Mock worker that doesn't respond
      const { Worker } = require('worker_threads');
      const mockWorker = new Worker();
      mockWorker.postMessage = jest.fn();
      
      // Don't emit any response to simulate timeout
      
      const shortTimeoutSandbox = new AgentSandbox(
        'timeout-test',
        'test-code',
        { ...mockResourceAllocation, timeout: 1 } // 1 second timeout
      );

      await shortTimeoutSandbox.start();

      await expect(shortTimeoutSandbox.execute({ test: 'data' }))
        .rejects.toThrow('Agent execution timeout after 1s');
    }, 10000);
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metrics = sandbox.getMetrics();

      expect(metrics).toHaveProperty('startTime');
      expect(metrics).toHaveProperty('memoryUsed');
      expect(metrics).toHaveProperty('cpuUsed');
      expect(metrics).toHaveProperty('networkRequests');
      expect(metrics).toHaveProperty('errors');
    });

    it('should return a copy of metrics', () => {
      const metrics1 = sandbox.getMetrics();
      const metrics2 = sandbox.getMetrics();

      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });
  });

  describe('getResourceUsage', () => {
    it('should return resource usage information', () => {
      const usage = sandbox.getResourceUsage();

      expect(usage).toHaveProperty('memoryUsed');
      expect(usage).toHaveProperty('memoryLimit');
      expect(usage).toHaveProperty('memoryUsagePercent');
      expect(usage).toHaveProperty('cpuUsed');
      expect(usage).toHaveProperty('cpuLimit');
      expect(usage).toHaveProperty('cpuUsagePercent');
      expect(usage).toHaveProperty('uptime');
    });

    it('should calculate usage percentages correctly', () => {
      const usage = sandbox.getResourceUsage();

      expect(usage.memoryLimit).toBe(mockResourceAllocation.memory);
      expect(usage.cpuLimit).toBe(mockResourceAllocation.cpu * 100);
      expect(usage.memoryUsagePercent).toBeGreaterThanOrEqual(0);
      expect(usage.memoryUsagePercent).toBeLessThanOrEqual(100);
    });
  });

  describe('isHealthy', () => {
    it('should return false if not running', () => {
      expect(sandbox.isHealthy()).toBe(false);
    });

    it('should return true for healthy running sandbox', async () => {
      await sandbox.start();
      expect(sandbox.isHealthy()).toBe(true);
    });

    it('should return false for high memory usage', async () => {
      await sandbox.start();
      
      // Mock high memory usage
      const originalGetResourceUsage = sandbox.getResourceUsage;
      sandbox.getResourceUsage = jest.fn().mockReturnValue({
        memoryUsagePercent: 95,
        cpuUsagePercent: 50
      });

      expect(sandbox.isHealthy()).toBe(false);
    });

    it('should return false for high CPU usage', async () => {
      await sandbox.start();
      
      // Mock high CPU usage
      sandbox.getResourceUsage = jest.fn().mockReturnValue({
        memoryUsagePercent: 50,
        cpuUsagePercent: 95
      });

      expect(sandbox.isHealthy()).toBe(false);
    });
  });

  describe('resource monitoring', () => {
    it('should emit metricsUpdate events', async () => {
      const metricsSpy = jest.fn();
      sandbox.on('metricsUpdate', metricsSpy);

      await sandbox.start();
      
      // Wait for metrics update
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(metricsSpy).toHaveBeenCalled();
    });

    it('should emit resourceLimitExceeded events', async () => {
      const limitSpy = jest.fn();
      sandbox.on('resourceLimitExceeded', limitSpy);

      await sandbox.start();

      // Mock resource limit exceeded
      sandbox.getResourceUsage = jest.fn().mockReturnValue({
        memoryUsagePercent: 96,
        cpuUsagePercent: 50
      });

      // Trigger resource check
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(limitSpy).toHaveBeenCalledWith({
        agentId: 'test-agent',
        resource: 'memory',
        usage: 96,
        limit: 95
      });
    });
  });

  describe('error handling', () => {
    it('should handle worker creation errors', async () => {
      const { Worker } = require('worker_threads');
      Worker.mockImplementation(() => {
        throw new Error('Worker creation failed');
      });

      await expect(sandbox.start())
        .rejects.toThrow('Worker creation failed');
    });

    it('should handle worker errors', async () => {
      const errorSpy = jest.fn();
      sandbox.on('error', errorSpy);

      await sandbox.start();

      // Simulate worker error
      const { Worker } = require('worker_threads');
      const mockWorker = Worker.mock.results[0].value;
      const errorHandler = mockWorker.on.mock.calls.find(call => call[0] === 'error')[1];
      
      const testError = new Error('Worker error');
      errorHandler(testError);

      expect(errorSpy).toHaveBeenCalledWith({
        agentId: 'test-agent',
        error: testError
      });
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on stop', async () => {
      await sandbox.start();
      await sandbox.stop();

      const { Worker } = require('worker_threads');
      const mockWorker = Worker.mock.results[0].value;
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should clear intervals on stop', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      await sandbox.start();
      await sandbox.stop();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});