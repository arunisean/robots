import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';

/**
 * Market data point for backtesting
 */
export interface MarketDataPoint {
  timestamp: Date;
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source?: string; // 'historical' | 'generated' | 'replay'
}

/**
 * Backtest configuration
 */
export interface BacktestConfig {
  startDate: Date;
  endDate: Date;
  symbols: string[];
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  initialBalance: number;
  currency: string;
  dataSource: 'historical' | 'generated' | 'replay';
  generatorConfig?: DataGeneratorConfig;
  replayData?: MarketDataPoint[];
}

/**
 * Data generator configuration
 */
export interface DataGeneratorConfig {
  volatility: number; // 0-1, higher = more volatile
  trend: 'bullish' | 'bearish' | 'sideways' | 'random';
  basePrice: number;
  priceRange?: [number, number]; // [min, max]
  includeNoise: boolean;
  eventProbability?: number; // 0-1, probability of sudden price movements
}

/**
 * Backtest result
 */
export interface BacktestResult {
  startDate: Date;
  endDate: Date;
  duration: number; // milliseconds
  initialBalance: number;
  finalBalance: number;
  totalReturn: number; // percentage
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // percentage
  maxDrawdown: number; // percentage
  sharpeRatio: number;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
  metrics: BacktestMetrics;
}

/**
 * Backtest trade record
 */
export interface BacktestTrade {
  timestamp: Date;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  value: number;
  fee: number;
  profitLoss?: number;
  profitLossPercentage?: number;
  balance: number;
  reason?: string;
}

/**
 * Equity curve point
 */
export interface EquityPoint {
  timestamp: Date;
  balance: number;
  portfolioValue: number;
  drawdown: number; // percentage from peak
}

/**
 * Backtest metrics
 */
export interface BacktestMetrics {
  totalProfitLoss: number;
  averageProfitPerTrade: number;
  averageLossPerTrade: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  profitFactor: number; // gross profit / gross loss
  expectancy: number; // average profit per trade
  averageHoldingTime: number; // milliseconds
}

/**
 * Virtual portfolio for paper trading
 */
export interface VirtualPortfolio {
  userId: string;
  balance: number;
  positions: Map<string, VirtualPosition>;
  totalValue: number;
  currency: string;
  trades: BacktestTrade[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Virtual position
 */
export interface VirtualPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  value: number;
  profitLoss: number;
  profitLossPercentage: number;
  openedAt: Date;
}

/**
 * Backtest Engine
 * Provides backtesting and paper trading capabilities using historical or generated data
 */
export class BacktestEngine extends EventEmitter {
  private logger: Logger;
  private virtualPortfolios: Map<string, VirtualPortfolio>;
  private marketDataCache: Map<string, MarketDataPoint[]>;

  constructor() {
    super();
    this.logger = new Logger('BacktestEngine');
    this.virtualPortfolios = new Map();
    this.marketDataCache = new Map();
  }

