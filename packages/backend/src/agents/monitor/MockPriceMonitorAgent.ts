import { AgentInput, AgentOutput, AgentCategory, ExecutionStatus } from '@multi-agent-platform/shared';
import { Logger } from '../../utils/logger';
import { BacktestEngine, MarketDataPoint } from '../../services/BacktestEngine';

/**
 * Mock Price Monitor Agent
 * Provides price data from backtest engine or generates mock data
 * Used for testing and paper trading without real exchange connections
 */
export class MockPriceMonitorAgent {
  private logger: Logger;
  private backtestEngine?: BacktestEngine;
  private currentDataIndex: number = 0;
  private marketData: MarketDataPoint[] = [];
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly category: AgentCategory;
  public readonly description: string;
  private config: any;

  constructor(config: any, backtestEngine?: BacktestEngine) {
    this.id = config.id || 'mock-price-monitor';
    this.name = 'Mock Price Monitor';
    this.description = 'Monitors prices using backtest data or mock generation';
    this.category = AgentCategory.MONITOR;
    this.version = '1.0.0';
    this.config = config;
    this.logger = new Logger('MockPriceMonitorAgent');
    this.backtestEngine = backtestEngine;
  }

  /**
   * Initialize agent
   */
  async initialize(): Promise<void> {
    this.logger.info('Mock Price Monitor Agent initialized');
    
    // If backtest engine is available, we can use its data
    if (this.backtestEngine) {
      this.logger.info('Connected to backtest engine for market data');
    }
  }

  /**
   * Execute price monitoring
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    
    try {
      const symbol = this.config.symbol || input.data.symbol || 'BTC/USDT';
      
      // Get price data
      const priceData = await this.getPriceData(symbol, input);
      
      const duration = Date.now() - startTime;
      
      return {
        data: {
          symbol,
          currentPrice: priceData.close,
          open: priceData.open,
          high: priceData.high,
          low: priceData.low,
          close: priceData.close,
          volume: priceData.volume,
          timestamp: priceData.timestamp,
          source: 'mock',
          change24h: this.calculateChange(priceData),
          changePercent24h: this.calculateChangePercent(priceData)
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
      this.logger.error('Error monitoring price:', error);
      
      return {
        data: {
          error: error instanceof Error ? error.message : String(error)
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
   * Get price data from backtest engine or generate mock data
   */
  private async getPriceData(symbol: string, input: AgentInput): Promise<MarketDataPoint> {
    // If market data is provided in input (from backtest), use it
    if (input.data.marketData) {
      return input.data.marketData as MarketDataPoint;
    }
    
    // If we have stored market data, use next point
    if (this.marketData.length > 0) {
      const dataPoint = this.marketData[this.currentDataIndex % this.marketData.length];
      this.currentDataIndex++;
      return dataPoint;
    }
    
    // Otherwise, generate mock price data
    return this.generateMockPrice(symbol);
  }

  /**
   * Generate mock price data
   */
  private generateMockPrice(symbol: string): MarketDataPoint {
    // Use a base price based on symbol
    const basePrices: Record<string, number> = {
      'BTC/USDT': 30000,
      'ETH/USDT': 2000,
      'BNB/USDT': 300,
      'SOL/USDT': 100
    };
    
    const basePrice = basePrices[symbol] || 100;
    
    // Add some randomness (±2%)
    const volatility = 0.02;
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;
    const price = basePrice * randomFactor;
    
    // Generate OHLC
    const open = price * (1 + (Math.random() - 0.5) * 0.01);
    const high = Math.max(open, price) * (1 + Math.random() * 0.01);
    const low = Math.min(open, price) * (1 - Math.random() * 0.01);
    const close = price;
    const volume = 1000000 + Math.random() * 5000000;
    
    return {
      timestamp: new Date(),
      symbol,
      open,
      high,
      low,
      close,
      volume,
      source: 'generated'
    };
  }

  /**
   * Set market data for sequential playback
   */
  setMarketData(data: MarketDataPoint[]): void {
    this.marketData = data;
    this.currentDataIndex = 0;
    this.logger.info(`Loaded ${data.length} market data points for playback`);
  }

  /**
   * Calculate 24h price change
   */
  private calculateChange(data: MarketDataPoint): number {
    // Simplified: use open to close change
    return data.close - data.open;
  }

  /**
   * Calculate 24h price change percentage
   */
  private calculateChangePercent(data: MarketDataPoint): number {
    if (data.open === 0) return 0;
    return ((data.close - data.open) / data.open) * 100;
  }

  /**
   * Cleanup agent resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Mock Price Monitor Agent cleaned up');
  }
}
