import { AgentConfig, AgentInput, AgentOutput, AgentCategory } from './agent';
import { MarketData } from './monitor-agent';

// Analyze Agent - Generates trading signals and analyzes market data

// Analysis types for trading
export enum AnalysisType {
  TECHNICAL_ANALYSIS = 'technical_analysis',
  ARBITRAGE_DETECTION = 'arbitrage_detection',
  PATTERN_RECOGNITION = 'pattern_recognition',
  RISK_ASSESSMENT = 'risk_assessment',
  PORTFOLIO_OPTIMIZATION = 'portfolio_optimization',
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
  ML_PREDICTION = 'ml_prediction'
}

// Technical indicators
export enum TechnicalIndicator {
  SMA = 'sma',           // Simple Moving Average
  EMA = 'ema',           // Exponential Moving Average
  RSI = 'rsi',           // Relative Strength Index
  MACD = 'macd',         // Moving Average Convergence Divergence
  BOLLINGER = 'bollinger', // Bollinger Bands
  STOCHASTIC = 'stochastic', // Stochastic Oscillator
  ATR = 'atr',           // Average True Range
  VOLUME = 'volume'      // Volume analysis
}

// Analysis rule configuration
export interface AnalysisRule {
  id: string;
  type: AnalysisType;
  name: string;
  config: AnalysisRuleConfig;
  weight?: number; // For weighted signal aggregation
}

// Configuration for different analysis types
export interface AnalysisRuleConfig {
  // Technical analysis configuration
  indicators?: {
    type: TechnicalIndicator;
    period?: number;
    params?: Record<string, any>;
  }[];
  
  // Arbitrage detection configuration
  minSpread?: number; // Minimum profit percentage
  maxSlippage?: number;
  includeFees?: boolean;
  includeGas?: boolean;
  
  // Pattern recognition configuration
  patterns?: ('head_shoulders' | 'double_top' | 'triangle' | 'flag')[];
  minConfidence?: number;
  
  // Risk assessment configuration
  maxDrawdown?: number;
  volatilityThreshold?: number;
  correlationThreshold?: number;
  
  // ML prediction configuration
  modelId?: string;
  features?: string[];
  predictionHorizon?: number; // minutes
  
  // Common configuration
  [key: string]: any;
}

// Trading signal
export interface TradingSignal {
  action: 'buy' | 'sell' | 'hold';
  confidence: number; // 0 to 1
  strength: number; // 0 to 1
  price?: number;
  quantity?: number;
  reasoning: string;
  indicators?: Record<string, number>;
  timestamp: Date;
}

// Arbitrage opportunity
export interface ArbitrageOpportunity {
  buyExchange: string;
  sellExchange: string;
  symbol: string;
  buyPrice: number;
  sellPrice: number;
  spread: number; // percentage
  netProfit: number; // after fees and gas
  estimatedGas?: number;
  confidence: number;
  expiresAt: Date;
}

// Risk assessment result
export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  riskScore: number; // 0 to 100
  factors: RiskFactor[];
  recommendations: string[];
  maxPositionSize: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface RiskFactor {
  name: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: number; // 0 to 1
}

// Grid trading calculation
export interface GridCalculation {
  gridLevels: GridLevel[];
  currentPrice: number;
  currentGridIndex: number;
  nextBuyLevel?: number;
  nextSellLevel?: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

export interface GridLevel {
  price: number;
  action: 'buy' | 'sell';
  quantity: number;
  filled: boolean;
  orderId?: string;
}

// Analyze Agent configuration
export interface AnalyzeAgentConfig extends AgentConfig {
  category: AgentCategory.ANALYZE;
  analysisRules: AnalysisRule[];
  aggregationStrategy: 'first' | 'last' | 'average' | 'weighted' | 'consensus';
  minConfidence?: number; // Minimum confidence to generate signal
}

// Analyze Agent input
export interface AnalyzeAgentInput extends AgentInput {
  data: {
    marketData?: MarketData[];
    historicalData?: MarketData[];
    onChainData?: any;
    sentiment?: any;
    portfolio?: PortfolioState;
    [key: string]: any;
  };
}

// Portfolio state
export interface PortfolioState {
  totalValue: number;
  cash: number;
  positions: Position[];
  unrealizedPnL: number;
  realizedPnL: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  percentage: number; // of portfolio
}

// Analyze Agent output
export interface AnalyzeAgentOutput extends AgentOutput {
  data: {
    signal?: TradingSignal;
    arbitrageOpportunities?: ArbitrageOpportunity[];
    riskAssessment?: RiskAssessment;
    gridCalculation?: GridCalculation;
    predictions?: Prediction[];
    [key: string]: any;
  };
  metadata: {
    generatedAt: Date;
    processingTime: number;
    version: string;
    format: string;
    rulesApplied: string[];
    confidence: number;
  };
}

// Prediction result
export interface Prediction {
  target: string; // e.g., 'price', 'volume'
  value: number;
  confidence: number;
  horizon: number; // minutes
  timestamp: Date;
}

// Analysis summary
export interface AnalysisSummary {
  totalRules: number;
  rulesExecuted: number;
  signalsGenerated: number;
  averageConfidence: number;
  executionTime: number; // milliseconds
  errors: AnalysisError[];
}

export interface AnalysisError {
  rule: string;
  error: string;
  timestamp: Date;
}
