# Design Document

## Overview

回测系统设计为一个高性能、可扩展的服务，支持策略在历史和模拟数据上的测试。系统采用事件驱动架构，支持并行处理，并提供丰富的分析和可视化功能。

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Backtest UI  │  │ Results View │  │ Optimization │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Backtest API │  │ Results API  │  │ Data API     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                            │
│  ┌──────────────────────────────────────────────────┐      │
│  │           BacktestOrchestrator                   │      │
│  │  - 管理回测生命周期                              │      │
│  │  - 协调各个组件                                  │      │
│  │  - 处理并发和队列                                │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ BacktestEngine│  │ DataProvider │  │ MetricsCalc  │     │
│  │ (已存在)      │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Optimizer    │  │ ReportGen    │  │ Visualizer   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │ Redis Cache  │  │ File Storage │     │
│  │ (回测结果)   │  │ (市场数据)   │  │ (报告/图表)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
用户发起回测
    │
    ▼
BacktestOrchestrator
    │
    ├─► DataProvider (加载市场数据)
    │       │
    │       ├─► Historical Data (Binance API)
    │       ├─► Generated Data (合成数据)
    │       └─► Custom Data (用户上传)
    │
    ├─► BacktestEngine (执行回测)
    │       │
    │       ├─► WorkflowExecutor (运行策略)
    │       └─► VirtualPortfolio (模拟交易)
    │
    ├─► MetricsCalculator (计算指标)
    │       │
    │       ├─► Performance Metrics
    │       ├─► Risk Metrics
    │       └─► Statistical Analysis
    │
    ├─► Visualizer (生成图表)
    │       │
    │       ├─► Equity Curve
    │       ├─► Drawdown Chart
    │       └─► Trade Distribution
    │
    └─► ReportGenerator (生成报告)
            │
            ├─► PDF Report
            ├─► CSV Export
            └─► JSON Export
```

## Binance Public Data Integration

### Data Source Overview

系统使用Binance公开数据仓库作为主要的历史数据源：
- **Repository**: https://github.com/binance/binance-public-data
- **Base URL**: https://data.binance.vision/

### Supported Markets

1. **Spot Market**
   - URL Pattern: `https://data.binance.vision/data/spot/monthly/klines/{SYMBOL}/{INTERVAL}/{SYMBOL}-{INTERVAL}-{YEAR}-{MONTH}.zip`
   - Example: `https://data.binance.vision/data/spot/monthly/klines/BTCUSDT/1h/BTCUSDT-1h-2024-01.zip`

2. **USDT-M Futures**
   - URL Pattern: `https://data.binance.vision/data/futures/um/monthly/klines/{SYMBOL}/{INTERVAL}/{SYMBOL}-{INTERVAL}-{YEAR}-{MONTH}.zip`

3. **COIN-M Futures**
   - URL Pattern: `https://data.binance.vision/data/futures/cm/monthly/klines/{SYMBOL}/{INTERVAL}/{SYMBOL}-{INTERVAL}-{YEAR}-{MONTH}.zip`

4. **Options**
   - URL Pattern: `https://data.binance.vision/data/option/monthly/klines/{SYMBOL}/{INTERVAL}/{SYMBOL}-{INTERVAL}-{YEAR}-{MONTH}.zip`

### Supported Intervals

- **Minutes**: 1m, 3m, 5m, 15m, 30m
- **Hours**: 1h, 2h, 4h, 6h, 8h, 12h
- **Days**: 1d, 3d
- **Weeks**: 1w
- **Months**: 1mo

### Data Format

每个ZIP文件包含：
1. **CSV文件**: 包含K线数据
2. **CHECKSUM文件**: 用于验证文件完整性

CSV格式（无表头）：
```
Open time, Open, High, Low, Close, Volume, Close time, Quote asset volume, Number of trades, Taker buy base asset volume, Taker buy quote asset volume, Ignore
```

示例：
```
1609459200000,29374.99,29600.00,29200.00,29374.99,1234.56,1609462799999,36234567.89,5678,617.28,18117283.95,0
```

### Download Strategy

1. **月度文件**: 优先下载完整月份的数据
2. **日度文件**: 对于当前月份，下载每日数据
3. **增量更新**: 定期下载最新数据以保持更新
4. **并发控制**: 限制同时下载数量避免过载
5. **重试机制**: 失败文件自动重试（最多3次）
6. **校验和验证**: 下载后验证文件完整性

### Storage Structure

