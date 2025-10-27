import { 
  StrategyTemplate, 
  TemplateParameter, 
  StrategyRiskProfile as RiskProfile,
  RiskControlConfig,
  NotificationConfig,
  LoggingConfig
} from '@multi-agent-platform/shared';

/**
 * Grid Trading Strategy Template
 * 
 * A market-neutral strategy that profits from price oscillations within a defined range.
 * Places buy orders at lower grid levels and sell orders at upper grid levels.
 * 
 * Best for: Sideways/ranging markets with predictable volatility
 * Risk level: Medium
 */
export const GridTradingTemplate: StrategyTemplate = {
  id: 'grid-trading-v1',
  name: 'Grid Trading',
  description: 'Automated grid trading strategy that profits from price oscillations in a defined range. Places buy orders at lower levels and sell orders at upper levels.',
  category: 'grid',
  difficulty: 'beginner',
  
  parameters: [
    {
      key: 'tradingPair',
      label: 'Trading Pair',
      description: 'The cryptocurrency pair to trade (e.g., BTC/USDT, ETH/USDT)',
      type: 'string',
      defaultValue: 'BTC/USDT',
      validation: {
        required: true,
        pattern: '^[A-Z]+/[A-Z]+$'
      }
    },
    {
      key: 'lowerBound',
      label: 'Lower Price Bound',
      description: 'The lowest price level for the grid',
      type: 'number',
      defaultValue: 25000,
      validation: {
        required: true,
        min: 0
      },
      unit: 'USDT'
    },
    {
      key: 'upperBound',
      label: 'Upper Price Bound',
      description: 'The highest price level for the grid',
      type: 'number',
      defaultValue: 35000,
      validation: {
        required: true,
        min: 0
      },
      unit: 'USDT'
    },
    {
      key: 'gridCount',
      label: 'Number of Grids',
      description: 'How many grid levels to create between upper and lower bounds',
      type: 'number',
      defaultValue: 10,
      validation: {
        required: true,
        min: 2,
        max: 100
      }
    },
    {
      key: 'investmentPerGrid',
      label: 'Investment Per Grid',
      description: 'Amount to invest at each grid level',
      type: 'number',
      defaultValue: 100,
      validation: {
        required: true,
        min: 10
      },
      unit: 'USDT'
    },
    {
      key: 'checkInterval',
      label: 'Check Interval',
      description: 'How often to check prices and execute trades',
      type: 'number',
      defaultValue: 60,
      validation: {
        required: true,
        min: 10,
        max: 3600
      },
      unit: 'seconds'
    }
  ],
  
  workflowDefinition: {
    trigger: {
      type: 'schedule',
      config: {
        interval: 60000 // Will be overridden by checkInterval parameter (in milliseconds)
      }
    },
    
    stages: {
      monitor: {
        agents: [
          {
            id: 'price-monitor',
            type: 'MockPriceMonitor', // Will use backtest data
            config: {
              symbol: '{{tradingPair}}',
              source: 'backtest'
            }
          }
        ],
        executionMode: 'parallel',
        timeout: 30
      },
      
      analyze: {
        agents: [
          {
            id: 'grid-calculator',
            type: 'GridCalculator',
            config: {
              lowerBound: '{{lowerBound}}',
              upperBound: '{{upperBound}}',
              gridCount: '{{gridCount}}',
              investmentPerGrid: '{{investmentPerGrid}}'
            }
          }
        ],
        executionMode: 'sequential',
        aggregationStrategy: 'last'
      },
      
      decision: {
        rules: [
          {
            field: 'signal.action',
            operator: 'ne',
            value: 'none',
            description: 'Only execute when there is a buy or sell signal'
          },
          {
            field: 'outOfRange.isOutOfRange',
            operator: 'eq',
            value: false,
            description: 'Only execute when price is within configured range'
          }
        ],
        operator: 'AND'
      },
      
      execute: {
        agents: [
          {
            id: 'grid-trader',
            type: 'MockTradeExecutor', // Will use paper trading
            config: {
              exchange: 'backtest',
              orderType: 'limit'
            }
          }
        ],
        executionMode: 'sequential',
        requireConfirmation: false
      },
      
      verify: {
        agent: {
          id: 'trade-verifier',
          type: 'TradeVerifier',
          config: {
            checkExecution: true,
            calculatePnL: true
          }
        },
        failureAction: 'alert'
      }
    },
    
    settings: {
      paperTrading: true, // Default to paper trading
      riskControls: {
        maxLossPerTrade: 5, // 5% max loss per trade
        maxDailyLoss: 10, // 10% max daily loss
        maxPositionSize: 20, // 20% of portfolio per position
        maxConcurrentTrades: 5,
        cooldownPeriod: 300, // 5 minutes cooldown after loss
        stopLossEnabled: true,
        takeProfitEnabled: true
      },
      notifications: {
        enabled: true,
        channels: ['email', 'webhook'],
        events: ['trade_executed', 'risk_alert', 'strategy_stopped']
      },
      logging: {
        level: 'info',
        retention: 30,
        includeData: true
      }
    }
  },
  
  riskProfile: {
    level: 'medium',
    maxLossPerTrade: 5,
    maxDailyLoss: 10,
    maxPositionSize: 20,
    requiredCapital: 1000 // Minimum 1000 USDT recommended
  },
  
  performanceMetrics: {
    backtestPeriod: '2024-01-01 to 2024-03-31',
    totalReturn: 12.5,
    annualizedReturn: 50.0,
    winRate: 65.0,
    maxDrawdown: 8.5,
    sharpeRatio: 1.8,
    totalTrades: 156
  },
  
  tags: ['grid', 'range-trading', 'market-neutral', 'beginner-friendly'],
  authorId: 'platform',
  version: '1.0.0',
  published: true,
  featured: true,
  usageCount: 0,
  activeUsers: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

/**
 * Helper function to instantiate Grid Trading workflow with user parameters
 */
export function createGridTradingWorkflow(userParams: Record<string, any>) {
  const template = { ...GridTradingTemplate };
  
  // Replace template variables with user parameters
  const workflowDef = JSON.stringify(template.workflowDefinition);
  let instantiated = workflowDef;
  
  for (const [key, value] of Object.entries(userParams)) {
    const placeholder = `{{${key}}}`;
    instantiated = instantiated.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  template.workflowDefinition = JSON.parse(instantiated);
  
  // Update trigger interval if specified
  if (userParams.checkInterval) {
    template.workflowDefinition.trigger.config.interval = userParams.checkInterval * 1000; // Convert to milliseconds
  }
  
  return template;
}