  /**
   * Run backtest with strategy
   */
  async runBacktest(
    config: BacktestConfig,
    strategyExecutor: (data: MarketDataPoint[]) => Promise<BacktestTrade[]>
  ): Promise<BacktestResult> {
    this.logger.info(
      `Starting backtest from ${config.startDate.toISOString()} to ${config.endDate.toISOString()}`
    );

    const startTime = Date.now();

    // Generate or load market data
    const marketData = await this.getMarketData(config);

    this.logger.info(`Loaded ${marketData.length} data points for backtest`);

    // Initialize portfolio
    let balance = config.initialBalance;
    const trades: BacktestTrade[] = [];
    const equityCurve: EquityPoint[] = [];
    let peak = balance;

    // Execute strategy on historical data
    const strategyTrades = await strategyExecutor(marketData);

    // Process trades and calculate metrics
    for (const trade of strategyTrades) {
      balance += trade.profitLoss || 0;
      
      // Update peak and calculate drawdown
      if (balance > peak) {
        peak = balance;
      }
      const drawdown = ((peak - balance) / peak) * 100;

      equityCurve.push({
        timestamp: trade.timestamp,
        balance,
        portfolioValue: balance,
        drawdown
      });

      trades.push({
        ...trade,
        balance
      });
    }

    // Calculate final metrics
    const metrics = this.calculateMetrics(trades, config.initialBalance, balance);
    const duration = Date.now() - startTime;

    const result: BacktestResult = {
      startDate: config.startDate,
      endDate: config.endDate,
      duration,
      initialBalance: config.initialBalance,
      finalBalance: balance,
      totalReturn: ((balance - config.initialBalance) / config.initialBalance) * 100,
      totalTrades: trades.length,
      winningTrades: trades.filter(t => (t.profitLoss || 0) > 0).length,
      losingTrades: trades.filter(t => (t.profitLoss || 0) < 0).length,
      winRate: (trades.filter(t => (t.profitLoss || 0) > 0).length / trades.length) * 100,
      maxDrawdown: Math.max(...equityCurve.map(e => e.drawdown)),
      sharpeRatio: this.calculateSharpeRatio(equityCurve),
      trades,
      equityCurve,
      metrics
    };

    this.logger.info(
      `Backtest completed: ${result.totalTrades} trades, ` +
      `${result.totalReturn.toFixed(2)}% return, ` +
      `${result.winRate.toFixed(2)}% win rate`
    );

    this.emit('backtestCompleted', result);

    return result;
  }

  /**
   * Get market data for backtesting
   */
  private async getMarketData(config: BacktestConfig): Promise<MarketDataPoint[]> {
    const cacheKey = `${config.symbols.join(',')}_${config.interval}_${config.dataSource}`;

    // Check cache
    if (this.marketDataCache.has(cacheKey)) {
      this.logger.info('Using cached market data');
      return this.marketDataCache.get(cacheKey)!;
    }

    let data: MarketDataPoint[];

    switch (config.dataSource) {
      case 'generated':
        data = this.generateMarketData(config);
        break;
      case 'replay':
        data = config.replayData || [];
        break;
      case 'historical':
        // TODO: Implement historical data loading from database or API
        this.logger.warn('Historical data loading not implemented, using generated data');
        data = this.generateMarketData(config);
        break;
      default:
        throw new Error(`Unknown data source: ${config.dataSource}`);
    }

    // Cache data
    this.marketDataCache.set(cacheKey, data);

    return data;
  }

  /**
   * Generate synthetic market data
   */
  private generateMarketData(config: BacktestConfig): MarketDataPoint[] {
    const data: MarketDataPoint[] = [];
    const generatorConfig = config.generatorConfig || {
      volatility: 0.02,
      trend: 'sideways',
      basePrice: 100,
      includeNoise: true
    };

    const intervalMs = this.getIntervalMs(config.interval);
    let currentTime = config.startDate.getTime();
    const endTime = config.endDate.getTime();

    let currentPrice = generatorConfig.basePrice;
    const volatility = generatorConfig.volatility;

    this.logger.info(
      `Generating market data with ${generatorConfig.trend} trend, ` +
      `volatility ${volatility}, base price ${currentPrice}`
    );

    while (currentTime <= endTime) {
      // Calculate price movement based on trend
      let trendFactor = 0;
      switch (generatorConfig.trend) {
        case 'bullish':
          trendFactor = 0.0001; // Slight upward bias
          break;
        case 'bearish':
          trendFactor = -0.0001; // Slight downward bias
          break;
        case 'sideways':
          trendFactor = 0;
          break;
        case 'random':
          trendFactor = (Math.random() - 0.5) * 0.0002;
          break;
      }

      // Add volatility
      const randomChange = (Math.random() - 0.5) * volatility;
      const priceChange = currentPrice * (trendFactor + randomChange);
      
      // Add occasional events (spikes)
      if (generatorConfig.eventProbability && Math.random() < generatorConfig.eventProbability) {
        const eventMagnitude = (Math.random() - 0.5) * volatility * 5;
        currentPrice += currentPrice * eventMagnitude;
      } else {
        currentPrice += priceChange;
      }

      // Ensure price stays within range if specified
      if (generatorConfig.priceRange) {
        currentPrice = Math.max(
          generatorConfig.priceRange[0],
          Math.min(generatorConfig.priceRange[1], currentPrice)
        );
      }

      // Generate OHLC data
      const open = currentPrice;
      const high = currentPrice * (1 + Math.random() * volatility * 0.5);
      const low = currentPrice * (1 - Math.random() * volatility * 0.5);
      const close = low + Math.random() * (high - low);
      const volume = 1000000 + Math.random() * 5000000;

      for (const symbol of config.symbols) {
        data.push({
          timestamp: new Date(currentTime),
          symbol,
          open,
          high,
          low,
          close,
          volume,
          source: 'generated'
        });
      }

      currentPrice = close;
      currentTime += intervalMs;
    }

    this.logger.info(`Generated ${data.length} market data points`);

    return data;
  }

