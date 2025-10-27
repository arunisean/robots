/**
 * Grid Trading Strategy Test
 * 
 * This script demonstrates the complete Grid Trading strategy using:
 * - BacktestEngine for market data generation
 * - GridCalculatorAgent for signal generation
 * - MockPriceMonitorAgent for price monitoring
 * - MockTradeExecutorAgent for trade execution
 * - TradeVerifierAgent for verification
 * - PaperTradingWrapper for simulated trading
 */

import { BacktestEngine, BacktestConfig, MarketDataPoint } from './services/BacktestEngine';
import { PaperTradingWrapper } from './services/PaperTradingWrapper';
import { GridCalculatorAgent } from './agents/analyze/GridCalculatorAgent';
import { MockPriceMonitorAgent } from './agents/monitor/MockPriceMonitorAgent';
import { MockTradeExecutorAgent } from './agents/execute/MockTradeExecutorAgent';
import { TradeVerifierAgent } from './agents/verify/TradeVerifierAgent';
import { GridTradingTemplate, createGridTradingWorkflow } from './templates/GridTradingTemplate';

/**
 * Run Grid Trading backtest
 */
async function runGridTradingBacktest() {
  console.log('='.repeat(80));
  console.log('GRID TRADING STRATEGY BACKTEST');
  console.log('='.repeat(80));
  console.log();

  // Initialize backtest engine
  const backtestEngine = new BacktestEngine();
  
  // Configure backtest
  const backtestConfig: BacktestConfig = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    symbols: ['BTC/USDT'],
    interval: '1h',
    initialBalance: 10000,
    currency: 'USDT',
    dataSource: 'generated',
    generatorConfig: {
      volatility: 0.03, // 3% volatility
      trend: 'sideways', // Perfect for grid trading
      basePrice: 30000,
      priceRange: [28000, 32000],
      includeNoise: true,
      eventProbability: 0.05 // 5% chance of sudden moves
    }
  };

  console.log('📊 Backtest Configuration:');
  console.log(`   Period: ${backtestConfig.startDate.toISOString().split('T')[0]} to ${backtestConfig.endDate.toISOString().split('T')[0]}`);
  console.log(`   Symbol: ${backtestConfig.symbols[0]}`);
  console.log(`   Interval: ${backtestConfig.interval}`);
  console.log(`   Initial Balance: $${backtestConfig.initialBalance}`);
  console.log(`   Market: ${backtestConfig.generatorConfig?.trend} (${backtestConfig.generatorConfig?.volatility! * 100}% volatility)`);
  console.log();

  // Grid Trading parameters
  const gridParams = {
    tradingPair: 'BTC/USDT',
    lowerBound: 28000,
    upperBound: 32000,
    gridCount: 10,
    investmentPerGrid: 500,
    checkInterval: 3600 // 1 hour
  };

  console.log('🎯 Grid Trading Parameters:');
  console.log(`   Price Range: $${gridParams.lowerBound} - $${gridParams.upperBound}`);
  console.log(`   Grid Count: ${gridParams.gridCount}`);
  console.log(`   Investment per Grid: $${gridParams.investmentPerGrid}`);
  console.log(`   Grid Spacing: $${(gridParams.upperBound - gridParams.lowerBound) / gridParams.gridCount}`);
  console.log();

  // Initialize agents
  const userId = 'test-user-1';
  const paperTrading = new PaperTradingWrapper(backtestEngine, userId, 0.001);
  await paperTrading.initialize(backtestConfig.initialBalance, backtestConfig.currency);

  const gridCalculator = new GridCalculatorAgent({ id: 'grid-calc-1' });
  const priceMonitor = new MockPriceMonitorAgent({ id: 'price-monitor-1', symbol: 'BTC/USDT' }, backtestEngine);
  const tradeExecutor = new MockTradeExecutorAgent({ id: 'trade-exec-1' }, paperTrading);
  const tradeVerifier = new TradeVerifierAgent({ id: 'trade-verify-1' });

  await gridCalculator.initialize();
  await priceMonitor.initialize();
  await tradeExecutor.initialize();
  await tradeVerifier.initialize();

  console.log('✅ Agents initialized');
  console.log();

  // Run backtest
  console.log('🚀 Starting backtest...');
  console.log();

  const result = await backtestEngine.runBacktest(backtestConfig, async (marketData: MarketDataPoint[]) => {
    const trades: any[] = [];
    
    console.log(`📈 Processing ${marketData.length} data points...`);
    
    let executionCount = 0;
    
    for (const dataPoint of marketData) {
      // Monitor: Get current price
      const monitorOutput = await priceMonitor.execute({
        data: { marketData: dataPoint },
        metadata: {
          source: 'backtest',
          timestamp: dataPoint.timestamp,
          version: '1.0',
          format: 'json'
        },
        context: {
          userId,
          executionId: `exec-${Date.now()}`,
          environment: 'development',
          resources: {
            memory: 512,
            cpu: 1,
            timeout: 30,
            storage: 100
          }
        }
      });

      if (monitorOutput.status !== 'success') {
        continue;
      }

      // Analyze: Calculate grid levels and signals
      const analyzeOutput = await gridCalculator.execute({
        data: {
          ...gridParams,
          currentPrice: monitorOutput.data.currentPrice
        },
        metadata: {
          source: 'monitor',
          timestamp: dataPoint.timestamp,
          version: '1.0',
          format: 'json'
        },
        context: {
          userId,
          executionId: `exec-${Date.now()}`,
          environment: 'development',
          resources: {
            memory: 512,
            cpu: 1,
            timeout: 30,
            storage: 100
          }
        }
      });

      if (analyzeOutput.status !== 'success') {
        continue;
      }

      // Check if we should execute
      const signal = analyzeOutput.data.signal;
      const outOfRange = analyzeOutput.data.outOfRange;

      if (signal.action !== 'none' && !outOfRange.isOutOfRange) {
        executionCount++;
        
        // Execute: Place order
        const executeOutput = await tradeExecutor.execute({
          data: {
            ...analyzeOutput.data,
            symbol: gridParams.tradingPair
          },
          metadata: {
            source: 'analyze',
            timestamp: dataPoint.timestamp,
            version: '1.0',
            format: 'json'
          },
          context: {
            userId,
            executionId: `exec-${Date.now()}`,
            environment: 'development',
            resources: {
              memory: 512,
              cpu: 1,
              timeout: 30,
              storage: 100
            }
          }
        });

        if (executeOutput.status === 'success') {
          // Verify: Confirm execution
          const verifyOutput = await tradeVerifier.execute({
            data: executeOutput.data,
            metadata: {
              source: 'execute',
              timestamp: dataPoint.timestamp,
              version: '1.0',
              format: 'json'
            },
            context: {
              userId,
              executionId: `exec-${Date.now()}`,
              environment: 'development',
              resources: {
                memory: 512,
                cpu: 1,
                timeout: 30,
                storage: 100
              }
            }
          });

          // Record trade for backtest
          if (verifyOutput.data.verified) {
            trades.push({
              timestamp: dataPoint.timestamp,
              symbol: gridParams.tradingPair,
              side: signal.action,
              price: signal.price,
              quantity: signal.quantity,
              value: signal.price * signal.quantity,
              fee: signal.price * signal.quantity * 0.001,
              profitLoss: executeOutput.data.profitLoss || 0,
              profitLossPercentage: executeOutput.data.profitLossPercentage || 0,
              balance: executeOutput.data.portfolio?.balance || 0,
              reason: signal.reason
            });

            if (executionCount <= 5 || executionCount % 10 === 0) {
              console.log(`   [${dataPoint.timestamp.toISOString().split('T')[0]}] ${signal.action.toUpperCase()} ${signal.quantity.toFixed(6)} @ $${signal.price.toFixed(2)} | Grid Level ${signal.gridLevel}`);
            }
          }
        }
      }
    }

    console.log(`   Total executions: ${executionCount}`);
    console.log();

    return trades;
  });

  // Display results
  console.log('='.repeat(80));
  console.log('BACKTEST RESULTS');
  console.log('='.repeat(80));
  console.log();

  console.log('📊 Performance Summary:');
  console.log(`   Initial Balance: $${result.initialBalance.toFixed(2)}`);
  console.log(`   Final Balance: $${result.finalBalance.toFixed(2)}`);
  console.log(`   Total Return: ${result.totalReturn.toFixed(2)}%`);
  console.log(`   Total Trades: ${result.totalTrades}`);
  console.log(`   Winning Trades: ${result.winningTrades}`);
  console.log(`   Losing Trades: ${result.losingTrades}`);
  console.log(`   Win Rate: ${result.winRate.toFixed(2)}%`);
  console.log(`   Max Drawdown: ${result.maxDrawdown.toFixed(2)}%`);
  console.log(`   Sharpe Ratio: ${result.sharpeRatio.toFixed(2)}`);
  console.log();

  console.log('💰 Trade Metrics:');
  console.log(`   Total P&L: $${result.metrics.totalProfitLoss.toFixed(2)}`);
  console.log(`   Average Profit per Trade: $${result.metrics.averageProfitPerTrade.toFixed(2)}`);
  console.log(`   Average Loss per Trade: $${result.metrics.averageLossPerTrade.toFixed(2)}`);
  console.log(`   Largest Win: $${result.metrics.largestWin.toFixed(2)}`);
  console.log(`   Largest Loss: $${result.metrics.largestLoss.toFixed(2)}`);
  console.log(`   Profit Factor: ${result.metrics.profitFactor.toFixed(2)}`);
  console.log(`   Expectancy: $${result.metrics.expectancy.toFixed(2)}`);
  console.log();

  // Show recent trades
  if (result.trades.length > 0) {
    console.log('📝 Recent Trades (last 10):');
    const recentTrades = result.trades.slice(-10);
    for (const trade of recentTrades) {
      const pnlStr = trade.profitLoss 
        ? `P&L: $${trade.profitLoss.toFixed(2)} (${trade.profitLossPercentage?.toFixed(2)}%)`
        : '';
      console.log(`   ${trade.timestamp.toISOString().split('T')[0]} | ${trade.side.toUpperCase()} ${trade.quantity.toFixed(6)} @ $${trade.price.toFixed(2)} | ${pnlStr}`);
    }
    console.log();
  }

  // Get final portfolio state
  const portfolio = paperTrading.getPortfolio();
  if (portfolio) {
    console.log('💼 Final Portfolio:');
    console.log(`   Balance: $${portfolio.balance.toFixed(2)}`);
    console.log(`   Total Value: $${portfolio.totalValue.toFixed(2)}`);
    console.log(`   Open Positions: ${portfolio.positions.size}`);
    
    if (portfolio.positions.size > 0) {
      console.log();
      console.log('   Positions:');
      for (const [symbol, position] of portfolio.positions.entries()) {
        console.log(`     ${symbol}: ${position.quantity.toFixed(6)} @ $${position.averagePrice.toFixed(2)} | Current: $${position.currentPrice.toFixed(2)} | P&L: $${position.profitLoss.toFixed(2)} (${position.profitLossPercentage.toFixed(2)}%)`);
      }
    }
    console.log();
  }

  // Cleanup
  await gridCalculator.cleanup();
  await priceMonitor.cleanup();
  await tradeExecutor.cleanup();
  await tradeVerifier.cleanup();

  console.log('='.repeat(80));
  console.log('✅ Grid Trading backtest completed successfully!');
  console.log('='.repeat(80));
  console.log();

  // Evaluate strategy performance
  console.log('📈 Strategy Evaluation:');
  if (result.totalReturn > 0) {
    console.log(`   ✅ PROFITABLE: Strategy generated ${result.totalReturn.toFixed(2)}% return`);
  } else {
    console.log(`   ❌ LOSS: Strategy lost ${Math.abs(result.totalReturn).toFixed(2)}%`);
  }
  
  if (result.winRate > 50) {
    console.log(`   ✅ GOOD WIN RATE: ${result.winRate.toFixed(2)}% of trades were profitable`);
  } else {
    console.log(`   ⚠️  LOW WIN RATE: Only ${result.winRate.toFixed(2)}% of trades were profitable`);
  }
  
  if (result.maxDrawdown < 10) {
    console.log(`   ✅ LOW RISK: Maximum drawdown was only ${result.maxDrawdown.toFixed(2)}%`);
  } else {
    console.log(`   ⚠️  HIGH RISK: Maximum drawdown reached ${result.maxDrawdown.toFixed(2)}%`);
  }
  
  console.log();
  console.log('💡 Grid Trading works best in sideways/ranging markets with predictable volatility.');
  console.log('   This backtest used a sideways market, which is ideal for this strategy.');
  console.log();

  return result;
}

