/**
 * Backtest System Types
 * Types for historical data management and backtest execution
 */

// ============================================================================
// Market Data Types
// ============================================================================

export type MarketType = 'spot' | 'futures-um' | 'futures-cm' | 'options';

export type KlineInterval = 
  | '1m' | '3m' | '5m' | '15m' | '30m'
  | '1h' | '2h' | '4h' | '6h' | '8h' | '12h'
  | '1d' | '3d' | '1w' | '1mo';

export interface MarketDataPoint {
  timestamp: Date;
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source?: string;
}

// ============================================================================
// Historical Dataset Types
// ============================================================================

export interface HistoricalDataset {
  id: string;
  marketType: MarketType;
  symbol: string;
  interval: KlineInterval;
  startDate: Date;
  endDate: Date;
  dataPoints: number;
  fileSize: number;
  filePath: string;
  checksum?: string;
  source: string;
  version?: string;
  compressed: boolean;
  downloadedAt: Date;
  lastAccessedAt?: Date;
}

export interface PublicDatasetInfo {
  id: string;
  marketType: MarketType;
  symbol: string;
  interval: KlineInterval;
  startDate: Date;
  endDate: Date;
  dataPoints: number;
  // 不包含敏感信息: filePath, checksum
}

export interface DatasetFilters {
  marketType?: MarketType;
  symbols?: string[];
  intervals?: KlineInterval[];
  startDate?: Date;
  endDate?: Date;
}

// ============================================================================
// Data Download Types
// ============================================================================

export interface DownloadRequest {
  marketType: MarketType;
  symbols: string[];
  intervals: KlineInterval[];
  startDate: Date;
  endDate: Date;
  dataType: 'klines' | 'aggTrades' | 'trades';
  options?: {
    verifyChecksum?: boolean;
    overwriteExisting?: boolean;
    maxConcurrentDownloads?: number;
  };
}

export interface DownloadJob {
  id: string;
  marketType: MarketType;
  symbols: string[];
  intervals: KlineInterval[];
  startDate: Date;
  endDate: Date;
  dataType: string;
  status: 'queued' | 'downloading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    totalFiles: number;
    downloadedFiles: number;
    failedFiles: number;
    totalBytes: number;
    downloadedBytes: number;
    currentFile?: string;
  };
  verifyChecksum: boolean;
  overwriteExisting: boolean;
  maxConcurrentDownloads: number;
  failedFilesList: Array<{
    filename: string;
    error: string;
    retryCount: number;
  }>;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface DownloadStatus extends DownloadJob {
  estimatedTimeRemaining?: number;
  downloadSpeed?: number;
}

export interface DataAvailability {
  symbol: string;
  marketType: MarketType;
  availableIntervals: KlineInterval[];
  earliestDate: Date;
  latestDate: Date;
  dataGaps: Array<{
    startDate: Date;
    endDate: Date;
    reason: string;
  }>;
}

// ============================================================================
// Dataset Verification Types
// ============================================================================

export interface VerificationResult {
  datasetId: string;
  isValid: boolean;
  issues: Array<{
    type: 'missing_data' | 'corrupted_file' | 'checksum_mismatch' | 'invalid_format';
    severity: 'error' | 'warning';
    description: string;
    affectedRange?: {
      startDate: Date;
      endDate: Date;
    };
  }>;
  checkedAt: Date;
}

export interface StorageStats {
  totalDatasets: number;
  totalSize: number;
  availableSpace: number;
  byMarketType: Record<MarketType, {
    datasets: number;
    size: number;
  }>;
  byInterval: Record<KlineInterval, {
    datasets: number;
    size: number;
  }>;
  oldestDataset: Date;
  newestDataset: Date;
}

// ============================================================================
// Backtest Configuration Types
// ============================================================================

