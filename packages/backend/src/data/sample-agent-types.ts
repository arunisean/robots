/**
 * Sample Agent Types for Development
 */

export const SAMPLE_AGENT_TYPES = [
  {
    id: 'grid-calculator',
    name: 'Grid Calculator',
    description: 'Calculates grid trading levels and generates trading signals',
    category: 'analyze',
    version: '1.0.0',
    author: 'platform',
    tags: ['grid', 'trading', 'analysis'],
    config: {
      parameters: [
        {
          key: 'lowerBound',
          label: 'Lower Price Bound',
          type: 'number',
          required: true
        },
        {
          key: 'upperBound', 
          label: 'Upper Price Bound',
          type: 'number',
          required: true
        },
        {
          key: 'gridCount',
          label: 'Number of Grids',
          type: 'number',
          required: true
        }
      ]
    }
  },
  {
    id: 'mock-price-monitor',
    name: 'Mock Price Monitor',
    description: 'Monitors prices using backtest data or mock generation',
    category: 'monitor',
    version: '1.0.0',
    author: 'platform',
    tags: ['price', 'monitor', 'mock'],
    config: {
      parameters: [
        {
          key: 'symbol',
          label: 'Trading Symbol',
          type: 'string',
          required: true
        }
      ]
    }
  },
  {
    id: 'mock-trade-executor',
    name: 'Mock Trade Executor',
    description: 'Executes trades in paper trading mode',
    category: 'execute',
    version: '1.0.0',
    author: 'platform',
    tags: ['trade', 'execute', 'mock'],
    config: {
      parameters: [
        {
          key: 'exchange',
          label: 'Exchange',
          type: 'string',
          required: true
        }
      ]
    }
  },
  {
    id: 'trade-verifier',
    name: 'Trade Verifier',
    description: 'Verifies trade execution and calculates profit/loss',
    category: 'verify',
    version: '1.0.0',
    author: 'platform',
    tags: ['verify', 'pnl', 'validation'],
    config: {
      parameters: []
    }
  }
];