```
data/
├── spot/
│   ├── BTCUSDT/
│   │   ├── 1m/
│   │   │   ├── 2024-01.parquet
│   │   │   ├── 2024-02.parquet
│   │   │   └── metadata.json
│   │   ├── 1h/
│   │   └── 1d/
│   └── ETHUSDT/
├── futures-um/
├── futures-cm/
└── options/
```

## Components and Interfaces

### 1. BacktestOrchestrator

协调整个回测流程的核心服务。

```typescript
interface BacktestOrchestrator {
  /**
   * 启动新的回测
   */
  startBacktest(request: BacktestRequest): Promise<BacktestJob>;
  
  /**
   * 获取回测状态
   */
  getBacktestStatus(jobId: string): Promise<BacktestStatus>;
  
  /**
   * 取消运行中的回测
   */
  cancelBacktest(jobId: string): Promise<void>;
  
  /**
   * 获取回测结果
   */
  getBacktestResult(jobId: string): Promise<BacktestResult>;
  
  /**
   * 启动参数优化
   */
  startOptimization(request: OptimizationRequest): Promise<OptimizationJob>;
}

interface BacktestRequest {
  userId: string;
  strategyTemplateId: string;
  parameters: Record<string, any>;
  dataConfig: DataConfig;
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

interface BacktestJob {
  id: string;
  userId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  startedAt: Date;
  estimatedCompletion?: Date;
  error?: string;
}
```

### 2. DataProvider

管理市场数据的加载和缓存。

```typescript
interface DataProvider {
  /**
   * 加载历史数据
   */
  loadHistoricalData(config: HistoricalDataConfig): Promise<MarketDataPoint[]>;
  
  /**
   * 生成模拟数据
   */
  generateData(config: GeneratedDataConfig): Promise<MarketDataPoint[]>;
  
  /**
   * 加载用户上传的数据
   */
  loadCustomData(fileId: string): Promise<MarketDataPoint[]>;
  
  /**
   * 缓存数据
   */
  cacheData(key: string, data: MarketDataPoint[]): Promise<void>;
  
  /**
   * 获取缓存数据
   */
  getCachedData(key: string): Promise<MarketDataPoint[] | null>;
}

interface HistoricalDataConfig {
  source: 'binance' | 'okx' | 'coinbase';
  symbols: string[];
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  startDate: Date;
  endDate: Date;
}

interface GeneratedDataConfig {
  symbols: string[];
  interval: string;
  startDate: Date;
  endDate: Date;
  trend: 'bullish' | 'bearish' | 'sideways' | 'random';
  volatility: number; // 0-1
  basePrice: number;
  priceRange?: [number, number];
}
```

### 2.1 BinanceDataDownloader

从Binance公开数据仓库下载历史K线数据。

```typescript
interface BinanceDataDownloader {
  /**
   * 下载历史数据
   */
  downloadHistoricalData(request: DownloadRequest): Promise<DownloadJob>;
  
  /**
   * 获取下载任务状态
   */
  getDownloadStatus(jobId: string): Promise<DownloadStatus>;
  
  /**
   * 取消下载任务
   */
  cancelDownload(jobId: string): Promise<void>;
  
  /**
   * 列出可用的交易对
   */
  listAvailableSymbols(marketType: MarketType): Promise<string[]>;
  
  /**
   * 获取数据可用性信息
   */
  getDataAvailability(symbol: string, marketType: MarketType): Promise<DataAvailability>;
}

interface DownloadRequest {
  marketType: 'spot' | 'futures-um' | 'futures-cm' | 'options';
  symbols: string[]; // e.g., ['BTCUSDT', 'ETHUSDT']
  intervals: KlineInterval[]; // e.g., ['1m', '1h', '1d']
  startDate: Date;
  endDate: Date;
  dataType: 'klines' | 'aggTrades' | 'trades';
  options?: {
    verifyChecksum?: boolean;
    overwriteExisting?: boolean;
    maxConcurrentDownloads?: number;
  };
}

type KlineInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1mo';

type MarketType = 'spot' | 'futures-um' | 'futures-cm' | 'options';

interface DownloadJob {
  id: string;
  status: 'queued' | 'downloading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    totalFiles: number;
    downloadedFiles: number;
    failedFiles: number;
    totalBytes: number;
    downloadedBytes: number;
    currentFile?: string;
  };
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

interface DownloadStatus extends DownloadJob {
  estimatedTimeRemaining?: number; // seconds
  downloadSpeed?: number; // bytes per second
  failedFiles: Array<{
    filename: string;
    error: string;
    retryCount: number;
  }>;
}

interface DataAvailability {
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
```

