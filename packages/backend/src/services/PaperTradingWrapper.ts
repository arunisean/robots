import { Logger } from '../utils/logger';
import { AgentInput, AgentOutput, AgentConfig } from '@multi-agent-platform/shared';
import { IAgent } from '../agents/base/IAgent';
import { BacktestEngine } from './BacktestEngine';

/**
 * Paper Trading Wrapper
 * Intercepts Execute agent calls and simulates trades instead of executing real ones
 */
export class PaperTradingWrapper {
  private logger: Logger;
  private backtestEngine: BacktestEngine;
  private userId: string;
  private feeRate: number;

  constructor(
    backtestEngine: BacktestEngine,
    userId: string,
    feeRate: number = 0.001
  ) {
    this.logger = new Logger('PaperTradingWrapper');
    this.backtestEngine = backtestEngine;
    this.userId = userId;
    this.feeRate = feeRate;
  }

  /**
   * Initialize paper trading
   */
  async initialize(initialBalance: number = 10000, currency: string = 'USDT'): Promise<void> {
    this.logger.info(`Initializing paper trading for user ${this.userId}`);
    
    // Ensure virtual portfolio exists
    let portfolio = this.backtestEngine.getVirtualPortfolio(this.userId);
    if (!portfolio) {
      portfolio = this.backtestEngine.createVirtualPortfolio(this.userId, initialBalance, currency);
      this.logger.info(`Created virtual portfolio with ${initialBalance} ${currency}`);
    }
  }

  /**
   * Wrap agent execution with paper trading simulation
   */
  async wrapExecution(
    agent: IAgent,
    input: AgentInput
  ): Promise<AgentOutput> {
    this.logger.info(`Wrapping ${agent.name} execution in PAPER TRADING mode`);

    // Get the original execution plan from wrapped agent
    // But don't actually execute it
    const originalOutput = await this.simulateExecution(input);

    // Extract trade parameters from output
    const tradeParams = this.extractTradeParameters(originalOutput);

    if (!tradeParams) {
      this.logger.warn('No trade parameters found in agent output');
      return {
        data: {
          ...originalOutput.data,
          paperTrading: true,
          simulated: true,
          message: 'No trade executed (paper trading mode)'
        },
        metadata: originalOutput.metadata,
        metrics: originalOutput.metrics,
        status: 'success' as any
      };
    }

    // Execute simulated trade
    try {
      const trade = this.backtestEngine.executeSimulatedTrade(
        this.userId,
        tradeParams.symbol,
        tradeParams.side,
        tradeParams.quantity,
        tradeParams.price,
        this.feeRate
      );

      this.logger.info(
        `Simulated ${tradeParams.side} trade: ${tradeParams.quantity} ${tradeParams.symbol} @ ${tradeParams.price}`
      );

      // Get updated portfolio
      const portfolio = this.backtestEngine.getVirtualPortfolio(this.userId)!;

      return {
        data: {
          ...originalOutput.data,
          paperTrading: true,
          simulated: true,
          trade: {
            symbol: trade.symbol,
            side: trade.side,
            price: trade.price,
            quantity: trade.quantity,
            value: trade.value,
            fee: trade.fee,
            timestamp: trade.timestamp
          },
          portfolio: {
            balance: portfolio.balance,
            totalValue: portfolio.totalValue,
            positions: Array.from(portfolio.positions.values()),
            currency: portfolio.currency
          },
          profitLoss: trade.profitLoss,
          profitLossPercentage: trade.profitLossPercentage
        },
        metadata: originalOutput.metadata,
        metrics: originalOutput.metrics,
        status: 'success' as any
      };

    } catch (error) {
      this.logger.error('Error executing simulated trade:', error);
      
      return {
        data: {
          paperTrading: true,
          error: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          generatedAt: new Date(),
          processingTime: 0,
          version: '1.0',
          format: 'json'
        },
        metrics: {
          startTime: new Date(),
          duration: 0,
          memoryUsed: 0,
          cpuUsed: 0,
          networkRequests: 0,
          errors: 0
        },
        status: 'failure' as any
      };
    }
  }

  /**
   * Simulate execution without actually executing
   */
  private async simulateExecution(input: AgentInput): Promise<AgentOutput> {
    // For paper trading, we can either:
    // 1. Call the wrapped agent with a flag to not execute
    // 2. Parse the input to determine what would be executed
    // 3. Return a mock output based on input

    // For now, we'll create a mock output based on input
    // In a real implementation, you might want to call the wrapped agent
    // with a dry-run flag

    return {
      data: {
        ...input.data,
        simulationMode: true
      },
      metadata: {
        generatedAt: new Date(),
        processingTime: 0,
        version: '1.0',
        format: 'json'
      },
      metrics: {
        startTime: new Date(),
        duration: 0,
        memoryUsed: 0,
        cpuUsed: 0,
        networkRequests: 0,
        errors: 0
      },
      status: 'success' as any
    };
  }

  /**
   * Extract trade parameters from agent output
   */
  private extractTradeParameters(output: AgentOutput): {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
  } | null {
    const data = output.data;

    // Try different possible field names
    const symbol = data.symbol || data.pair || data.asset;
    const side = data.side || data.action || data.orderSide;
    const quantity = data.quantity || data.amount || data.size;
    const price = data.price || data.executionPrice || data.currentPrice;

    if (!symbol || !side || !quantity || !price) {
      return null;
    }

    return {
      symbol,
      side: side.toLowerCase() as 'buy' | 'sell',
      quantity: Number(quantity),
      price: Number(price)
    };
  }

  /**
   * Get portfolio metrics
   */
  getPortfolioMetrics(): Record<string, any> | null {
    const portfolio = this.backtestEngine.getVirtualPortfolio(this.userId);
    
    if (!portfolio) {
      return null;
    }

    return {
      balance: portfolio.balance,
      totalValue: portfolio.totalValue,
      positionCount: portfolio.positions.size,
      tradeCount: portfolio.trades.length,
      positions: Array.from(portfolio.positions.values()),
      recentTrades: portfolio.trades.slice(-10)
    };
  }

  /**
   * Get portfolio
   */
  getPortfolio() {
    return this.backtestEngine.getVirtualPortfolio(this.userId);
  }
}
