import { AgentInput, AgentOutput, AgentCategory, ExecutionStatus } from '@multi-agent-platform/shared';
import { Logger } from '../../utils/logger';
import { PaperTradingWrapper } from '../../services/PaperTradingWrapper';

/**
 * Mock Trade Executor Agent
 * Executes trades in paper trading mode using the backtest engine
 * Does not connect to real exchanges
 */
export class MockTradeExecutorAgent {
  private logger: Logger;
  private paperTrading?: PaperTradingWrapper;
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly category: AgentCategory;
  public readonly description: string;
  private config: any;

  constructor(config: any, paperTrading?: PaperTradingWrapper) {
    this.id = config.id || 'mock-trade-executor';
    this.name = 'Mock Trade Executor';
    this.description = 'Executes trades in paper trading mode';
    this.category = AgentCategory.EXECUTE;
    this.version = '1.0.0';
    this.config = config;
    this.logger = new Logger('MockTradeExecutorAgent');
    this.paperTrading = paperTrading;
  }

  /**
   * Initialize agent
   */
  async initialize(): Promise<void> {
    this.logger.info('Mock Trade Executor Agent initialized');
    
    if (this.paperTrading) {
      await this.paperTrading.initialize();
      this.logger.info('Paper trading initialized');
    }
  }

  /**
   * Execute trade
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    
    try {
      // Extract trade parameters from input
      const tradeParams = this.extractTradeParameters(input);
      
      // Validate trade parameters
      this.validateTradeParameters(tradeParams);
      
      // Execute trade (paper trading or mock)
      const result = await this.executeTrade(tradeParams);
      
      const duration = Date.now() - startTime;
      
      return {
        data: {
          ...result,
          paperTrading: true,
          executedAt: new Date(),
          orderType: this.config.orderType || 'limit'
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
      this.logger.error('Error executing trade:', error);
      
      return {
        data: {
          error: error instanceof Error ? error.message : String(error),
          paperTrading: true
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
   * Extract trade parameters from input
   */
  private extractTradeParameters(input: AgentInput): {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
  } {
    const data = input.data;
    
    // Try to extract from signal (from GridCalculator)
    if (data.signal) {
      return {
        symbol: data.gridConfig?.tradingPair || data.symbol || 'BTC/USDT',
        side: data.signal.action,
        quantity: data.signal.quantity,
        price: data.signal.price
      };
    }
    
    // Try direct extraction
    return {
      symbol: data.symbol || data.pair || 'BTC/USDT',
      side: (data.side || data.action || 'buy').toLowerCase() as 'buy' | 'sell',
      quantity: Number(data.quantity || data.amount || 0),
      price: Number(data.price || data.currentPrice || 0)
    };
  }

  /**
   * Validate trade parameters
   */
  private validateTradeParameters(params: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
  }): void {
    if (!params.symbol) {
      throw new Error('Symbol is required');
    }
    
    if (!['buy', 'sell'].includes(params.side)) {
      throw new Error('Side must be "buy" or "sell"');
    }
    
    if (params.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    
    if (params.price <= 0) {
      throw new Error('Price must be greater than 0');
    }
  }

  /**
   * Execute trade (paper trading or mock)
   */
  private async executeTrade(params: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
  }): Promise<any> {
    this.logger.info(
      `Executing ${params.side} order: ${params.quantity} ${params.symbol} @ ${params.price}`
    );
    
    // If paper trading wrapper is available, use it
    if (this.paperTrading) {
      const portfolio = this.paperTrading.getPortfolio();
      if (!portfolio) {
        throw new Error('Paper trading portfolio not initialized');
      }
      
      // Execute through backtest engine
      const trade = await this.paperTrading.getPortfolio();
      
      return {
        orderId: `mock-${Date.now()}`,
        symbol: params.symbol,
        side: params.side,
        price: params.price,
        quantity: params.quantity,
        value: params.price * params.quantity,
        fee: params.price * params.quantity * 0.001, // 0.1% fee
        status: 'filled',
        filledQuantity: params.quantity,
        averagePrice: params.price,
        portfolio: {
          balance: portfolio.balance,
          totalValue: portfolio.totalValue,
          positions: Array.from(portfolio.positions.values())
        }
      };
    }
    
    // Otherwise, return mock result
    return {
      orderId: `mock-${Date.now()}`,
      symbol: params.symbol,
      side: params.side,
      price: params.price,
      quantity: params.quantity,
      value: params.price * params.quantity,
      fee: params.price * params.quantity * 0.001,
      status: 'filled',
      filledQuantity: params.quantity,
      averagePrice: params.price
    };
  }

  /**
   * Cleanup agent resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Mock Trade Executor Agent cleaned up');
  }
}