### 2.2 HistoricalDataManager

管理已下载的历史数据。

```typescript
interface HistoricalDataManager {
  /**
   * 列出所有数据集
   */
  listDatasets(filters?: DatasetFilters): Promise<DatasetInfo[]>;
  
  /**
   * 获取数据集详情
   */
  getDatasetInfo(datasetId: string): Promise<DatasetInfo>;
  
  /**
   * 删除数据集
   */
  deleteDataset(datasetId: string): Promise<void>;
  
  /**
   * 验证数据集完整性
   */
  verifyDataset(datasetId: string): Promise<VerificationResult>;
  
  /**
   * 获取存储统计
   */
  getStorageStats(): Promise<StorageStats>;
  
  /**
   * 查询数据集的K线数据
   */
  queryKlines(query: KlineQuery): Promise<MarketDataPoint[]>;
  
  /**
   * 导出数据集元数据
   */
  exportMetadata(format: 'json' | 'csv'): Promise<string>;
}

interface DatasetFilters {
  marketType?: MarketType;
  symbols?: string[];
  intervals?: KlineInterval[];
  startDate?: Date;
  endDate?: Date;
}

interface DatasetInfo {
  id: string;
  marketType: MarketType;
  symbol: string;
  interval: KlineInterval;
  startDate: Date;
  endDate: Date;
  dataPoints: number;
  fileSize: number; // bytes
  filePath: string;
  checksum?: string;
  downloadedAt: Date;
  lastAccessedAt?: Date;
  metadata: {
    source: 'binance-public-data';
    version: string;
    compressed: boolean;
  };
}

interface VerificationResult {
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

interface StorageStats {
  totalDatasets: number;
  totalSize: number; // bytes
  availableSpace: number; // bytes
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

interface KlineQuery {
  symbol: string;
  interval: KlineInterval;
  marketType: MarketType;
  startDate: Date;
  endDate: Date;
  limit?: number;
}
```

### 3. MetricsCalculator

计算各种性能和风险指标。

```typescript
interface MetricsCalculator {
  /**
   * 计算性能指标
   */
  calculatePerformanceMetrics(result: BacktestResult): PerformanceMetrics;
  
  /**
   * 计算风险指标
   */
  calculateRiskMetrics(result: BacktestResult): RiskMetrics;
  
  /**
   * 计算统计指标
   */
  calculateStatistics(trades: BacktestTrade[]): TradeStatistics;
  
  /**
   * 计算月度收益
   */
  calculateMonthlyReturns(equityCurve: EquityPoint[]): MonthlyReturns;
}

interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
}

interface RiskMetrics {
  maxDrawdown: number;
  averageDrawdown: number;
  drawdownDuration: number;
  valueAtRisk: number; // VaR 95%
  conditionalVaR: number; // CVaR 95%
  beta: number;
  volatility: number;
}

interface TradeStatistics {
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
```

### 4. ParameterOptimizer

执行参数优化和前进分析。

```typescript
interface ParameterOptimizer {
  /**
   * 网格搜索优化
   */
  gridSearch(config: GridSearchConfig): Promise<OptimizationResult>;
  
  /**
   * 随机搜索优化
   */
  randomSearch(config: RandomSearchConfig): Promise<OptimizationResult>;
  
  /**
   * 前进分析
   */
  walkForwardAnalysis(config: WalkForwardConfig): Promise<WalkForwardResult>;
  
  /**
   * 获取优化进度
   */
  getOptimizationProgress(jobId: string): Promise<OptimizationProgress>;
}

interface GridSearchConfig {
  strategyTemplateId: string;
  parameters: {
    [key: string]: number[]; // 参数名 -> 测试值数组
  };
  dataConfig: DataConfig;
  timeRange: { startDate: Date; endDate: Date };
  optimizationMetric: 'totalReturn' | 'sharpeRatio' | 'profitFactor';
  maxCombinations?: number;
}

interface OptimizationResult {
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
  heatmaps: {
    [parameterPair: string]: HeatmapData;
  };
}

interface WalkForwardConfig {
  strategyTemplateId: string;
  parameters: Record<string, number[]>;
  dataConfig: DataConfig;
  timeRange: { startDate: Date; endDate: Date };
  trainingPeriod: number; // days
  testingPeriod: number; // days
  stepSize: number; // days
}

interface WalkForwardResult {
  periods: Array<{
    trainingStart: Date;
    trainingEnd: Date;
    testingStart: Date;
    testingEnd: Date;
    bestParameters: Record<string, any>;
    trainingMetrics: PerformanceMetrics;
    testingMetrics: PerformanceMetrics;
    degradation: number; // 性能下降百分比
  }>;
  overallMetrics: {
    averageTrainingReturn: number;
    averageTestingReturn: number;
    consistency: number; // 0-1, 测试期性能一致性
    overfittingScore: number; // 0-1, 过拟合程度
  };
}
```