  /**
   * Create virtual portfolio for paper trading
   */
  createVirtualPortfolio(
    userId: string,
    initialBalance: number,
    currency: string = 'USDT'
  ): VirtualPortfolio {
    const portfolio: VirtualPortfolio = {
      userId,
      balance: initialBalance,
      positions: new Map(),
      totalValue: initialBalance,
      currency,
      trades: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.virtualPortfolios.set(userId, portfolio);

    this.logger.info(
      `Created virtual portfolio for user ${userId} with ${initialBalance} ${currency}`
    );

    return portfolio;
  }

  /**
   * Execute simulated trade
   */
  executeSimulatedTrade(
    userId: string,
    symbol: string,
    side: 'buy' | 'sell',
    quantity: number,
    price: number,
    feeRate: number = 0.001
  ): BacktestTrade {
    const portfolio = this.virtualPortfolios.get(userId);
    if (!portfolio) {
      throw new Error(`Virtual portfolio not found for user ${userId}`);
    }

    const value = quantity * price;
    const fee = value * feeRate;
    let profitLoss = 0;
    let profitLossPercentage = 0;

    if (side === 'buy') {
      // Check if sufficient balance
      if (portfolio.balance < value + fee) {
        throw new Error('Insufficient balance for simulated trade');
      }

      // Deduct from balance
      portfolio.balance -= (value + fee);

      // Add or update position
      const existingPosition = portfolio.positions.get(symbol);
      if (existingPosition) {
        const totalQuantity = existingPosition.quantity + quantity;
        const totalCost = (existingPosition.averagePrice * existingPosition.quantity) + value;
        existingPosition.quantity = totalQuantity;
        existingPosition.averagePrice = totalCost / totalQuantity;
        existingPosition.currentPrice = price;
      } else {
        portfolio.positions.set(symbol, {
          symbol,
          quantity,
          averagePrice: price,
          currentPrice: price,
          value,
          profitLoss: 0,
          profitLossPercentage: 0,
          openedAt: new Date()
        });
      }

    } else { // sell
      const position = portfolio.positions.get(symbol);
      if (!position || position.quantity < quantity) {
        throw new Error('Insufficient position for simulated trade');
      }

      // Calculate P&L
      profitLoss = (price - position.averagePrice) * quantity - fee;
      profitLossPercentage = ((price - position.averagePrice) / position.averagePrice) * 100;

      // Add to balance
      portfolio.balance += (value - fee);

      // Update or remove position
      position.quantity -= quantity;
      if (position.quantity === 0) {
        portfolio.positions.delete(symbol);
      } else {
        position.currentPrice = price;
      }
    }

    // Update portfolio value
    portfolio.totalValue = portfolio.balance;
    for (const position of portfolio.positions.values()) {
      portfolio.totalValue += position.quantity * position.currentPrice;
    }

    portfolio.updatedAt = new Date();

    // Record trade
    const trade: BacktestTrade = {
      timestamp: new Date(),
      symbol,
      side,
      price,
      quantity,
      value,
      fee,
      profitLoss,
      profitLossPercentage,
      balance: portfolio.balance,
      reason: 'simulated'
    };

    portfolio.trades.push(trade);

    this.logger.info(
      `Simulated ${side} trade: ${quantity} ${symbol} @ ${price}, ` +
      `P&L: ${profitLoss.toFixed(2)} (${profitLossPercentage.toFixed(2)}%)`
    );

    this.emit('simulatedTrade', { userId, trade });

    return trade;
  }

  /**
   * Get virtual portfolio
   */
  getVirtualPortfolio(userId: string): VirtualPortfolio | undefined {
    return this.virtualPortfolios.get(userId);
  }

  /**
   * Update position prices with current market data
   */
  updatePortfolioPrices(userId: string, marketData: Map<string, number>): void {
    const portfolio = this.virtualPortfolios.get(userId);
    if (!portfolio) return;

    for (const [symbol, position] of portfolio.positions.entries()) {
      const currentPrice = marketData.get(symbol);
      if (currentPrice) {
        position.currentPrice = currentPrice;
        position.value = position.quantity * currentPrice;
        position.profitLoss = (currentPrice - position.averagePrice) * position.quantity;
        position.profitLossPercentage = ((currentPrice - position.averagePrice) / position.averagePrice) * 100;
      }
    }

    // Update total value
    portfolio.totalValue = portfolio.balance;
    for (const position of portfolio.positions.values()) {
      portfolio.totalValue += position.value;
    }

    portfolio.updatedAt = new Date();
  }

  /**
   * Calculate backtest metrics
   */
  private calculateMetrics(
    trades: BacktestTrade[],
    initialBalance: number,
    finalBalance: number
  ): BacktestMetrics {
    const winningTrades = trades.filter(t => (t.profitLoss || 0) > 0);
    const losingTrades = trades.filter(t => (t.profitLoss || 0) < 0);

    const totalProfit = winningTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0));

