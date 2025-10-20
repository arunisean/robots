import { AgentConfig, AgentInput, AgentOutput, AgentCategory } from './agent';
import { OrderResult, SwapResult } from './execute-agent';

// Verify Agent - Validates execution results and monitors risk

// Verification types
export enum VerificationType {
  EXECUTION_CONFIRMATION = 'execution_confirmation',
  PNL_CALCULATION = 'pnl_calculation',
  RISK_CHECK = 'risk_check',
  PERFORMANCE_TRACKING = 'performance_tracking',
  ANOMALY_DETECTION = 'anomaly_detection',
  COMPLIANCE_CHECK = 'compliance_check'
}

// Verification rule configuration
export interface VerificationRule {
  id: string;
  type: VerificationType;
  name: string;
  config: VerificationRuleConfig;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// Configuration for different verification types
export interface VerificationRuleConfig {
  // Execution confirmation
  confirmationBlocks?: number;
  timeout?: number; // seconds
  
  // Risk checks
  maxLossPerTrade?: number; // percentage
  maxDailyLoss?: number; // percentage
  maxPositionSize?: number; // percentage of portfolio
  maxDrawdown?: number; // percentage
  
  // Performance tracking
  trackMetrics?: ('win_rate' | 'sharpe_ratio' | 'max_drawdown' | 'total_return')[];
  benchmarkSymbol?: string;
  
  // Anomaly detection
  priceDeviationThreshold?: number; // percentage
  volumeDeviationThreshold?: number; // percentage
  slippageThreshold?: number; // percentage
  
  // Compliance
  maxTradeSize?: number; // in USDT
  allowedAssets?: string[];
  restrictedCountries?: string[];
  
  [key: string]: any;
}

// Execution verification result
export interface ExecutionVerification {
  orderId: string;
  verified: boolean;
  status: 'confirmed' | 'pending' | 'failed' | 'timeout';
  confirmations?: number;
  expectedPrice?: number;
  actualPrice?: number;
  slippage?: number;
  issues: VerificationIssue[];
  timestamp: Date;
}

export interface VerificationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionRequired?: string;
}

// P&L calculation result
export interface PnLCalculation {
  symbol: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  returnPercentage: number;
  fees: number;
  netPnL: number;
  holdingPeriod?: number; // minutes
  timestamp: Date;
}

// Risk check result
export interface RiskCheckResult {
  passed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  checks: RiskCheck[];
  violations: RiskViolation[];
  recommendations: string[];
  actionRequired: 'none' | 'warning' | 'pause' | 'stop';
}

export interface RiskCheck {
  name: string;
  passed: boolean;
  value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface RiskViolation {
  rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  currentValue: number;
  threshold: number;
  action: 'alert' | 'pause' | 'stop';
  timestamp: Date;
}

// Performance metrics
export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // percentage
  totalReturn: number; // percentage
  totalPnL: number; // in USDT
  averagePnL: number;
  largestWin: number;
  largestLoss: number;
  maxDrawdown: number; // percentage
  sharpeRatio?: number;
  sortinoRatio?: number;
  profitFactor?: number;
  averageHoldingTime?: number; // minutes
  period: {
    start: Date;
    end: Date;
  };
}

// Anomaly detection result
export interface AnomalyDetection {
  detected: boolean;
  anomalies: Anomaly[];
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  timestamp: Date;
}

export interface Anomaly {
  type: 'price' | 'volume' | 'slippage' | 'gas' | 'timing';
  description: string;
  expectedValue: number;
  actualValue: number;
  deviation: number; // percentage
  severity: 'low' | 'medium' | 'high';
}

// Verify Agent configuration
export interface VerifyAgentConfig extends AgentConfig {
  category: AgentCategory.VERIFY;
  verificationRules: VerificationRule[];
  autoStop?: boolean; // Automatically stop strategy on critical issues
  notifyOnIssues?: boolean;
}

// Verify Agent input
export interface VerifyAgentInput extends AgentInput {
  data: {
    orders?: OrderResult[];
    swaps?: SwapResult[];
    expectedResults?: any;
    portfolio?: PortfolioSnapshot;
    [key: string]: any;
  };
}

export interface PortfolioSnapshot {
  totalValue: number;
  cash: number;
  positions: any[];
  timestamp: Date;
}

// Verify Agent output
export interface VerifyAgentOutput extends AgentOutput {
  data: {
    executionVerifications?: ExecutionVerification[];
    pnlCalculations?: PnLCalculation[];
    riskCheckResult?: RiskCheckResult;
    performanceMetrics?: PerformanceMetrics;
    anomalyDetection?: AnomalyDetection;
    overallStatus: 'success' | 'warning' | 'error' | 'critical';
    [key: string]: any;
  };
  metadata: {
    generatedAt: Date;
    processingTime: number;
    version: string;
    format: string;
    rulesApplied: string[];
    issuesFound: number;
    criticalIssues: number;
  };
}

// Verification summary
export interface VerificationSummary {
  totalVerifications: number;
  passedVerifications: number;
  failedVerifications: number;
  issuesFound: number;
  criticalIssues: number;
  executionTime: number; // milliseconds
  recommendations: string[];
}

// Alert configuration
export interface AlertConfig {
  enabled: boolean;
  channels: ('email' | 'sms' | 'webhook' | 'push')[];
  conditions: AlertCondition[];
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq';
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// Audit log entry
export interface AuditLogEntry {
  id: string;
  strategyId: string;
  executionId: string;
  eventType: 'trade' | 'risk_violation' | 'anomaly' | 'performance';
  severity: 'info' | 'warning' | 'error' | 'critical';
  details: Record<string, any>;
  timestamp: Date;
}