### 5. ReportGenerator

生成各种格式的回测报告。

```typescript
interface ReportGenerator {
  /**
   * 生成PDF报告
   */
  generatePDFReport(result: BacktestResult, options?: ReportOptions): Promise<Buffer>;
  
  /**
   * 导出CSV交易记录
   */
  exportTradesCSV(trades: BacktestTrade[]): Promise<string>;
  
  /**
   * 导出JSON结果
   */
  exportJSON(result: BacktestResult): Promise<string>;
  
  /**
   * 生成HTML报告
   */
  generateHTMLReport(result: BacktestResult): Promise<string>;
}

interface ReportOptions {
  includeCharts: boolean;
  includeTradeList: boolean;
  includeParameters: boolean;
  customNotes?: string;
  language: 'en' | 'zh';
}
```

### 6. Visualizer

生成各种图表和可视化。

```typescript
interface Visualizer {
  /**
   * 生成权益曲线
   */
  generateEquityCurve(equityCurve: EquityPoint[]): Promise<ChartData>;
  
  /**
   * 生成回撤图
   */
  generateDrawdownChart(equityCurve: EquityPoint[]): Promise<ChartData>;
  
  /**
   * 生成交易分布图
   */
  generateTradeDistribution(trades: BacktestTrade[]): Promise<ChartData>;
  
  /**
   * 生成月度收益热力图
   */
  generateMonthlyReturnsHeatmap(returns: MonthlyReturns): Promise<ChartData>;
  
  /**
   * 生成参数优化热力图
   */
  generateParameterHeatmap(results: OptimizationResult, params: [string, string]): Promise<ChartData>;
  
  /**
   * 在价格图上标注交易
   */
  generatePriceChartWithTrades(
    marketData: MarketDataPoint[],
    trades: BacktestTrade[]
  ): Promise<ChartData>;
}

interface ChartData {
  type: 'line' | 'bar' | 'heatmap' | 'scatter' | 'candlestick';
  data: any;
  options: any;
  imageUrl?: string; // 预渲染的图片URL
}
```

## Data Models

### Database Schema