    return {
      totalProfitLoss: finalBalance - initialBalance,
      averageProfitPerTrade: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
      averageLossPerTrade: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.profitLoss || 0)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.profitLoss || 0)) : 0,
      consecutiveWins: this.calculateMaxConsecutive(trades, true),
      consecutiveLosses: this.calculateMaxConsecutive(trades, false),
      profitFactor: totalLoss > 0 ? totalProfit / totalLoss : 0,
      expectancy: trades.length > 0 ? (finalBalance - initialBalance) / trades.length : 0,
      averageHoldingTime: 0 // TODO: Calculate from trade timestamps
    };
  }

  /**
   * Calculate maximum consecutive wins or losses
   */
  private calculateMaxConsecutive(trades: BacktestTrade[], wins: boolean): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const trade of trades) {
      const isWin = (trade.profitLoss || 0) > 0;
      if (isWin === wins) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(equityCurve: EquityPoint[]): number {
    if (equityCurve.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const returnPct = (equityCurve[i].balance - equityCurve[i - 1].balance) / equityCurve[i - 1].balance;
      returns.push(returnPct);
    }

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Assuming risk-free rate of 0 for simplicity
    return stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
  }

  /**
   * Get interval in milliseconds
   */
  private getIntervalMs(interval: string): number {
    const intervals: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };
    return intervals[interval] || 60 * 1000;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.marketDataCache.clear();
    this.logger.info('Cleared market data cache');
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalPortfolios: number;
    totalTrades: number;
    cachedDataSets: number;
  } {
    let totalTrades = 0;
    for (const portfolio of this.virtualPortfolios.values()) {
      totalTrades += portfolio.trades.length;
    }

    return {
      totalPortfolios: this.virtualPortfolios.size,
      totalTrades,
      cachedDataSets: this.marketDataCache.size
    };
  }
}
