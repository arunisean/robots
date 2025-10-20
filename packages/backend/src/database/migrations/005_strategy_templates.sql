-- Migration: Create strategy template tables for trading automation

-- Strategy Templates Table
CREATE TABLE strategy_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'arbitrage', 'grid', 'trend', 'copy_trade', 'defi'
  difficulty VARCHAR(20) NOT NULL, -- 'beginner', 'intermediate', 'advanced'
  
  -- Template configuration
  parameters JSONB NOT NULL DEFAULT '[]', -- Array of TemplateParameter
  workflow_definition JSONB NOT NULL, -- TradingWorkflowDefinition
  risk_profile JSONB NOT NULL, -- RiskProfile
  performance_metrics JSONB, -- PerformanceMetrics (optional)
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  
  -- Publishing
  published BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for strategy_templates
CREATE INDEX idx_strategy_templates_category ON strategy_templates(category);
CREATE INDEX idx_strategy_templates_difficulty ON strategy_templates(difficulty);
CREATE INDEX idx_strategy_templates_tags ON strategy_templates USING GIN(tags);
CREATE INDEX idx_strategy_templates_author ON strategy_templates(author_id);
CREATE INDEX idx_strategy_templates_published ON strategy_templates(published);
CREATE INDEX idx_strategy_templates_featured ON strategy_templates(featured);
CREATE INDEX idx_strategy_templates_usage ON strategy_templates(usage_count DESC);

-- User Strategy Instances Table
CREATE TABLE user_strategy_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES strategy_templates(id) ON DELETE RESTRICT,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Instance configuration
  name VARCHAR(255) NOT NULL,
  parameters JSONB NOT NULL, -- User's customized parameters
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'stopped', -- 'active', 'paused', 'stopped'
  paper_trading BOOLEAN DEFAULT true,
  
  -- Performance tracking
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  total_profit_loss DECIMAL(20, 8) DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_executed_at TIMESTAMP,
  started_at TIMESTAMP,
  stopped_at TIMESTAMP
);

-- Indexes for user_strategy_instances
CREATE INDEX idx_user_strategy_instances_user ON user_strategy_instances(user_id);
CREATE INDEX idx_user_strategy_instances_template ON user_strategy_instances(template_id);
CREATE INDEX idx_user_strategy_instances_workflow ON user_strategy_instances(workflow_id);
CREATE INDEX idx_user_strategy_instances_status ON user_strategy_instances(status);
CREATE INDEX idx_user_strategy_instances_paper_trading ON user_strategy_instances(paper_trading);
CREATE INDEX idx_user_strategy_instances_created ON user_strategy_instances(created_at DESC);

-- Risk Control Events Table
CREATE TABLE risk_control_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strategy_instance_id UUID REFERENCES user_strategy_instances(id) ON DELETE SET NULL,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL, -- 'max_loss_per_trade', 'max_daily_loss', 'max_position_size', etc.
  severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error', 'critical'
  
  -- Event data
  details JSONB NOT NULL,
  triggered_value DECIMAL(20, 8),
  threshold_value DECIMAL(20, 8),
  
  -- Action taken
  action_taken VARCHAR(50) NOT NULL, -- 'alerted', 'paused', 'stopped'
  
  -- Timestamp
  triggered_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for risk_control_events
CREATE INDEX idx_risk_control_events_user ON risk_control_events(user_id);
CREATE INDEX idx_risk_control_events_strategy ON risk_control_events(strategy_instance_id);
CREATE INDEX idx_risk_control_events_type ON risk_control_events(event_type);
CREATE INDEX idx_risk_control_events_severity ON risk_control_events(severity);
CREATE INDEX idx_risk_control_events_triggered ON risk_control_events(triggered_at DESC);

