-- 初始数据库模式
-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  preferences JSONB DEFAULT '{}',
  profile JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Agent表
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  status VARCHAR(20) DEFAULT 'inactive',
  config JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_agents_owner_id ON agents(owner_id);
CREATE INDEX idx_agents_category ON agents(category);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_created_at ON agents(created_at);

-- 工作流表
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  status VARCHAR(20) DEFAULT 'inactive',
  definition JSONB NOT NULL DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_workflows_owner_id ON workflows(owner_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_created_at ON workflows(created_at);

-- 执行记录表
CREATE TABLE execution_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  metrics JSONB DEFAULT '{}'
);

-- 创建索引
CREATE INDEX idx_execution_records_workflow_id ON execution_records(workflow_id);
CREATE INDEX idx_execution_records_agent_id ON execution_records(agent_id);
CREATE INDEX idx_execution_records_status ON execution_records(status);
CREATE INDEX idx_execution_records_start_time ON execution_records(start_time);

-- 验证记录表
CREATE TABLE validation_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  validator_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT NOW(),
  performance_metrics JSONB NOT NULL DEFAULT '{}',
  quality_score JSONB NOT NULL DEFAULT '{}',
  recommendations TEXT[],
  issues JSONB DEFAULT '[]'
);

-- 创建索引
CREATE INDEX idx_validation_records_agent_id ON validation_records(agent_id);
CREATE INDEX idx_validation_records_validator_id ON validation_records(validator_id);
CREATE INDEX idx_validation_records_timestamp ON validation_records(timestamp);

-- 会话表
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  active BOOLEAN DEFAULT true
);

-- 创建索引
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_active ON sessions(active);

-- 用户活动表
CREATE TABLE user_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address INET
);

-- 创建索引
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_type ON user_activities(type);
CREATE INDEX idx_user_activities_timestamp ON user_activities(timestamp);

-- API密钥表
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(64) UNIQUE NOT NULL,
  permissions TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP,
  expires_at TIMESTAMP,
  active BOOLEAN DEFAULT true
);

-- 创建索引
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(active);

-- Agent模板表
CREATE TABLE agent_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  template_data JSONB NOT NULL DEFAULT '{}',
  config_schema JSONB NOT NULL DEFAULT '{}',
  examples JSONB DEFAULT '[]',
  tags TEXT[],
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published BOOLEAN DEFAULT false
);

-- 创建索引
CREATE INDEX idx_agent_templates_category ON agent_templates(category);
CREATE INDEX idx_agent_templates_author_id ON agent_templates(author_id);
CREATE INDEX idx_agent_templates_published ON agent_templates(published);
CREATE INDEX idx_agent_templates_rating ON agent_templates(rating);

-- Agent市场评分表
CREATE TABLE agent_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES agent_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

-- 创建索引
CREATE INDEX idx_agent_ratings_template_id ON agent_ratings(template_id);
CREATE INDEX idx_agent_ratings_user_id ON agent_ratings(user_id);
CREATE INDEX idx_agent_ratings_rating ON agent_ratings(rating);

-- 数据存储表（用于Agent数据）
CREATE TABLE agent_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL,
  data_key VARCHAR(255) NOT NULL,
  data_value JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  UNIQUE(agent_id, data_type, data_key)
);

-- 创建索引
CREATE INDEX idx_agent_data_agent_id ON agent_data(agent_id);
CREATE INDEX idx_agent_data_type ON agent_data(data_type);
CREATE INDEX idx_agent_data_key ON agent_data(data_key);
CREATE INDEX idx_agent_data_expires_at ON agent_data(expires_at);

-- 系统配置表
CREATE TABLE system_config (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- 插入默认系统配置
INSERT INTO system_config (key, value, description) VALUES
('platform.version', '"1.0.0"', 'Platform version'),
('platform.maintenance_mode', 'false', 'Maintenance mode flag'),
('agents.max_execution_time', '300', 'Maximum agent execution time in seconds'),
('agents.max_memory_usage', '512', 'Maximum agent memory usage in MB'),
('agents.max_concurrent_executions', '10', 'Maximum concurrent agent executions'),
('marketplace.featured_templates', '[]', 'Featured agent templates'),
('notifications.email_enabled', 'true', 'Email notifications enabled'),
('security.max_login_attempts', '5', 'Maximum login attempts before lockout'),
('security.session_timeout', '604800', 'Session timeout in seconds (7 days)');

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表创建更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_templates_updated_at BEFORE UPDATE ON agent_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_data_updated_at BEFORE UPDATE ON agent_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建清理过期数据的函数
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- 清理过期会话
    DELETE FROM sessions WHERE expires_at < NOW();
    
    -- 清理过期Agent数据
    DELETE FROM agent_data WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    -- 清理旧的用户活动记录（保留90天）
    DELETE FROM user_activities WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- 清理旧的执行记录（保留30天）
    DELETE FROM execution_records WHERE start_time < NOW() - INTERVAL '30 days';
    
    -- 清理旧的验证记录（保留30天）
    DELETE FROM validation_records WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 创建定期清理任务（需要pg_cron扩展）
-- SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'SELECT cleanup_expired_data();');