import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import { ResourceAllocation, ExecutionMetrics } from '@multi-agent-platform/shared';
import { Logger } from '../../utils/logger';
import * as os from 'os';
import * as path from 'path';

/**
 * Agent Sandbox
 * Provides isolated execution environment for agents with resource management
 */
export class AgentSandbox extends EventEmitter {
  private logger: Logger;
  private worker?: Worker;
  private resourceAllocation: ResourceAllocation;
  private startTime?: Date;
  private metrics: ExecutionMetrics;
  private resourceMonitor?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private agentId: string,
    private agentCode: string,
    resourceAllocation: ResourceAllocation
  ) {
    super();
    this.logger = new Logger(`AgentSandbox:${agentId}`);
    this.resourceAllocation = resourceAllocation;
    this.metrics = {
      startTime: new Date(),
      memoryUsed: 0,
      cpuUsed: 0,
      networkRequests: 0,
      errors: 0
    };
  }

  /**
   * Start the agent in sandbox environment
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Sandbox is already running');
    }

    this.logger.info(`Starting agent sandbox: ${this.agentId}`);
    this.startTime = new Date();
    this.metrics.startTime = this.startTime;

    try {
      // Create worker thread for isolated execution
      await this.createWorker();
      
      // Start resource monitoring
      this.startResourceMonitoring();
      
      this.isRunning = true;
      this.emit('started', { agentId: this.agentId });
      
      this.logger.info(`Agent sandbox started successfully: ${this.agentId}`);
    } catch (error) {
      this.logger.error(`Failed to start sandbox: ${this.agentId}`, error);
      throw error;
    }
  }

  /**
   * Stop the agent sandbox
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info(`Stopping agent sandbox: ${this.agentId}`);

    try {
      // Stop resource monitoring
      if (this.resourceMonitor) {
        clearInterval(this.resourceMonitor);
        this.resourceMonitor = undefined;
      }

      // Terminate worker thread
      if (this.worker) {
        await this.worker.terminate();
        this.worker = undefined;
      }

      // Update metrics
      this.metrics.endTime = new Date();
      this.metrics.duration = this.metrics.endTime.getTime() - this.metrics.startTime.getTime();

      this.isRunning = false;
      this.emit('stopped', { agentId: this.agentId, metrics: this.metrics });
      
      this.logger.info(`Agent sandbox stopped: ${this.agentId}`);
    } catch (error) {
      this.logger.error(`Error stopping sandbox: ${this.agentId}`, error);
      throw error;
    }
  }

  /**
   * Execute agent with input data
   */
  async execute(input: any): Promise<any> {
    if (!this.isRunning) {
      throw new Error('Sandbox is not running');
    }

    this.logger.info(`Executing agent: ${this.agentId}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Agent execution timeout after ${this.resourceAllocation.timeout}s`));
      }, this.resourceAllocation.timeout * 1000);

      // Send execution request to worker
      this.worker!.postMessage({
        type: 'execute',
        input,
        agentId: this.agentId
      });

      // Handle worker response
      const handleMessage = (message: any) => {
        clearTimeout(timeout);
        this.worker!.off('message', handleMessage);
        this.worker!.off('error', handleError);

        if (message.type === 'result') {
          this.logger.info(`Agent execution completed: ${this.agentId}`);
          resolve(message.result);
        } else if (message.type === 'error') {
          this.metrics.errors++;
          this.logger.error(`Agent execution failed: ${this.agentId}`, message.error);
          reject(new Error(message.error));
        }
      };

      const handleError = (error: Error) => {
        clearTimeout(timeout);
        this.worker!.off('message', handleMessage);
        this.worker!.off('error', handleError);
        this.metrics.errors++;
        this.logger.error(`Worker error: ${this.agentId}`, error);
        reject(error);
      };

      this.worker!.on('message', handleMessage);
      this.worker!.on('error', handleError);
    });
  }

  /**
   * Get current execution metrics
   */
  getMetrics(): ExecutionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get resource usage
   */
  getResourceUsage(): ResourceUsage {
    return {
      memoryUsed: this.metrics.memoryUsed,
      memoryLimit: this.resourceAllocation.memory,
      memoryUsagePercent: (this.metrics.memoryUsed / this.resourceAllocation.memory) * 100,
      cpuUsed: this.metrics.cpuUsed,
      cpuLimit: this.resourceAllocation.cpu * 100, // Convert to percentage
      cpuUsagePercent: this.metrics.cpuUsed,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0
    };
  }

  /**
   * Check if sandbox is healthy
   */
  isHealthy(): boolean {
    if (!this.isRunning) {
      return false;
    }

    const usage = this.getResourceUsage();
    
    // Check memory usage
    if (usage.memoryUsagePercent > 90) {
      this.logger.warn(`High memory usage: ${usage.memoryUsagePercent.toFixed(1)}%`);
      return false;
    }

    // Check CPU usage
    if (usage.cpuUsagePercent > 90) {
      this.logger.warn(`High CPU usage: ${usage.cpuUsagePercent.toFixed(1)}%`);
      return false;
    }

    // Check error rate
    const errorRate = this.metrics.errors / Math.max(1, this.metrics.networkRequests || 1);
    if (errorRate > 0.5) {
      this.logger.warn(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
      return false;
    }

    return true;
  }

  // Private methods

  private async createWorker(): Promise<void> {
    const workerScript = this.generateWorkerScript();
    const workerPath = await this.writeWorkerScript(workerScript);

    this.worker = new Worker(workerPath, {
      resourceLimits: {
        maxOldGenerationSizeMb: this.resourceAllocation.memory,
        maxYoungGenerationSizeMb: Math.floor(this.resourceAllocation.memory * 0.3),
        codeRangeSizeMb: Math.floor(this.resourceAllocation.memory * 0.1)
      }
    });

    // Set up worker event handlers
    this.worker.on('error', (error) => {
      this.logger.error(`Worker error: ${this.agentId}`, error);
      this.emit('error', { agentId: this.agentId, error });
    });

    this.worker.on('exit', (code) => {
      this.logger.info(`Worker exited: ${this.agentId}, code: ${code}`);
      this.emit('workerExit', { agentId: this.agentId, exitCode: code });
    });

    // Initialize worker
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 10000);

      this.worker!.postMessage({
        type: 'init',
        agentCode: this.agentCode,
        agentId: this.agentId
      });

      const handleMessage = (message: any) => {
        if (message.type === 'initialized') {
          clearTimeout(timeout);
          this.worker!.off('message', handleMessage);
          resolve();
        } else if (message.type === 'error') {
          clearTimeout(timeout);
          this.worker!.off('message', handleMessage);
          reject(new Error(message.error));
        }
      };

      this.worker!.on('message', handleMessage);
    });
  }

  private generateWorkerScript(): string {
    return `
const { parentPort } = require('worker_threads');
const vm = require('vm');

let agentInstance = null;
let agentCode = '';

// Sandbox context with limited global access
const sandboxContext = {
  console: {
    log: (...args) => parentPort.postMessage({ type: 'log', level: 'info', args }),
    error: (...args) => parentPort.postMessage({ type: 'log', level: 'error', args }),
    warn: (...args) => parentPort.postMessage({ type: 'log', level: 'warn', args }),
    info: (...args) => parentPort.postMessage({ type: 'log', level: 'info', args }),
    debug: (...args) => parentPort.postMessage({ type: 'log', level: 'debug', args })
  },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Promise,
  Date,
  JSON,
  Math,
  String,
  Number,
  Boolean,
  Array,
  Object,
  RegExp,
  Error,
  Buffer,
  process: {
    env: process.env,
    version: process.version,
    platform: process.platform
  },
  require: (module) => {
    // Whitelist of allowed modules
    const allowedModules = ['crypto', 'util', 'events', 'stream'];
    if (allowedModules.includes(module)) {
      return require(module);
    }
    throw new Error(\`Module '\${module}' is not allowed in sandbox\`);
  }
};

// Create VM context
vm.createContext(sandboxContext);

parentPort.on('message', async (message) => {
  try {
    switch (message.type) {
      case 'init':
        agentCode = message.agentCode;
        // Execute agent code in sandbox
        vm.runInContext(agentCode, sandboxContext);
        parentPort.postMessage({ type: 'initialized' });
        break;

      case 'execute':
        if (!agentInstance) {
          parentPort.postMessage({ 
            type: 'error', 
            error: 'Agent not initialized' 
          });
          return;
        }

        const result = await agentInstance.execute(message.input);
        parentPort.postMessage({ 
          type: 'result', 
          result 
        });
        break;

      default:
        parentPort.postMessage({ 
          type: 'error', 
          error: \`Unknown message type: \${message.type}\` 
        });
    }
  } catch (error) {
    parentPort.postMessage({ 
      type: 'error', 
      error: error.message 
    });
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  parentPort.postMessage({ 
    type: 'error', 
    error: error.message 
  });
});

process.on('unhandledRejection', (reason) => {
  parentPort.postMessage({ 
    type: 'error', 
    error: reason.toString() 
  });
});
`;
  }

  private async writeWorkerScript(script: string): Promise<string> {
    const fs = require('fs').promises;
    const workerPath = path.join(os.tmpdir(), `agent-worker-${this.agentId}-${Date.now()}.js`);
    
    await fs.writeFile(workerPath, script, 'utf8');
    return workerPath;
  }

  private startResourceMonitoring(): void {
    this.resourceMonitor = setInterval(() => {
      this.updateResourceMetrics();
    }, 1000); // Update every second
  }

  private updateResourceMetrics(): void {
    if (!this.worker) return;

    try {
      // Get memory usage
      const memoryUsage = process.memoryUsage();
      this.metrics.memoryUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024); // MB

      // Get CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      this.metrics.cpuUsed = Math.round(
        ((cpuUsage.user + cpuUsage.system) / 1000000) / os.cpus().length
      );

      // Check resource limits
      this.checkResourceLimits();

      // Emit metrics update
      this.emit('metricsUpdate', {
        agentId: this.agentId,
        metrics: this.metrics
      });

    } catch (error) {
      this.logger.error('Error updating resource metrics:', error);
    }
  }

  private checkResourceLimits(): void {
    const usage = this.getResourceUsage();

    // Check memory limit
    if (usage.memoryUsagePercent > 95) {
      this.logger.error(`Memory limit exceeded: ${usage.memoryUsagePercent.toFixed(1)}%`);
      this.emit('resourceLimitExceeded', {
        agentId: this.agentId,
        resource: 'memory',
        usage: usage.memoryUsagePercent,
        limit: 95
      });
    }

    // Check CPU limit
    if (usage.cpuUsagePercent > 95) {
      this.logger.error(`CPU limit exceeded: ${usage.cpuUsagePercent.toFixed(1)}%`);
      this.emit('resourceLimitExceeded', {
        agentId: this.agentId,
        resource: 'cpu',
        usage: usage.cpuUsagePercent,
        limit: 95
      });
    }
  }
}

// Type definitions
export interface ResourceUsage {
  memoryUsed: number;
  memoryLimit: number;
  memoryUsagePercent: number;
  cpuUsed: number;
  cpuLimit: number;
  cpuUsagePercent: number;
  uptime: number;
}