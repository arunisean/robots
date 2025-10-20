import { z } from 'zod';

// Strategy template categories
export type StrategyCategory = 'arbitrage' | 'grid' | 'trend' | 'copy_trade' | 'defi';

// Strategy difficulty levels
export type StrategyDifficulty = 'beginner' | 'intermediate' | 'advanced';

// Strategy instance status
export type StrategyInstanceStatus = 'active' | 'paused' | 'stopped';

// Template parameter types
export type ParameterType = 'number' | 'string' | 'token_pair' | 'percentage' | 'address' | 'boolean';

// Template parameter definition
export interface TemplateParameter {
  key: string;
  label: string;
  description: string;
  type: ParameterType;
  defaultValue: any;
  validation: ParameterValidation;
  unit?: string; // e.g., "USDT", "%", "seconds"
  tooltip?: string;
}

// Parameter validation rules
export interface ParameterValidation {
  required: boolean;
  min?: number;
  max?: number;
  pattern?: string; // regex pattern
  options?: string[]; // for select/dropdown
  customValidator?: string; // name of custom validation function
}

// Risk profile for strategy
export interface RiskProfile {
  level: 'low' | 'medium' | 'high' | 'extreme';
  maxLossPerTrade: number; // percentage
  maxDailyLoss: number; // percentage
  maxPositionSize: number; // percentage of portfolio
  requiredCapital: number; // minimum in USDT
  description?: string;
}

// Historical performance metrics
export interface PerformanceMetrics {
  backtestPeriod: string; // e.g., "2023-01-01 to 2023-12-31"
  totalReturn: number; // percentage
  annualizedReturn: number; // percentage
  winRate: number; // percentage
  maxDrawdown: number; // percentage
  sharpeRatio: number;
  sortinoRatio?: number;
  profitFactor?: number;
  totalTrades: number;
  averageTradeReturn?: number;
  averageHoldingTime?: number; // minutes
}

// Trading workflow definition
export interface TradingWorkflowDefinition {
  trigger: TriggerConfig;
  stages: WorkflowStages;
  settings: TradingWorkflowSettings;
}

// Trigger configuration
export interface TriggerConfig {
  type: 'schedule' | 'price_alert' | 'on_chain_event' | 'manual';
  config: TriggerConfigDetails;
}

export interface TriggerConfigDetails {
  // Schedule trigger
  cron?: string;
  interval?: number; // milliseconds
  
  // Price alert trigger
  symbol?: string;
  condition?: 'above' | 'below' | 'crosses';
  price?: number;
  
  // On-chain event trigger
  contractAddress?: string;
  eventSignature?: string;
  
  [key: string]: any;
}

// Workflow stages
export interface WorkflowStages {
  monitor: MonitorStageConfig;
  analyze: AnalyzeStageConfig;
  decision: DecisionConfig;
  execute: ExecuteStageConfig;
  verify: VerifyStageConfig;
}

// Monitor stage configuration
export interface MonitorStageConfig {
  agents: any[]; // MonitorAgentConfig[]
  executionMode: 'parallel' | 'sequential';
  timeout: number; // seconds
  aggregationStrategy?: 'first' | 'last' | 'average' | 'median';
}

// Analyze stage configuration
export interface AnalyzeStageConfig {
  agents: any[]; // AnalyzeAgentConfig[]
  executionMode: 'parallel' | 'sequential';
  aggregationStrategy: 'first' | 'last' | 'average' | 'weighted' | 'consensus';
}

// Decision configuration
export interface DecisionConfig {
  rules: DecisionRule[];
  operator: 'AND' | 'OR';
}

// Decision rule
export interface DecisionRule {
  field: string; // path to value in analyze output, e.g., "signal.confidence"
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
  value: number | number[]; // single value or [min, max] for between
  description: string;
}

// Execute stage configuration
export interface ExecuteStageConfig {
  agents: any[]; // ExecuteAgentConfig[]
  executionMode: 'sequential'; // always sequential for trades
  requireConfirmation: boolean;
  maxRetries?: number;
  retryDelay?: number; // milliseconds
}

// Verify stage configuration
export interface VerifyStageConfig {
  agent: any; // VerifyAgentConfig
  failureAction: 'retry' | 'alert' | 'rollback' | 'stop';
  alertThresholds?: AlertThresholds;
}

export interface AlertThresholds {
  maxSlippage?: number; // percentage
  minConfirmations?: number;
  timeout?: number; // seconds
}

