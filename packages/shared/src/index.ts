// Export core types
export * from './types/agent';
export * from './types/agent-type';
export * from './types/user';

// Export new trading-focused agent types
export {
  MonitorDataSourceType
} from './types/monitor-agent';

export type {
  MonitorDataSource,
  MonitorDataSourceConfig,
  MarketData,
  OnChainData,
  Transaction,
  BlockchainEvent,
  GasPriceData,
  MonitorAgentConfig,
  MonitorAgentInput,
  MonitorAgentOutput,
  SentimentData,
  MonitorSummary,
  MonitorError
} from './types/monitor-agent';

export {
  AnalysisType,
  TechnicalIndicator
} from './types/analyze-agent';

export type {
  AnalysisRule,
  AnalysisRuleConfig,
  TradingSignal,
  ArbitrageOpportunity,
  RiskAssessment,
  RiskFactor,
  GridCalculation,
  GridLevel,
  AnalyzeAgentConfig,
  AnalyzeAgentInput,
  AnalyzeAgentOutput,
  PortfolioState,
  Position,
  Prediction,
  AnalysisSummary,
  AnalysisError
} from './types/analyze-agent';

export {
  ExecutionPlatform,
  OrderType,
  OrderSide,
  OrderStatus
} from './types/execute-agent';

export type {
  ExecutionAction,
  ExecutionActionConfig,
  OrderRequest,
  OrderResult,
  SwapRequest,
  SwapResult,
  PositionUpdate,
  ExecuteAgentConfig,
  ExecuteAgentInput,
  ExecuteAgentOutput,
  ExecutionError,
  PaperTradingState,
  PaperTrade,
  ExecutionSummary as TradeExecutionSummary,
  ExchangeCredentials,
  GasEstimation
} from './types/execute-agent';

export {
  VerificationType
} from './types/verify-agent';

export type {
  VerificationRule,
  VerificationRuleConfig,
  ExecutionVerification,
  VerificationIssue,
  PnLCalculation,
  RiskCheckResult,
  RiskCheck,
  RiskViolation,
  PerformanceMetrics,
  AnomalyDetection,
  Anomaly,
  VerifyAgentConfig,
  VerifyAgentInput,
  VerifyAgentOutput,
  VerificationSummary,
  AlertConfig,
  AlertCondition,
  AuditLogEntry
} from './types/verify-agent';

// Legacy exports for backward compatibility (deprecated)
// These will be removed in a future version
export {
  DataSourceType
} from './types/work-agent';

export type {
  DataSource,
  DataTarget,
  CollectedData,
  CollectionSummary,
  WorkAgentConfig,
  WorkAgentInput,
  WorkAgentOutput
} from './types/work-agent';

export {
  ProcessingType
} from './types/process-agent';

export type {
  ProcessingRule,
  ProcessedData,
  ProcessedContent,
  ProcessedMetadata,
  ProcessingSummary,
  QualityScore,
  LLMConfig,
  LLMUsage,
  ProcessAgentConfig,
  ProcessAgentInput,
  ProcessAgentOutput
} from './types/process-agent';

export {
  PublishPlatform
} from './types/publish-agent';

export type {
  PublishTarget,
  PublishContent,
  PublishResult,
  PublishSummary,
  PublishMetrics,
  ContentFormatting,
  PublishAgentConfig,
  PublishAgentInput,
  PublishAgentOutput
} from './types/publish-agent';

export {
  PublishStatus
} from './types/publish-agent';

export {
  ValidationType
} from './types/validate-agent';

export type {
  ValidationResult,
  ValidationScore,
  ValidationSummary,
  ValidateAgentConfig,
  ValidateAgentInput,
  ValidateAgentOutput
} from './types/validate-agent';

// Export strategy template types
export type {
  StrategyCategory,
  StrategyDifficulty,
  StrategyInstanceStatus,
  ParameterType,
  TemplateParameter,
  ParameterValidation,
  RiskProfile as StrategyRiskProfile,
  PerformanceMetrics as StrategyPerformanceMetrics,
  TradingWorkflowDefinition,
  TriggerConfig,
  TriggerConfigDetails,
  WorkflowStages,
  MonitorStageConfig,
  AnalyzeStageConfig,
  DecisionConfig,
  DecisionRule,
  ExecuteStageConfig,
  VerifyStageConfig,
  AlertThresholds,
  TradingWorkflowSettings,
  RiskControlConfig,
  NotificationConfig,
  LoggingConfig,
  StrategyTemplate,
  UserStrategyInstance,
  RiskControlEvent,
  RiskEventType,
  ExchangeCredentials as TradingExchangeCredentials,
  TradeHistoryRecord,
  PortfolioSnapshot,
  PortfolioPosition,
  StrategyPerformanceMetrics as StrategyDailyMetrics,
  CreateStrategyTemplateDto,
  UpdateStrategyTemplateDto,
  InstantiateStrategyDto,
  UpdateStrategyInstanceDto,
  StrategyTemplateFilters,
  StrategyInstanceFilters
} from './types/strategy-template';

export {
  TemplateParameterSchema,
  RiskProfileSchema,
  PerformanceMetricsSchema,
  CreateStrategyTemplateSchema,
  InstantiateStrategySchema,
  UpdateStrategyInstanceSchema
} from './types/strategy-template';

// Export workflow types
export type {
  WorkflowStatus,
  WorkflowExecutionStatus,
  WorkflowTriggerType,
  AgentExecutionStatus,
  WorkflowAgent,
  WorkflowDefinition,
  WorkflowConnection,
  WorkflowSettings,
  RetryPolicy,
  ErrorHandlingPolicy,
  LoggingPolicy,
  WorkflowMetadata,
  ChangelogEntry,
  WorkflowStats,
  Workflow,
  WorkflowExecution,
  AgentExecutionResult,
  AgentExecutionMetrics,
  ExecutionEvent,
  ExecutionEventType,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  ExecuteWorkflowDto,
  WorkflowFilters,
  ExecutionFilters,
  WorkflowTemplate,
  WorkflowValidationResult,
  WorkflowValidationError,
  DataFlowValidationResult,
  ExecutionOptions,
  ExecutionSummary
} from './types/workflow';

// Export backtest system types
export type {
  MarketType,
  KlineInterval,
  MarketDataPoint,
  HistoricalDataset,
  PublicDatasetInfo,
  DatasetFilters,
  DownloadRequest,
  DownloadJob,
  DownloadStatus,
  DataAvailability,
  VerificationResult,
  StorageStats,
  BacktestConfig,
  DataGeneratorConfig,
  BacktestRequest,
  BacktestJob,
  BacktestTrade,
  EquityPoint,
  BacktestMetrics,
  BacktestResult,
  OptimizationRequest,
  OptimizationJob,
  OptimizationResult,
  KlineQuery
} from './types/backtest';

// Re-export performance and risk metrics from backtest
export type {
  PerformanceMetrics as BacktestPerformanceMetrics,
  RiskMetrics as BacktestRiskMetrics,
  TradeStatistics as BacktestTradeStatistics
} from './types/backtest';

// Export utility functions
export * from './utils/validation';
export * from './utils/crypto';
export * from './utils/formatting';
export * from './utils/config-schema';