export interface BacktestConfig {
  startDate: Date;
  endDate: Date;
  symbols: string[];
  interval: KlineInterval;
  initialBalance: number;
  currency: string;
  dataSource: 'historical' | 'generated' | 'custom';
  datasetId?: string; // Reference to historical dataset
  generatorConfig?: DataGeneratorConfig;
}

export interface DataGeneratorConfig {
  volatility: number;
  trend: 'bullish' | 'bearish' | 'sideways' | 'random';
  basePrice: number;
  priceRange?: [number, number];
  includeNoise: boolean;
  eventProbability?: number;
}

// ============================================================================
// Backtest Execution Types
// ============================================================================

export interface BacktestRequest {
  userId: string;
  strategyTemplateId: string;
  parameters: Record<string, any>;
  dataConfig: BacktestConfig;
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  options?: {
    saveResults?: boolean;
    generateReport?: boolean;
    notifyOnComplete?: boolean;
  };
}

export interface BacktestJob {
  id: string;
  userId: string;
  strategyTemplateId?: string;
  parameters: Record<string, any>;
  dataConfig: BacktestConfig;
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  resultId?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// ============================================================================
// Backtest Results Types
// ============================================================================

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

export interface EquityPoint {
  timestamp: Date;
  balance: number;
  portfolioValue: number;
  drawdown: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
}

export interface RiskMetrics {
  maxDrawdown: number;
  averageDrawdown: number;
  drawdownDuration: number;
  valueAtRisk: number;
  conditionalVaR: number;
  beta: number;
  volatility: number;
}

export interface TradeStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  averageHoldingTime: number;
  tradingFrequency: number;
}

export interface BacktestMetrics {
  totalProfitLoss: number;
  averageProfitPerTrade: number;
  averageLossPerTrade: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  profitFactor: number;
  expectancy: number;
  averageHoldingTime: number;
}

export interface BacktestResult {
  id: string;
  jobId: string;
  userId: string;
  strategyName?: string;
  parameters: Record<string, any>;
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  finalBalance: number;
  totalReturn: number;
  annualizedReturn?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor?: number;
  fullResult: {
    trades: BacktestTrade[];
    equityCurve: EquityPoint[];
    metrics: BacktestMetrics;
    performance: PerformanceMetrics;
    risk: RiskMetrics;
    statistics: TradeStatistics;
  };
  equityCurve?: EquityPoint[];
  drawdownData?: any;
  tags?: string[];
  description?: string;
  notes?: string;
  createdAt: Date;
}

// ============================================================================
// Parameter Optimization Types
// ============================================================================

export interface OptimizationRequest {
  userId: string;
  strategyTemplateId: string;
  optimizationType: 'grid_search' | 'random_search' | 'walk_forward';
  parameters: Record<string, number[]>;
  dataConfig: BacktestConfig;
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  optimizationMetric: 'totalReturn' | 'sharpeRatio' | 'profitFactor' | 'winRate';
  maxCombinations?: number;
}

export interface OptimizationJob {
  id: string;
  userId: string;
  strategyTemplateId?: string;
  optimizationType: string;
  parameters: Record<string, number[]>;
  dataConfig: BacktestConfig;
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  optimizationMetric: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalCombinations?: number;
  completedCombinations: number;
  bestParameters?: Record<string, any>;
  bestMetrics?: PerformanceMetrics;
  allResults?: any;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface OptimizationResult {
  jobId: string;
  totalCombinations: number;
  completedCombinations: number;
  bestResult: {
    parameters: Record<string, any>;
    metrics: PerformanceMetrics;
    backtest: BacktestResult;
  };
  allResults: Array<{
    parameters: Record<string, any>;
    metrics: PerformanceMetrics;
  }>;
  heatmaps?: {
    [parameterPair: string]: any;
  };
}

// ============================================================================
// Query Types
// ============================================================================

export interface KlineQuery {
  symbol: string;
  interval: KlineInterval;
  marketType: MarketType;
  startDate: Date;
  endDate: Date;
  limit?: number;
}
