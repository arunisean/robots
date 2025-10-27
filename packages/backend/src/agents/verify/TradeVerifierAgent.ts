import { AgentInput, AgentOutput, AgentCategory, ExecutionStatus } from '@multi-agent-platform/shared';
import { Logger } from '../../utils/logger';

/**
 * Trade Verifier Agent
 * Verifies trade execution and calculates P&L
 */
export class TradeVerifierAgent {
  private logger: Logger;
  private tradeHistory: any[] = [];
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly category: AgentCategory;
  public readonly description: string;

  constructor(config: any) {
    this.id = config.id || 'trade-verifier';
    this.name = 'Trade Verifier';
    this.description = 'Verifies trade execution and calculates profit/loss';
    this.category = AgentCategory.VERIFY;
    this.version = '1.0.0';
    this.logger = new Logger('TradeVerifierAgent');
  }

  /**
   * Initialize agent
   */
  async initialize(): Promise<void> {
    this.logger.info('Trade Verifier Agent initialized');
  }

  /**
   * Execute verification
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    
    try {
      const data = input.data;
      
      // Check if trade was executed
      const tradeExecuted = this.checkTradeExecution(data);
      
      // Calculate P&L if applicable
      const pnl = this.calculatePnL(data);
      
      // Verify order status
      const verification = this.verifyOrder(data);
      
      // Store trade in history
      if (tradeExecuted) {
        this.tradeHistory.push({
          timestamp: new Date(),
          ...data,
          pnl,
          verification
        });
      }
      
      const duration = Date.now() - startTime;
      
      return {
        data: {
          verified: verification.success,
          tradeExecuted,
          pnl,
          verification,
          tradeCount: this.tradeHistory.length,
          summary: this.generateSummary()
        },
        metadata: {
          generatedAt: new Date(),
          processingTime: duration,
          version: this.version,
          format: 'json'
        },
        metrics: {
          startTime: new Date(startTime),
          duration,
          memoryUsed: process.memoryUsage().heapUsed,
          cpuUsed: 0,
          networkRequests: 0,
          errors: 0
        },
        status: ExecutionStatus.SUCCESS
      };
      
    } catch (error) {
      this.logger.error('Error verifying trade:', error);
      
      return {
        data: {
          error: error instanceof Error ? error.message : String(error),
          verified: false
        },
        metadata: {
          generatedAt: new Date(),
          processingTime: Date.now() - startTime,
          version: this.version,
          format: 'json'
        },
        metrics: {
          startTime: new Date(startTime),
          duration: Date.now() - startTime,
          memoryUsed: process.memoryUsage().heapUsed,
          cpuUsed: 0,
          networkRequests: 0,
          errors: 1
        },
        status: ExecutionStatus.FAILURE
      };
    }
  }

  /**
   * Check if trade was executed
   */
  private checkTradeExecution(data: any): boolean {
    // Check for order ID or execution confirmation
    if (data.orderId || data.executionId) {
      return true;
    }
    
    // Check for filled status
    if (data.status === 'filled' || data.status === 'success') {
      return true;
    }
    
    // Check for trade details
    if (data.side && data.price && data.quantity) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate profit/loss
   */
  private calculatePnL(data: any): {
    realized: number;
    realizedPercent: number;
    unrealized: number;
    unrealizedPercent: number;
    totalFees: number;
  } {
    const realized = data.profitLoss || 0;
    const realizedPercent = data.profitLossPercentage || 0;
    const fees = data.fee || 0;
    
    // For now, unrealized P&L is 0 (would need position tracking)
    const unrealized = 0;
    const unrealizedPercent = 0;
    
    return {
      realized,
      realizedPercent,
      unrealized,
      unrealizedPercent,
      totalFees: fees
    };
  }

  /**
   * Verify order details
   */
  private verifyOrder(data: any): {
    success: boolean;
    checks: {
      hasOrderId: boolean;
      hasPrice: boolean;
      hasQuantity: boolean;
      statusValid: boolean;
    };
    warnings: string[];
    errors: string[];
  } {
    const checks = {
      hasOrderId: !!(data.orderId || data.executionId),
      hasPrice: !!data.price && data.price > 0,
      hasQuantity: !!data.quantity && data.quantity > 0,
      statusValid: ['filled', 'success', 'completed'].includes(data.status)
    };
    
    const warnings: string[] = [];
    const errors: string[] = [];
    
    if (!checks.hasOrderId) {
      warnings.push('No order ID found');
    }
    
    if (!checks.hasPrice) {
      errors.push('Invalid or missing price');
    }
    
    if (!checks.hasQuantity) {
      errors.push('Invalid or missing quantity');
    }
    
    if (!checks.statusValid && data.status) {
      warnings.push(`Unexpected order status: ${data.status}`);
    }
    
    const success = checks.hasPrice && checks.hasQuantity && errors.length === 0;
    
    return {
      success,
      checks,
      warnings,
      errors
    };
  }

  /**
   * Generate trading summary
   */
  private generateSummary(): {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnL: number;
    averagePnL: number;
  } {
    const totalTrades = this.tradeHistory.length;
    
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        averagePnL: 0
      };
    }
    
    let winningTrades = 0;
    let losingTrades = 0;
    let totalPnL = 0;
    
    for (const trade of this.tradeHistory) {
      const pnl = trade.pnl?.realized || 0;
      totalPnL += pnl;
      
      if (pnl > 0) {
        winningTrades++;
      } else if (pnl < 0) {
        losingTrades++;
      }
    }
    
    const winRate = (winningTrades / totalTrades) * 100;
    const averagePnL = totalPnL / totalTrades;
    
    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalPnL,
      averagePnL
    };
  }

  /**
   * Get trade history
   */
  getTradeHistory(): any[] {
    return [...this.tradeHistory];
  }

  /**
   * Clear trade history
   */
  clearHistory(): void {
    this.tradeHistory = [];
    this.logger.info('Trade history cleared');
  }

  /**
   * Cleanup agent resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Trade Verifier Agent cleaned up');
  }
}
