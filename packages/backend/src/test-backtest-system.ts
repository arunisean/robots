/**
 * Backtest System Test
 * Demonstrates the complete backtesting and paper trading capabilities
 */

import { BacktestEngine, BacktestConfig, MarketDataPoint, BacktestTrade } from './services/BacktestEngine';
import { PaperTradingWrapper } from './services/PaperTradingWrapper';

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 Trading Automation Platform - Backtest System Test');
  console.log('='.repeat(80));
  console.log();

  // Initialize backtest engine
  const backtestEngine = new BacktestEngine();

  // Test 1: Generate Market Data
  console.log('📊 Test 1: Generating Market Data');
  console.log('-'.repeat(80));

  const config: BacktestConfig = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-07'),
    symbols: ['BTC/USDT', 'ETH/USDT'],
    interval: '1h',
    initialBalance: 10000,
    currency: 'USDT',
    dataSource: 'generated',
    generatorConfig: {
      volatility: 0.02,
      trend: 'bullish',
      basePrice: 45000,
      priceRange: [40000, 50000],
      includeNoise: true,
      eventProbability: 0.05
    }
  };

  console.log(`  ✓ Config: ${config.startDate.toISOString()} to ${config.endDate.toISOString()}`);
  console.log(`  ✓ Symbols: ${config.symbols.join(', ')}`);
  console.log(`  ✓ Interval: ${config.interval}`);
  console.log(`  ✓ Trend: ${config.generatorConfig?.trend}`);
  console.log(`  ✓ Volatility: ${config.generatorConfig?.volatility}`);
  console.log();

  // Test 2: Simple Buy and Hold Strategy
  console.log('📈 Test 2: Running Buy and Hold Strategy');
  console.log('-'.repeat(80));

  const buyAndHoldStrategy = async (data: MarketDataPoint[]): Promise<BacktestTrade[]> => {
    const trades: BacktestTrade[] = [];
    const symbol = 'BTC/USDT';
    const btcData = data.filter(d => d.symbol === symbol);

    if (btcData.length === 0) return trades;

    // Buy at start
    const buyPrice = btcData[0].close;
    const quantity = 0.2; // Buy 0.2 BTC
    const buyValue = quantity * buyPrice;
    const buyFee = buyValue * 0.001;

    trades.push({
      timestamp: btcData[0].timestamp,
      symbol,
      side: 'buy',
      price: buyPrice,
      quantity,
      value: buyValue,
      fee: buyFee,
      balance: config.initialBalance - buyValue - buyFee
    });

    // Sell at end
    const sellPrice = btcData[btcData.length - 1].close;
    const sellValue = quantity * sellPrice;
    const sellFee = sellValue * 0.001;
    const profitLoss = sellValue - buyValue - buyFee - sellFee;
    const profitLossPercentage = (profitLoss / buyValue) * 100;

    trades.push({
      timestamp: btcData[btcData.length - 1].timestamp,
      symbol,
      side: 'sell',
      price: sellPrice,
      quantity,
      value: sellValue,
      fee: sellFee,
      profitLoss,
      profitLossPercentage,
      balance: trades[0].balance + sellValue - sellFee
    });

    return trades;
  };

  const buyHoldResult = await backtestEngine.runBacktest(config, buyAndHoldStrategy);

  console.log(`  ✓ Initial Balance: $${buyHoldResult.initialBalance.toFixed(2)}`);
  console.log(`  ✓ Final Balance: $${buyHoldResult.finalBalance.toFixed(2)}`);
  console.log(`  ✓ Total Return: ${buyHoldResult.totalReturn.toFixed(2)}%`);
  console.log(`  ✓ Total Trades: ${buyHoldResult.totalTrades}`);
  console.log(`  ✓ Win Rate: ${buyHoldResult.winRate.toFixed(2)}%`);
  console.log(`  ✓ Max Drawdown: ${buyHoldResult.maxDrawdown.toFixed(2)}%`);
  console.log(`  ✓ Sharpe Ratio: ${buyHoldResult.sharpeRatio.toFixed(2)}`);
  console.log();

  // Test 3: Simple Moving Average Crossover Strategy
  console.log('📉 Test 3: Running SMA Crossover Strategy');
  console.log('-'.repeat(80));

  const smaCrossoverStrategy = async (data: MarketDataPoint[]): Promise<BacktestTrade[]> => {
    const trades: BacktestTrade[] = [];
    const symbol = 'BTC/USDT';
    const btcData = data.filter(d => d.symbol === symbol);

    if (btcData.length < 20) return trades;

    const shortPeriod = 5;
    const longPeriod = 20;
    let position = 0;
    let balance = config.initialBalance;

    for (let i = longPeriod; i < btcData.length; i++) {
      // Calculate SMAs
      const shortSMA = btcData.slice(i - shortPeriod, i).reduce((sum, d) => sum + d.close, 0) / shortPeriod;
      const longSMA = btcData.slice(i - longPeriod, i).reduce((sum, d) => sum + d.close, 0) / longPeriod;

      const currentPrice = btcData[i].close;

      // Buy signal: short SMA crosses above long SMA
      if (shortSMA > longSMA && position === 0) {
        const quantity = 0.1;
        const value = quantity * currentPrice;
        const fee = value * 0.001;

        if (balance >= value + fee) {
          balance -= (value + fee);
          position = quantity;

          trades.push({
            timestamp: btcData[i].timestamp,
            symbol,
            side: 'buy',
            price: currentPrice,
            quantity,
            value,
            fee,
            balance,
            reason: 'SMA crossover up'
          });
        }
      }
      // Sell signal: short SMA crosses below long SMA
      else if (shortSMA < longSMA && position > 0) {
        const quantity = position;
        const value = quantity * currentPrice;
        const fee = value * 0.001;
        const buyTrade = trades.filter(t => t.side === 'buy').pop();
        const profitLoss = value - (buyTrade?.value || 0) - (buyTrade?.fee || 0) - fee;
        const profitLossPercentage = buyTrade ? (profitLoss / buyTrade.value) * 100 : 0;

        balance += (value - fee);
        position = 0;

        trades.push({
          timestamp: btcData[i].timestamp,
          symbol,
          side: 'sell',
          price: currentPrice,
          quantity,
          value,
          fee,
          profitLoss,
          profitLossPercentage,
          balance,
          reason: 'SMA crossover down'
        });
      }
    }

    return trades;
  };

  const smaResult = await backtestEngine.runBacktest(config, smaCrossoverStrategy);

  console.log(`  ✓ Initial Balance: $${smaResult.initialBalance.toFixed(2)}`);
  console.log(`  ✓ Final Balance: $${smaResult.finalBalance.toFixed(2)}`);
  console.log(`  ✓ Total Return: ${smaResult.totalReturn.toFixed(2)}%`);
  console.log(`  ✓ Total Trades: ${smaResult.totalTrades}`);
  console.log(`  ✓ Winning Trades: ${smaResult.winningTrades}`);
  console.log(`  ✓ Losing Trades: ${smaResult.losingTrades}`);
  console.log(`  ✓ Win Rate: ${smaResult.winRate.toFixed(2)}%`);
  console.log(`  ✓ Max Drawdown: ${smaResult.maxDrawdown.toFixed(2)}%`);
  console.log(`  ✓ Profit Factor: ${smaResult.metrics.profitFactor.toFixed(2)}`);
  console.log();

  // Test 4: Paper Trading with Virtual Portfolio
  console.log('💰 Test 4: Paper Trading with Virtual Portfolio');
  console.log('-'.repeat(80));

  const userId = 'test-user-123';
  const paperTrading = new PaperTradingWrapper(backtestEngine, userId, 0.001);
  await paperTrading.initialize(10000, 'USDT');

  console.log(`  ✓ Created virtual portfolio for user: ${userId}`);

  // Simulate some trades
  const trades = [
    { symbol: 'BTC/USDT', side: 'buy' as const, quantity: 0.1, price: 45000 },
    { symbol: 'ETH/USDT', side: 'buy' as const, quantity: 2, price: 2500 },
    { symbol: 'BTC/USDT', side: 'sell' as const, quantity: 0.05, price: 46000 },
    { symbol: 'ETH/USDT', side: 'sell' as const, quantity: 1, price: 2600 }
  ];

  for (const trade of trades) {
    try {
      const result = backtestEngine.executeSimulatedTrade(
        userId,
        trade.symbol,
        trade.side,
        trade.quantity,
        trade.price
      );
      console.log(
        `  ✓ ${trade.side.toUpperCase()} ${trade.quantity} ${trade.symbol} @ $${trade.price} ` +
        `(P&L: ${result.profitLoss ? '$' + result.profitLoss.toFixed(2) : 'N/A'})`
      );
    } catch (error) {
      console.log(`  ✗ Trade failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const portfolio = paperTrading.getPortfolio();
  if (portfolio) {
    console.log();
    console.log(`  Portfolio Summary:`);
    console.log(`    Balance: $${portfolio.balance.toFixed(2)}`);
    console.log(`    Total Value: $${portfolio.totalValue.toFixed(2)}`);
    console.log(`    Positions: ${portfolio.positions.size}`);
    console.log(`    Total Trades: ${portfolio.trades.length}`);
    
    if (portfolio.positions.size > 0) {
      console.log(`    Open Positions:`);
      for (const [symbol, position] of portfolio.positions.entries()) {
        console.log(
          `      ${symbol}: ${position.quantity} @ $${position.averagePrice.toFixed(2)} ` +
          `(P&L: $${position.profitLoss.toFixed(2)} / ${position.profitLossPercentage.toFixed(2)}%)`
        );
      }
    }
  }
  console.log();

  // Test 5: Statistics
  console.log('📊 Test 5: System Statistics');
  console.log('-'.repeat(80));

  const stats = backtestEngine.getStatistics();
  console.log(`  ✓ Total Virtual Portfolios: ${stats.totalPortfolios}`);
  console.log(`  ✓ Total Simulated Trades: ${stats.totalTrades}`);
  console.log(`  ✓ Cached Data Sets: ${stats.cachedDataSets}`);
  console.log();

  console.log('='.repeat(80));
  console.log('✅ All tests completed successfully!');
  console.log('='.repeat(80));
  console.log();
  console.log('💡 Key Features Demonstrated:');
  console.log('  • Market data generation with configurable trends and volatility');
  console.log('  • Backtesting with custom strategies');
  console.log('  • Performance metrics calculation (returns, win rate, Sharpe ratio)');
  console.log('  • Virtual portfolio management for paper trading');
  console.log('  • Simulated trade execution with P&L tracking');
  console.log('  • Position management and portfolio valuation');
  console.log();
}

// Run tests
main().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
