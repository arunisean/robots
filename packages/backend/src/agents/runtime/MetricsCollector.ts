import { EventEmitter } from 'events';
import { ExecutionMetrics } from '@multi-agent-platform/shared';
import { AgentSandbox } from './AgentSandbox';
import { Logger } from '../../utils/logger';

/**
 * Metrics Collector
 * Collects, aggregates, and stores agent execution metrics
 */
export class MetricsCollector extends EventEmitter {
  private logger: Logger;
  private agentMetrics: Map<string, AgentMetricsHistory> = new Map();
  private collectionIntervals: Map<string, NodeJS.Timeout> = new Map();
  private aggregationInterval?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor() {
    super();
    this.logger = new Logger('MetricsCollector');
    this.startAggregation();
  }

  /**
   * Start collecting metrics for an agent
   */
  startCollecting(agentId: string, sandbox: AgentSandbox): void {
    if (this.collectionIntervals.has(agentId)) {
      this.logger.warn(`Already collecting metrics for agent: ${agentId}`);
      return;
    }

    this.logger.info(`Starting metrics collection for agent: ${agentId}`);

    // Initialize metrics history
    this.agentMetrics.set(agentId, {
      agentId,
      startTime: new Date(),
      metrics: [],
      aggregatedMetrics: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        averageMemoryUsage: 0,
        averageCpuUsage: 0,
        peakMemoryUsage: 0,
        peakCpuUsage: 0,
        totalNetworkRequests: 0,
        totalErrors: 0,
        uptime: 0
      }
    });

    // Start periodic collection
    const interval = setInterval(() => {
      this.collectMetrics(agentId, sandbox);
    }, 5000); // Collect every 5 seconds