-- Exchange Credentials Table
CREATE TABLE exchange_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Exchange details
  exchange_name VARCHAR(50) NOT NULL, -- 'binance', 'okx', 'coinbase', etc.
  
  -- Encrypted credentials
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  passphrase_encrypted TEXT, -- For exchanges that require it
  
  -- Permissions
  permissions JSONB DEFAULT '[]', -- ['spot_trading', 'futures_trading', 'withdrawal']
  testnet BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMP,
  validation_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint: one credential per exchange per user
  UNIQUE(user_id, exchange_name, testnet)
);

-- Indexes for exchange_credentials
CREATE INDEX idx_exchange_credentials_user ON exchange_credentials(user_id);
CREATE INDEX idx_exchange_credentials_exchange ON exchange_credentials(exchange_name);
CREATE INDEX idx_exchange_credentials_active ON exchange_credentials(is_active);

-- Trade History Table (for paper and live trading)
CREATE TABLE trade_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strategy_instance_id UUID REFERENCES user_strategy_instances(id) ON DELETE SET NULL,
  
  -- Trade details
  symbol VARCHAR(50) NOT NULL,
  side VARCHAR(10) NOT NULL, -- 'buy', 'sell'
  order_type VARCHAR(20) NOT NULL, -- 'market', 'limit', 'stop_loss', etc.
  
  -- Quantities and prices
  quantity DECIMAL(20, 8) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  average_price DECIMAL(20, 8),
  
  -- Execution details
  platform VARCHAR(50) NOT NULL, -- 'binance', 'uniswap', etc.
  order_id VARCHAR(255),
  transaction_hash VARCHAR(255), -- For DEX trades
  
  -- Status
  status VARCHAR(20) NOT NULL, -- 'pending', 'filled', 'cancelled', 'failed'
  
  -- Costs and P&L
  commission DECIMAL(20, 8) DEFAULT 0,
  commission_asset VARCHAR(20),
  gas_used DECIMAL(20, 8), -- For DEX trades
  realized_pnl DECIMAL(20, 8),
  
  -- Paper trading flag
  paper_trading BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for trade_history
CREATE INDEX idx_trade_history_user ON trade_history(user_id);
CREATE INDEX idx_trade_history_strategy ON trade_history(strategy_instance_id);
CREATE INDEX idx_trade_history_symbol ON trade_history(symbol);
CREATE INDEX idx_trade_history_platform ON trade_history(platform);
CREATE INDEX idx_trade_history_status ON trade_history(status);
CREATE INDEX idx_trade_history_paper_trading ON trade_history(paper_trading);
CREATE INDEX idx_trade_history_created ON trade_history(created_at DESC);

-- Portfolio Snapshots Table (for tracking portfolio value over time)
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strategy_instance_id UUID REFERENCES user_strategy_instances(id) ON DELETE SET NULL,
  
  -- Portfolio state
  total_value DECIMAL(20, 8) NOT NULL,
  cash_balance DECIMAL(20, 8) NOT NULL,
  positions JSONB NOT NULL DEFAULT '[]', -- Array of positions
  
  -- P&L
  unrealized_pnl DECIMAL(20, 8) DEFAULT 0,
  realized_pnl DECIMAL(20, 8) DEFAULT 0,
  total_pnl DECIMAL(20, 8) DEFAULT 0,
  
  -- Paper trading flag
  paper_trading BOOLEAN DEFAULT false,
  
  -- Timestamp
  snapshot_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for portfolio_snapshots
CREATE INDEX idx_portfolio_snapshots_user ON portfolio_snapshots(user_id);
CREATE INDEX idx_portfolio_snapshots_strategy ON portfolio_snapshots(strategy_instance_id);
CREATE INDEX idx_portfolio_snapshots_paper_trading ON portfolio_snapshots(paper_trading);
CREATE INDEX idx_portfolio_snapshots_time ON portfolio_snapshots(snapshot_at DESC);