```sql
-- 历史数据集表
CREATE TABLE historical_datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 数据集标识
  market_type VARCHAR(20) NOT NULL, -- 'spot', 'futures-um', 'futures-cm', 'options'
  symbol VARCHAR(50) NOT NULL,
  interval VARCHAR(10) NOT NULL, -- '1m', '5m', '1h', '1d', etc.
  
  -- 时间范围
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  
  -- 数据统计
  data_points INTEGER NOT NULL,
  file_size BIGINT NOT NULL, -- bytes
  file_path TEXT NOT NULL,
  checksum VARCHAR(64),
  
  -- 元数据
  source VARCHAR(50) DEFAULT 'binance-public-data',
  version VARCHAR(20),
  compressed BOOLEAN DEFAULT false,
  
  -- 时间戳
  downloaded_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP,
  
  -- 索引
  UNIQUE(market_type, symbol, interval, start_date, end_date),
  INDEX idx_historical_datasets_symbol (symbol),
  INDEX idx_historical_datasets_market (market_type),
  INDEX idx_historical_datasets_interval (interval),
  INDEX idx_historical_datasets_date_range (start_date, end_date)
);

-- 数据下载任务表
CREATE TABLE data_download_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 下载配置
  market_type VARCHAR(20) NOT NULL,
  symbols TEXT[] NOT NULL,
  intervals TEXT[] NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  data_type VARCHAR(20) NOT NULL, -- 'klines', 'aggTrades', 'trades'
  
  -- 状态
  status VARCHAR(20) NOT NULL, -- 'queued', 'downloading', 'processing', 'completed', 'failed', 'cancelled'
  
  -- 进度
  total_files INTEGER DEFAULT 0,
  downloaded_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  total_bytes BIGINT DEFAULT 0,
  downloaded_bytes BIGINT DEFAULT 0,
  current_file TEXT,
  
  -- 选项
  verify_checksum BOOLEAN DEFAULT true,
  overwrite_existing BOOLEAN DEFAULT false,
  max_concurrent_downloads INTEGER DEFAULT 3,
  
  -- 失败文件记录
  failed_files_list JSONB DEFAULT '[]',
  
  -- 错误信息
  error TEXT,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- 索引
  INDEX idx_data_download_jobs_status (status),
  INDEX idx_data_download_jobs_created (created_at DESC)
);

-- 数据验证记录表
CREATE TABLE dataset_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES historical_datasets(id) ON DELETE CASCADE,
  
  -- 验证结果
  is_valid BOOLEAN NOT NULL,
  issues JSONB DEFAULT '[]',
  
  -- 时间戳
  checked_at TIMESTAMP DEFAULT NOW(),
  
  -- 索引
  INDEX idx_dataset_verifications_dataset (dataset_id),
  INDEX idx_dataset_verifications_checked (checked_at DESC)
);

-- 回测任务表
CREATE TABLE backtest_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strategy_template_id UUID REFERENCES strategy_templates(id),
  
  -- 配置
  parameters JSONB NOT NULL,
  data_config JSONB NOT NULL,
  time_range JSONB NOT NULL,
  
  -- 状态
  status VARCHAR(20) NOT NULL,
  progress INTEGER DEFAULT 0,
  
  -- 结果引用
  result_id UUID REFERENCES backtest_results(id),
  
  -- 错误信息
  error TEXT,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- 索引
  INDEX idx_backtest_jobs_user (user_id),
  INDEX idx_backtest_jobs_status (status),
  INDEX idx_backtest_jobs_created (created_at DESC)
);

-- 回测结果表
CREATE TABLE backtest_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES backtest_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 基本信息
  strategy_name VARCHAR(255),
  parameters JSONB NOT NULL,
  
  -- 时间范围
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  
  -- 性能指标
  initial_balance DECIMAL(20, 8) NOT NULL,
  final_balance DECIMAL(20, 8) NOT NULL,
  total_return DECIMAL(10, 4) NOT NULL,
  annualized_return DECIMAL(10, 4),
  sharpe_ratio DECIMAL(10, 4),
  max_drawdown DECIMAL(10, 4),
  
  -- 交易统计
  total_trades INTEGER NOT NULL,
  winning_trades INTEGER NOT NULL,
  losing_trades INTEGER NOT NULL,
  win_rate DECIMAL(5, 2) NOT NULL,
  profit_factor DECIMAL(10, 4),
  
  -- 完整结果 (JSON)
  full_result JSONB NOT NULL,
  
  -- 图表数据
  equity_curve JSONB,
  drawdown_data JSONB,
  
  -- 标签和描述
  tags TEXT[],
  description TEXT,
  notes TEXT,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 索引
  INDEX idx_backtest_results_user (user_id),
  INDEX idx_backtest_results_strategy (strategy_name),
  INDEX idx_backtest_results_return (total_return DESC),
  INDEX idx_backtest_results_created (created_at DESC)
);

-- 优化任务表
CREATE TABLE optimization_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strategy_template_id UUID REFERENCES strategy_templates(id),
  
  -- 配置
  optimization_type VARCHAR(50) NOT NULL, -- 'grid_search', 'random_search', 'walk_forward'
  parameters JSONB NOT NULL,
  data_config JSONB NOT NULL,
  time_range JSONB NOT NULL,
  optimization_metric VARCHAR(50) NOT NULL,
  
  -- 状态
  status VARCHAR(20) NOT NULL,
  progress INTEGER DEFAULT 0,
  total_combinations INTEGER,
  completed_combinations INTEGER DEFAULT 0,
  
  -- 最佳结果
  best_parameters JSONB,
  best_metrics JSONB,
  
  -- 完整结果
  all_results JSONB,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- 索引
  INDEX idx_optimization_jobs_user (user_id),
  INDEX idx_optimization_jobs_status (status),
  INDEX idx_optimization_jobs_created (created_at DESC)
);

-- 市场数据缓存表
CREATE TABLE market_data_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  
  -- 数据配置
  source VARCHAR(50) NOT NULL,
  symbols TEXT[] NOT NULL,
  interval VARCHAR(10) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  
  -- 数据 (压缩存储)
  data JSONB NOT NULL,
  data_points INTEGER NOT NULL,
  
  -- 缓存管理
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  -- 索引
  INDEX idx_market_data_cache_key (cache_key),
  INDEX idx_market_data_cache_expires (expires_at)
);
```

