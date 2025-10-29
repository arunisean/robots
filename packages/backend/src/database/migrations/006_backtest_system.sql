-- Migration: Backtest System - Historical Data Management and Backtest Jobs
-- Creates tables for managing historical market data and backtest execution

-- 历史数据集表
CREATE TABLE IF NOT EXISTS historical_datasets (
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
  
  -- 唯一约束
  UNIQUE(market_type, symbol, interval, start_date, end_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_historical_datasets_symbol ON historical_datasets(symbol);
CREATE INDEX IF NOT EXISTS idx_historical_datasets_market ON historical_datasets(market_type);
CREATE INDEX IF NOT EXISTS idx_historical_datasets_interval ON historical_datasets(interval);
CREATE INDEX IF NOT EXISTS idx_historical_datasets_date_range ON historical_datasets(start_date, end_date);

-- 数据下载任务表
CREATE TABLE IF NOT EXISTS data_download_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 下载配置
  market_type VARCHAR(20) NOT NULL,
  symbols TEXT[] NOT NULL,
  intervals TEXT[] NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  data_type VARCHAR(20) NOT NULL DEFAULT 'klines', -- 'klines', 'aggTrades', 'trades'
  
  -- 状态
  status VARCHAR(20) NOT NULL DEFAULT 'queued', -- 'queued', 'downloading', 'processing', 'completed', 'failed', 'cancelled'
  
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
  completed_at TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_data_download_jobs_status ON data_download_jobs(status);
CREATE INDEX IF NOT EXISTS idx_data_download_jobs_created ON data_download_jobs(created_at DESC);

-- 数据验证记录表
CREATE TABLE IF NOT EXISTS dataset_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES historical_datasets(id) ON DELETE CASCADE,
  
  -- 验证结果
  is_valid BOOLEAN NOT NULL,
  issues JSONB DEFAULT '[]',
  
  -- 时间戳
  checked_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_dataset_verifications_dataset ON dataset_verifications(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_verifications_checked ON dataset_verifications(checked_at DESC);

-- 回测任务表
CREATE TABLE IF NOT EXISTS backtest_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strategy_template_id UUID REFERENCES strategy_templates(id),
  
  -- 配置
  parameters JSONB NOT NULL,
  data_config JSONB NOT NULL,
  time_range JSONB NOT NULL,
  
  -- 状态
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  
  -- 结果引用
  result_id UUID,
  
  -- 错误信息
  error TEXT,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_backtest_jobs_user ON backtest_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_jobs_status ON backtest_jobs(status);
CREATE INDEX IF NOT EXISTS idx_backtest_jobs_created ON backtest_jobs(created_at DESC);

-- 回测结果表
CREATE TABLE IF NOT EXISTS backtest_results (
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
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_backtest_results_user ON backtest_results(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_results_job ON backtest_results(job_id);
CREATE INDEX IF NOT EXISTS idx_backtest_results_strategy ON backtest_results(strategy_name);
CREATE INDEX IF NOT EXISTS idx_backtest_results_return ON backtest_results(total_return DESC);
CREATE INDEX IF NOT EXISTS idx_backtest_results_created ON backtest_results(created_at DESC);

-- 优化任务表
CREATE TABLE IF NOT EXISTS optimization_jobs (
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
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
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
  completed_at TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_optimization_jobs_user ON optimization_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_optimization_jobs_status ON optimization_jobs(status);
CREATE INDEX IF NOT EXISTS idx_optimization_jobs_created ON optimization_jobs(created_at DESC);

-- 添加外键约束到backtest_jobs
ALTER TABLE backtest_jobs 
  ADD CONSTRAINT fk_backtest_jobs_result 
  FOREIGN KEY (result_id) 
  REFERENCES backtest_results(id) 
  ON DELETE SET NULL;

-- 注释
COMMENT ON TABLE historical_datasets IS 'Stores metadata for downloaded historical market data from Binance';
COMMENT ON TABLE data_download_jobs IS 'Tracks data download tasks from Binance public data repository';
COMMENT ON TABLE dataset_verifications IS 'Records data integrity verification results';
COMMENT ON TABLE backtest_jobs IS 'Tracks backtest execution jobs';
COMMENT ON TABLE backtest_results IS 'Stores backtest results and performance metrics';
COMMENT ON TABLE optimization_jobs IS 'Tracks parameter optimization jobs';