    this.collectionIntervals.set(agentId, interval);
  }

  /**
   * Stop collecting metrics for an agent
   */
  stopCollecting(agentId: string): void {
    const interval = this.collectionIntervals.get(agentId);
    if (interval) {
      clearInterval(interval);
      this.collectionIntervals.delete(agentId);
      this.logger.info(`Stopped metrics collection for agent: ${agentId}`);
    }
  }

  /**
   * Record metrics for an agent
   */
  recordMetrics(agentId: string, metrics: ExecutionMetrics): void {
    const history = this.agentMetrics.get(agentId);
    if (!history) {
      this.logger.warn(`No metrics history found for agent: ${agentId}`);
      return;
    }

    // Add timestamp if not present
    const timestampedMetrics = {
      ...metrics,
      timestamp: new Date()
    };

    // Add to history
    history.metrics.push(timestampedMetrics);

    // Keep only last 1000 entries to prevent memory issues
    if (history.metrics.length > 1000) {
      history.metrics = history.metrics.slice(-1000);
    }

    // Update aggregated metrics
    this.updateAggregatedMetrics(agentId);

    // Emit metrics update
    this.emit('metricsRecorded', {
      agentId,
      metrics: timestampedMetrics,
      aggregated: history.aggregatedMetrics
    });
  }

  /**
   * Get metrics history for an agent
   */
  getMetricsHistory(agentId: string): AgentMetricsHistory | null {
    return this.agentMetrics.get(agentId) || null;
  }

  /**
   * Get aggregated metrics for an agent
   */
  getAggregatedMetrics(agentId: string): AggregatedMetrics | null {
    const history = this.agentMetrics.get(agentId);
    return history ? history.aggregatedMetrics : null;
  }

  /**
   * Get metrics for all agents
   */
  getAllMetrics(): Map<string, AgentMetricsHistory> {
    return new Map(this.agentMetrics);
  }

  /**
   * Get system-wide metrics summary
   */
  getSystemMetrics(): SystemMetrics {
    const allMetrics = Array.from(this.agentMetrics.values());
    
    const totalAgents = allMetrics.length;
    const totalExecutions = allMetrics.reduce((sum, m) => sum + m.aggregatedMetrics.totalExecutions, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.aggregatedMetrics.totalErrors, 0);
    const totalMemoryUsage = allMetrics.reduce((sum, m) => sum + m.aggregatedMetrics.averageMemoryUsage, 0);
    const totalCpuUsage = allMetrics.reduce((sum, m) => sum + m.aggregatedMetrics.averageCpuUsage, 0);

    return {
      totalAgents,
      totalExecutions,
      totalErrors,
      errorRate: totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0,
      averageMemoryUsage: totalAgents > 0 ? totalMemoryUsage / totalAgents : 0,
      averageCpuUsage: totalAgents > 0 ? totalCpuUsage / totalAgents : 0,
      timestamp: new Date()
    };
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(agentId?: string): any {
    if (agentId) {
      return this.agentMetrics.get(agentId);
    }
    
    return Object.fromEntries(this.agentMetrics);
  }

  /**
   * Clear metrics history for an agent
   */
  clearMetrics(agentId: string): void {
    const history = this.agentMetrics.get(agentId);
    if (history) {
      history.metrics = [];
      this.resetAggregatedMetrics(agentId);
      this.logger.info(`Cleared metrics for agent: ${agentId}`);
    }
  }

  /**
   * Generate metrics report
   */
  generateReport(agentId?: string): MetricsReport {
    if (agentId) {
      return this.generateAgentReport(agentId);
    }
    
    return this.generateSystemReport();
  }

  /**
   * Shutdown metrics collector
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.logger.info('Shutting down metrics collector');

    // Stop all collection intervals
    for (const [agentId, interval] of this.collectionIntervals) {
      clearInterval(interval);
      this.logger.debug(`Stopped metrics collection for agent: ${agentId}`);
    }
    this.collectionIntervals.clear();

    // Stop aggregation
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }

    this.emit('shutdown');
    this.logger.info('Metrics collector shutdown completed');
  }

  // Private methods

  private collectMetrics(agentId: string, sandbox: AgentSandbox): void {
    try {
      const metrics = sandbox.getMetrics();
      const resourceUsage = sandbox.getResourceUsage();

      // Combine metrics with resource usage
      const combinedMetrics: ExecutionMetrics = {
        ...metrics,
        memoryUsed: resourceUsage.memoryUsed,
        cpuUsed: resourceUsage.cpuUsagePercent
      };

      this.recordMetrics(agentId, combinedMetrics);
    } catch (error) {
      this.logger.error(`Error collecting metrics for agent ${agentId}:`, error);
    }
  }

  private updateAggregatedMetrics(agentId: string): void {
    const history = this.agentMetrics.get(agentId);
    if (!history || history.metrics.length === 0) {
      return;
    }

    const metrics = history.metrics;
    const aggregated = history.aggregatedMetrics;

    // Calculate totals
    aggregated.totalExecutions = metrics.length;
    aggregated.totalErrors = metrics.reduce((sum, m) => sum + m.errors, 0);
    aggregated.totalNetworkRequests = metrics.reduce((sum, m) => sum + (m.networkRequests || 0), 0);

    // Calculate averages
    if (metrics.length > 0) {
      aggregated.averageExecutionTime = metrics
        .filter(m => m.duration)
        .reduce((sum, m) => sum + (m.duration || 0), 0) / Math.max(1, metrics.filter(m => m.duration).length);

      aggregated.averageMemoryUsage = metrics
        .reduce((sum, m) => sum + m.memoryUsed, 0) / metrics.length;

      aggregated.averageCpuUsage = metrics
        .reduce((sum, m) => sum + m.cpuUsed, 0) / metrics.length;

      // Calculate peaks
      aggregated.peakMemoryUsage = Math.max(...metrics.map(m => m.memoryUsed));
      aggregated.peakCpuUsage = Math.max(...metrics.map(m => m.cpuUsed));
    }

    // Calculate success/failure counts
    aggregated.successfulExecutions = metrics.filter(m => m.errors === 0).length;
    aggregated.failedExecutions = aggregated.totalExecutions - aggregated.successfulExecutions;

    // Calculate uptime
    aggregated.uptime = Date.now() - history.startTime.getTime();
  }

  private resetAggregatedMetrics(agentId: string): void {
    const history = this.agentMetrics.get(agentId);
    if (history) {
      history.aggregatedMetrics = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        averageMemoryUsage: 0,
        averageCpuUsage: 0,
        peakMemoryUsage: 0,
        peakCpuUsage: 0,
        totalNetworkRequests: 0,
        totalErrors: 0,
        uptime: 0
      };
    }
  }

  private startAggregation(): void {
    this.aggregationInterval = setInterval(() => {
      this.performAggregation();
    }, 60000); // Aggregate every minute
  }

  private performAggregation(): void {
    try {
      for (const agentId of this.agentMetrics.keys()) {
        this.updateAggregatedMetrics(agentId);
      }

      // Emit system metrics
      const systemMetrics = this.getSystemMetrics();
      this.emit('systemMetricsUpdate', systemMetrics);

    } catch (error) {
      this.logger.error('Error during metrics aggregation:', error);
    }
  }

  private generateAgentReport(agentId: string): MetricsReport {
    const history = this.agentMetrics.get(agentId);
    if (!history) {
      throw new Error(`No metrics found for agent: ${agentId}`);
    }

    const recent = history.metrics.slice(-100); // Last 100 entries
    const aggregated = history.aggregatedMetrics;

    return {
      agentId,
      reportType: 'agent',
      generatedAt: new Date(),
      summary: {
        totalExecutions: aggregated.totalExecutions,
        successRate: aggregated.totalExecutions > 0 ? 
          (aggregated.successfulExecutions / aggregated.totalExecutions) * 100 : 0,
        errorRate: aggregated.totalExecutions > 0 ? 
          (aggregated.totalErrors / aggregated.totalExecutions) * 100 : 0,
        averageExecutionTime: aggregated.averageExecutionTime,
        uptime: aggregated.uptime
      },
      performance: {
        averageMemoryUsage: aggregated.averageMemoryUsage,
        peakMemoryUsage: aggregated.peakMemoryUsage,
        averageCpuUsage: aggregated.averageCpuUsage,
        peakCpuUsage: aggregated.peakCpuUsage
      },
      trends: this.calculateTrends(recent),
      recommendations: this.generateRecommendations(aggregated)
    };
  }

  private generateSystemReport(): MetricsReport {
    const systemMetrics = this.getSystemMetrics();
    const allAgents = Array.from(this.agentMetrics.values());

    return {
      reportType: 'system',
      generatedAt: new Date(),
      summary: {
        totalAgents: systemMetrics.totalAgents,
        totalExecutions: systemMetrics.totalExecutions,
        errorRate: systemMetrics.errorRate,
        averageMemoryUsage: systemMetrics.averageMemoryUsage,
        averageCpuUsage: systemMetrics.averageCpuUsage
      },
      agentSummaries: allAgents.map(history => ({
        agentId: history.agentId,
        totalExecutions: history.aggregatedMetrics.totalExecutions,
        errorRate: history.aggregatedMetrics.totalExecutions > 0 ?
          (history.aggregatedMetrics.totalErrors / history.aggregatedMetrics.totalExecutions) * 100 : 0,
        averageMemoryUsage: history.aggregatedMetrics.averageMemoryUsage,
        uptime: history.aggregatedMetrics.uptime
      })),
      recommendations: this.generateSystemRecommendations(allAgents)
    };
  }

  private calculateTrends(metrics: TimestampedMetrics[]): any {
    if (metrics.length < 2) {
      return { trend: 'insufficient_data' };
    }

    const recent = metrics.slice(-10);
    const older = metrics.slice(-20, -10);

    if (older.length === 0) {
      return { trend: 'insufficient_data' };
    }

    const recentAvgMemory = recent.reduce((sum, m) => sum + m.memoryUsed, 0) / recent.length;
    const olderAvgMemory = older.reduce((sum, m) => sum + m.memoryUsed, 0) / older.length;

    const memoryTrend = recentAvgMemory > olderAvgMemory * 1.1 ? 'increasing' :
                       recentAvgMemory < olderAvgMemory * 0.9 ? 'decreasing' : 'stable';

    return {
      memoryTrend,
      recentAverageMemory: recentAvgMemory,
      memoryChange: ((recentAvgMemory - olderAvgMemory) / olderAvgMemory) * 100
    };
  }

  private generateRecommendations(metrics: AggregatedMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.averageMemoryUsage > 400) {
      recommendations.push('Consider increasing memory allocation or optimizing memory usage');
    }

    if (metrics.averageCpuUsage > 80) {
      recommendations.push('High CPU usage detected - consider optimizing algorithms or increasing CPU allocation');
    }

    if (metrics.totalExecutions > 0 && (metrics.totalErrors / metrics.totalExecutions) > 0.1) {
      recommendations.push('High error rate detected - review error handling and input validation');
    }

    if (metrics.averageExecutionTime > 30000) {
      recommendations.push('Long execution times detected - consider optimizing performance or increasing timeout');
    }

    return recommendations;
  }

  private generateSystemRecommendations(agents: AgentMetricsHistory[]): string[] {
    const recommendations: string[] = [];
    
    const highMemoryAgents = agents.filter(a => a.aggregatedMetrics.averageMemoryUsage > 400);
    if (highMemoryAgents.length > 0) {
      recommendations.push(`${highMemoryAgents.length} agents have high memory usage`);
    }

    const highErrorAgents = agents.filter(a => 
      a.aggregatedMetrics.totalExecutions > 0 && 
      (a.aggregatedMetrics.totalErrors / a.aggregatedMetrics.totalExecutions) > 0.1
    );
    if (highErrorAgents.length > 0) {
      recommendations.push(`${highErrorAgents.length} agents have high error rates`);
    }

    return recommendations;
  }
}

// Type definitions
export interface AgentMetricsHistory {
  agentId: string;
  startTime: Date;
  metrics: TimestampedMetrics[];
  aggregatedMetrics: AggregatedMetrics;
}

export interface TimestampedMetrics extends ExecutionMetrics {
  timestamp: Date;
}

export interface AggregatedMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  averageMemoryUsage: number;
  averageCpuUsage: number;
  peakMemoryUsage: number;
  peakCpuUsage: number;
  totalNetworkRequests: number;
  totalErrors: number;
  uptime: number;
}

export interface SystemMetrics {
  totalAgents: number;
  totalExecutions: number;
  totalErrors: number;
  errorRate: number;
  averageMemoryUsage: number;
  averageCpuUsage: number;
  timestamp: Date;
}

export interface MetricsReport {
  agentId?: string;
  reportType: 'agent' | 'system';
  generatedAt: Date;
  summary: any;
  performance?: any;
  trends?: any;
  agentSummaries?: any[];
  recommendations: string[];
}