// Trading workflow settings
export interface TradingWorkflowSettings {
  paperTrading: boolean;
  riskControls: RiskControlConfig;
  notifications: NotificationConfig;
  logging: LoggingConfig;
}

// Risk control configuration
export interface RiskControlConfig {
  maxLossPerTrade: number; // percentage
  maxDailyLoss: number; // percentage
  maxPositionSize: number; // percentage
  maxConcurrentTrades: number;
  cooldownPeriod: number; // seconds after loss
  stopLossEnabled: boolean;
  takeProfitEnabled: boolean;
}

// Notification configuration
export interface NotificationConfig {
  enabled: boolean;
  channels: ('email' | 'sms' | 'webhook' | 'push')[];
  events: ('trade_executed' | 'risk_alert' | 'strategy_stopped' | 'daily_summary')[];
}

// Logging configuration
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  retention: number; // days
  includeData: boolean;
}

// Complete strategy template
export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: StrategyCategory;
  difficulty: StrategyDifficulty;
  
  // Configuration
  parameters: TemplateParameter[];
  workflowDefinition: TradingWorkflowDefinition;
  riskProfile: RiskProfile;
  performanceMetrics?: PerformanceMetrics;
  
  // Metadata
  tags: string[];
  authorId?: string;
  version: string;
  
  // Publishing
  published: boolean;
  featured: boolean;
  
  // Usage tracking
  usageCount: number;
  activeUsers: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// User strategy instance
export interface UserStrategyInstance {
  id: string;
  userId: string;
  templateId: string;
  workflowId: string;
  
  // Configuration
  name: string;
  parameters: Record<string, any>; // User's customized parameter values
  
  // Status
  status: StrategyInstanceStatus;
  paperTrading: boolean;
  
  // Performance tracking
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfitLoss: number;
  winRate: number; // percentage
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  startedAt?: Date;
  stoppedAt?: Date;
}

// Risk control event
export interface RiskControlEvent {
  id: string;
  userId: string;
  strategyInstanceId?: string;
  
  // Event details
  eventType: RiskEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  // Event data
  details: Record<string, any>;
  triggeredValue?: number;
  thresholdValue?: number;
  
  // Action taken
  actionTaken: 'alerted' | 'paused' | 'stopped';
  
  // Timestamp
  triggeredAt: Date;
}

export type RiskEventType = 
  | 'max_loss_per_trade'
  | 'max_daily_loss'
  | 'max_position_size'
  | 'max_drawdown'
  | 'insufficient_funds'
  | 'api_error'
  | 'execution_timeout'
  | 'anomaly_detected';

// Exchange credentials
export interface ExchangeCredentials {
  id: string;
  userId: string;
  
  // Exchange details
  exchangeName: string;
  
  // Encrypted credentials (stored encrypted in DB)
  apiKeyEncrypted: string;
  apiSecretEncrypted: string;
  passphraseEncrypted?: string;
  
  // Permissions
  permissions: string[];
  testnet: boolean;
  
  // Status
  isActive: boolean;
  lastValidatedAt?: Date;
  validationError?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Trade history record
export interface TradeHistoryRecord {
  id: string;
  userId: string;
  strategyInstanceId?: string;
  
  // Trade details
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop_loss' | 'take_profit' | 'stop_limit';
  
  // Quantities and prices
  quantity: number;
  price: number;
  averagePrice?: number;
  
  // Execution details
  platform: string;
  orderId?: string;
  transactionHash?: string; // For DEX trades
  
  // Status
  status: 'pending' | 'filled' | 'cancelled' | 'failed';
  
  // Costs and P&L
  commission: number;
  commissionAsset?: string;
  gasUsed?: number; // For DEX trades
  realizedPnl?: number;
  
  // Paper trading flag
  paperTrading: boolean;
  
  // Timestamps
  createdAt: Date;
  executedAt?: Date;
  updatedAt: Date;
}

// Portfolio snapshot
export interface PortfolioSnapshot {
  id: string;
  userId: string;
  strategyInstanceId?: string;
  
  // Portfolio state
  totalValue: number;
  cashBalance: number;
  positions: PortfolioPosition[];
  
  // P&L
  unrealizedPnl: number;
  realizedPnl: number;
  totalPnl: number;
  
  // Paper trading flag
  paperTrading: boolean;
  