## Error Handling

### Error Types

1. **DataLoadError**: 数据加载失败
   - 交易所API错误
   - 数据格式错误
   - 缓存读取失败

2. **BacktestExecutionError**: 回测执行失败
   - 策略执行错误
   - 资金不足
   - 超时错误

3. **OptimizationError**: 优化失败
   - 参数范围无效
   - 组合数量过多
   - 资源限制

4. **ReportGenerationError**: 报告生成失败
   - 图表渲染错误
   - PDF生成错误
   - 文件存储错误

### Error Recovery

- 自动重试瞬态错误（网络错误、超时）
- 保存部分完成的优化结果
- 提供详细的错误日志和堆栈跟踪
- 允许用户从失败点恢复

## Testing Strategy

### Unit Tests

- DataProvider数据加载和缓存
- MetricsCalculator指标计算准确性
- ParameterOptimizer优化算法
- Visualizer图表生成

### Integration Tests

- 完整回测流程
- 参数优化流程
- 报告生成流程
- API端点测试

### Performance Tests

- 大数据集回测性能
- 并发回测处理
- 缓存效率
- 优化速度

### End-to-End Tests

- 用户发起回测到查看结果
- 参数优化完整流程
- 报告导出和下载
- 实时回测更新

## Performance Considerations

### Optimization Strategies

1. **数据缓存**
   - Redis缓存热门市场数据
   - 本地内存缓存最近使用的数据
   - 压缩存储历史数据

2. **并行处理**
   - 参数优化使用Worker线程池
   - 多策略回测并行执行
   - 图表生成异步处理

3. **资源管理**
   - 限制单用户并发回测数
   - 队列管理长时间运行的任务
   - 自动清理过期缓存

4. **数据库优化**
   - 索引关键查询字段
   - 分区大表（按日期）
   - 定期归档旧数据

## Access Control and Security

### Access Levels

系统实现两级访问控制：

#### 1. 管理员访问（仅限本地 - Localhost Only）

**访问限制**: 仅允许从 `127.0.0.1` 或 `::1` 访问

**可用功能**:
- ✅ 下载历史数据
- ✅ 删除数据集
- ✅ 查看完整存储统计
- ✅ 数据完整性验证
- ✅ 系统配置管理
- ✅ 查看所有数据集详细信息（包括文件路径）

**API端点**:
- `POST /api/admin/data/download`
- `DELETE /api/admin/data/datasets/:id`
- `GET /api/admin/data/storage`
- `POST /api/admin/data/datasets/:id/verify`

**实现方式**:
```typescript
// localhostOnly middleware
function localhostOnly(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const isLocalhost = ip === '127.0.0.1' || 
                      ip === '::1' || 
                      ip === '::ffff:127.0.0.1';
  
  if (!isLocalhost) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'This endpoint is only accessible from localhost'
    });
  }
  
  next();
}
```

#### 2. 普通用户访问（网络访问 - Public Access）

**访问限制**: 所有已认证用户

**可用功能**:
- ✅ 查看可用数据集列表（只读）
- ✅ 查询数据可用性
- ✅ 选择数据集进行回测
- ✅ 配置和运行回测
- ✅ 查看回测结果
- ✅ 导出回测报告
- ❌ 不能下载、修改或删除数据集
- ❌ 不能访问敏感的存储路径信息

**API端点**:
- `GET /api/data/datasets` - 列出可用数据集
- `GET /api/data/datasets/available` - 查询可用数据
- `GET /api/data/symbols` - 列出交易对
- `POST /api/backtests` - 创建回测
- `GET /api/backtests/:id` - 查看回测结果

**数据过滤**:
```typescript
// 返回给普通用户的数据集信息（隐藏敏感信息）
interface PublicDatasetInfo {
  id: string;
  marketType: string;
  symbol: string;
  interval: string;
  startDate: Date;
  endDate: Date;
  dataPoints: number;
  // 不包含: filePath, checksum, 详细存储信息
}
```

### Security Considerations

- ✅ 验证用户权限访问回测结果
- ✅ 限制数据下载频率防止滥用
- ✅ 加密敏感的策略参数
- ✅ 审计回测操作日志
- ✅ 防止资源耗尽攻击（限制回测时长和数据量）
- ✅ IP白名单验证管理端点
- ✅ 数据集信息脱敏（隐藏文件路径）
- ✅ 只读访问历史数据（用户不能修改）
- ✅ 记录未授权访问尝试