-- Strategy Performance Metrics Table (aggregated daily metrics)
CREATE TABLE strategy_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_instance_id UUID NOT NULL REFERENCES user_strategy_instances(id) ON DELETE CASCADE,
  
  -- Date
  metric_date DATE NOT NULL,
  
  -- Trading metrics
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  
  -- P&L metrics
  daily_pnl DECIMAL(20, 8) DEFAULT 0,
  cumulative_pnl DECIMAL(20, 8) DEFAULT 0,
  largest_win DECIMAL(20, 8) DEFAULT 0,
  largest_loss DECIMAL(20, 8) DEFAULT 0,
  
  -- Risk metrics
  max_drawdown DECIMAL(5, 2) DEFAULT 0,
  sharpe_ratio DECIMAL(10, 4),
  
  -- Volume
  total_volume DECIMAL(20, 8) DEFAULT 0,
  total_fees DECIMAL(20, 8) DEFAULT 0,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint: one record per strategy per day
  UNIQUE(strategy_instance_id, metric_date)
);

-- Indexes for strategy_performance_metrics
CREATE INDEX idx_strategy_performance_metrics_strategy ON strategy_performance_metrics(strategy_instance_id);
CREATE INDEX idx_strategy_performance_metrics_date ON strategy_performance_metrics(metric_date DESC);

-- Add triggers for updated_at columns
CREATE TRIGGER update_strategy_templates_updated_at 
  BEFORE UPDATE ON strategy_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_strategy_instances_updated_at 
  BEFORE UPDATE ON user_strategy_instances 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_credentials_updated_at 
  BEFORE UPDATE ON exchange_credentials 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trade_history_updated_at 
  BEFORE UPDATE ON trade_history 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update strategy instance statistics
CREATE OR REPLACE FUNCTION update_strategy_instance_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_strategy_instances statistics when a trade is completed
  IF NEW.status = 'filled' AND (OLD.status IS NULL OR OLD.status != 'filled') THEN
    UPDATE user_strategy_instances
    SET 
      total_trades = total_trades + 1,
      winning_trades = CASE WHEN NEW.realized_pnl > 0 THEN winning_trades + 1 ELSE winning_trades END,
      losing_trades = CASE WHEN NEW.realized_pnl < 0 THEN losing_trades + 1 ELSE losing_trades END,
      total_profit_loss = total_profit_loss + COALESCE(NEW.realized_pnl, 0),
      win_rate = CASE 
        WHEN total_trades + 1 > 0 THEN 
          ((winning_trades + CASE WHEN NEW.realized_pnl > 0 THEN 1 ELSE 0 END)::DECIMAL / (total_trades + 1)) * 100
        ELSE 0
      END,
      last_executed_at = NEW.executed_at
    WHERE id = NEW.strategy_instance_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update strategy stats on trade completion
CREATE TRIGGER update_strategy_stats_on_trade
  AFTER INSERT OR UPDATE ON trade_history
  FOR EACH ROW
  WHEN (NEW.strategy_instance_id IS NOT NULL)
  EXECUTE FUNCTION update_strategy_instance_stats();

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE strategy_templates
  SET usage_count = usage_count + 1
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment usage count when strategy instance is created
CREATE TRIGGER increment_template_usage_on_instance_create
  AFTER INSERT ON user_strategy_instances
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_usage();

-- Comments for documentation
COMMENT ON TABLE strategy_templates IS 'Pre-configured trading strategy templates with parameters and workflow definitions';
COMMENT ON TABLE user_strategy_instances IS 'User-created instances of strategy templates with customized parameters';
COMMENT ON TABLE risk_control_events IS 'Log of risk control violations and actions taken';
COMMENT ON TABLE exchange_credentials IS 'Encrypted API credentials for exchange integrations';
COMMENT ON TABLE trade_history IS 'Complete history of all trades (paper and live)';
COMMENT ON TABLE portfolio_snapshots IS 'Periodic snapshots of portfolio state for performance tracking';
COMMENT ON TABLE strategy_performance_metrics IS 'Aggregated daily performance metrics for strategies';