  // Timestamp
  snapshotAt: Date;
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  percentage: number; // of portfolio
}

// Strategy performance metrics (daily aggregated)
export interface StrategyPerformanceMetrics {
  id: string;
  strategyInstanceId: string;
  
  // Date
  metricDate: Date;
  
  // Trading metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // percentage
  
  // P&L metrics
  dailyPnl: number;
  cumulativePnl: number;
  largestWin: number;
  largestLoss: number;
  
  // Risk metrics
  maxDrawdown: number; // percentage
  sharpeRatio?: number;
  
  // Volume
  totalVolume: number;
  totalFees: number;
  
  // Timestamp
  createdAt: Date;
}

// DTOs for API

// Create strategy template DTO
export interface CreateStrategyTemplateDto {
  name: string;
  description: string;
  category: StrategyCategory;
  difficulty: StrategyDifficulty;
  parameters: TemplateParameter[];
  workflowDefinition: TradingWorkflowDefinition;
  riskProfile: RiskProfile;
  performanceMetrics?: PerformanceMetrics;
  tags?: string[];
  version?: string;
}

// Update strategy template DTO
export interface UpdateStrategyTemplateDto {
  name?: string;
  description?: string;
  parameters?: TemplateParameter[];
  workflowDefinition?: TradingWorkflowDefinition;
  riskProfile?: RiskProfile;
  performanceMetrics?: PerformanceMetrics;
  tags?: string[];
  published?: boolean;
  featured?: boolean;
}

// Instantiate strategy DTO
export interface InstantiateStrategyDto {
  templateId: string;
  name: string;
  parameters: Record<string, any>;
  paperTrading?: boolean;
}

// Update strategy instance DTO
export interface UpdateStrategyInstanceDto {
  name?: string;
  parameters?: Record<string, any>;
  status?: StrategyInstanceStatus;
}

// Strategy template filters
export interface StrategyTemplateFilters {
  category?: StrategyCategory;
  difficulty?: StrategyDifficulty;
  tags?: string[];
  search?: string;
  published?: boolean;
  featured?: boolean;
  authorId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'usage_count' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

// Strategy instance filters
export interface StrategyInstanceFilters {
  userId?: string;
  templateId?: string;
  status?: StrategyInstanceStatus;
  paperTrading?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'last_executed_at' | 'total_profit_loss';
  sortOrder?: 'asc' | 'desc';
}

// Zod validation schemas

export const TemplateParameterSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string(),
  type: z.enum(['number', 'string', 'token_pair', 'percentage', 'address', 'boolean']),
  defaultValue: z.any(),
  validation: z.object({
    required: z.boolean(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    options: z.array(z.string()).optional(),
    customValidator: z.string().optional()
  }),
  unit: z.string().optional(),
  tooltip: z.string().optional()
});

export const RiskProfileSchema = z.object({
  level: z.enum(['low', 'medium', 'high', 'extreme']),
  maxLossPerTrade: z.number().min(0).max(100),
  maxDailyLoss: z.number().min(0).max(100),
  maxPositionSize: z.number().min(0).max(100),
  requiredCapital: z.number().min(0),
  description: z.string().optional()
});

export const PerformanceMetricsSchema = z.object({
  backtestPeriod: z.string(),
  totalReturn: z.number(),
  annualizedReturn: z.number(),
  winRate: z.number().min(0).max(100),
  maxDrawdown: z.number().min(0).max(100),
  sharpeRatio: z.number(),
  sortinoRatio: z.number().optional(),
  profitFactor: z.number().optional(),
  totalTrades: z.number().int().min(0),
  averageTradeReturn: z.number().optional(),
  averageHoldingTime: z.number().optional()
});

export const CreateStrategyTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string(),
  category: z.enum(['arbitrage', 'grid', 'trend', 'copy_trade', 'defi']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  parameters: z.array(TemplateParameterSchema),
  workflowDefinition: z.any(), // Complex nested structure
  riskProfile: RiskProfileSchema,
  performanceMetrics: PerformanceMetricsSchema.optional(),
  tags: z.array(z.string()).optional(),
  version: z.string().optional()
});

export const InstantiateStrategySchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1).max(255),
  parameters: z.record(z.any()),
  paperTrading: z.boolean().optional()
});

export const UpdateStrategyInstanceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parameters: z.record(z.any()).optional(),
  status: z.enum(['active', 'paused', 'stopped']).optional()
});
