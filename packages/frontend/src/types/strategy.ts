/**
 * Strategy-related type definitions
 */

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  riskProfile: {
    level: 'low' | 'medium' | 'high';
    requiredCapital: number;
    maxLoss: number;
    maxPositionSize: number;
  };
  performanceMetrics?: {
    totalReturn: number;
    winRate: number;
    maxDrawdown: number;
    sharpeRatio: number;
    avgTradeReturn: number;
  };
  parameters: StrategyParameter[];
  workflow: any; // WorkflowDefinition from backend
  usageCount: number;
  activeUsers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StrategyParameter {
  key: string;
  label: string;
  description: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  defaultValue: any;
  unit?: string;
  validation: {
    required: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    options?: any[];
  };
}

export interface StrategyInstance {
  id: string;
  userId: string;
  templateId: string;
  workflowId: string;
  name: string;
  status: 'running' | 'stopped' | 'paused' | 'error';
  paperTrading: boolean;
  parameters: Record<string, any>;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfitLoss: number;
  winRate: number;
  currentDrawdown: number;
  maxDrawdown: number;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  errorMessage?: string;
}

export interface Trade {
  id: string;
  instanceId: string;
  timestamp: Date;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  fee: number;
  profitLoss?: number;
  status: 'completed' | 'pending' | 'failed';
  exchange: string;
  orderId: string;
}

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  currentDrawdown: number;
  recoveryFactor: number;
}

export interface PerformanceDataPoint {
  timestamp: Date;
  value: number;
}

export interface StrategyConfig {
  name: string;
  parameters: Record<string, any>;
  paperTrading: boolean;
}