/**
 * Test Grid Trading template instantiation
 */
async function testTemplateInstantiation() {
  console.log('='.repeat(80));
  console.log('GRID TRADING TEMPLATE TEST');
  console.log('='.repeat(80));
  console.log();

  console.log('📋 Template Information:');
  console.log(`   Name: ${GridTradingTemplate.name}`);
  console.log(`   Category: ${GridTradingTemplate.category}`);
  console.log(`   Difficulty: ${GridTradingTemplate.difficulty}`);
  console.log(`   Risk Level: ${GridTradingTemplate.riskProfile.level}`);
  console.log(`   Required Capital: $${GridTradingTemplate.riskProfile.requiredCapital}`);
  console.log();

  console.log('⚙️  Parameters:');
  for (const param of GridTradingTemplate.parameters) {
    console.log(`   ${param.label}: ${param.defaultValue} ${param.unit || ''}`);
    console.log(`      ${param.description}`);
  }
  console.log();

  console.log('📊 Historical Performance:');
  if (GridTradingTemplate.performanceMetrics) {
    const perf = GridTradingTemplate.performanceMetrics;
    console.log(`   Period: ${perf.backtestPeriod}`);
    console.log(`   Total Return: ${perf.totalReturn}%`);
    console.log(`   Annualized Return: ${perf.annualizedReturn}%`);
    console.log(`   Win Rate: ${perf.winRate}%`);
    console.log(`   Max Drawdown: ${perf.maxDrawdown}%`);
    console.log(`   Sharpe Ratio: ${perf.sharpeRatio}`);
    console.log(`   Total Trades: ${perf.totalTrades}`);
  }
  console.log();

  // Test workflow instantiation
  const userParams = {
    tradingPair: 'ETH/USDT',
    lowerBound: 1800,
    upperBound: 2200,
    gridCount: 15,
    investmentPerGrid: 200,
    checkInterval: 300
  };

  console.log('🔧 Creating workflow with custom parameters:');
  console.log(`   Trading Pair: ${userParams.tradingPair}`);
  console.log(`   Price Range: $${userParams.lowerBound} - $${userParams.upperBound}`);
  console.log(`   Grid Count: ${userParams.gridCount}`);
  console.log(`   Investment per Grid: $${userParams.investmentPerGrid}`);
  console.log();

  const workflow = createGridTradingWorkflow(userParams);
  
  console.log('✅ Workflow created successfully!');
  console.log(`   Trigger: ${workflow.workflowDefinition.trigger.type} (every ${workflow.workflowDefinition.trigger.config.intervalSeconds}s)`);
  console.log(`   Monitor Agents: ${workflow.workflowDefinition.stages.monitor.agents.length}`);
  console.log(`   Analyze Agents: ${workflow.workflowDefinition.stages.analyze.agents.length}`);
  console.log(`   Execute Agents: ${workflow.workflowDefinition.stages.execute.agents.length}`);
  console.log(`   Decision Rules: ${workflow.workflowDefinition.stages.decision.rules.length}`);
  console.log();

  console.log('='.repeat(80));
  console.log();
}

/**
 * Main execution
 */
async function main() {
  try {
    // Test template instantiation
    await testTemplateInstantiation();
    
    // Run backtest
    await runGridTradingBacktest();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runGridTradingBacktest, testTemplateInstantiation };
