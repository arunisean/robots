-- 多Agent平台数据库初始化脚本

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    subscription JSONB DEFAULT '{}',
    profile JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent表
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('work', 'process', 'publish', 'validate')),
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'running', 'error', 'paused')),
    config JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 索引
    CONSTRAINT agents_name_owner_unique UNIQUE (name, owner_id)
);

-- 工作流表
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived', 'error')),
    definition JSONB NOT NULL DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 索引
    CONSTRAINT workflows_name_owner_unique UNIQUE (name, owner_id)
);

-- 执行记录表
CREATE TABLE execution_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled', 'timeout')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- milliseconds
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    error_details JSONB,
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 验证记录表
CREATE TABLE validation_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    validator_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    score JSONB NOT NULL DEFAULT '{}',
    metrics JSONB NOT NULL DEFAULT '{}',
    analysis JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    alerts JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 数据源表
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    authentication JSONB DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- 采集数据表
CREATE TABLE collected_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    url TEXT,
    title TEXT,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    media JSONB DEFAULT '[]',
    hash VARCHAR(64) NOT NULL, -- 用于去重
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT false,
    
    -- 索引
    UNIQUE (hash, source_id)
);

-- 处理数据表
CREATE TABLE processed_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_data_id UUID REFERENCES collected_data(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    original_data JSONB,
    processed_content JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    quality_score JSONB DEFAULT '{}',
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published BOOLEAN DEFAULT false
);

-- 发布记录表
CREATE TABLE publish_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID REFERENCES processed_data(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
    platform_id TEXT, -- 平台返回的ID
    url TEXT, -- 发布后的URL
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    metrics JSONB DEFAULT '{}',
    error JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 会话表
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    active BOOLEAN DEFAULT true,
    
    -- 索引
    UNIQUE (token_hash)
);

-- 用户活动表
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET
);

-- API密钥表
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(64) NOT NULL,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT true,
    
    -- 索引
    UNIQUE (key_hash)
);

-- 工作流模板表
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    tags JSONB DEFAULT '[]',
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_time INTEGER, -- minutes
    workflow_definition JSONB NOT NULL,
    parameters JSONB DEFAULT '[]',
    instructions JSONB DEFAULT '[]',
    examples JSONB DEFAULT '[]',
    author VARCHAR(255),
    rating DECIMAL(3,2) DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent模板表
CREATE TABLE agent_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('work', 'process', 'publish', 'validate')),
    tags JSONB DEFAULT '[]',
    template_definition JSONB NOT NULL,
    config_schema JSONB NOT NULL,
    code_template TEXT,
    dependencies JSONB DEFAULT '[]',
    examples JSONB DEFAULT '[]',
    author VARCHAR(255),
    rating DECIMAL(3,2) DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_agents_category ON agents(category);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_owner_id ON agents(owner_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_owner_id ON workflows(owner_id);
CREATE INDEX idx_execution_records_workflow_id ON execution_records(workflow_id);
CREATE INDEX idx_execution_records_agent_id ON execution_records(agent_id);
CREATE INDEX idx_execution_records_status ON execution_records(status);
CREATE INDEX idx_execution_records_start_time ON execution_records(start_time);
CREATE INDEX idx_validation_records_agent_id ON validation_records(agent_id);
CREATE INDEX idx_validation_records_validator_id ON validation_records(validator_id);
CREATE INDEX idx_validation_records_timestamp ON validation_records(timestamp);
CREATE INDEX idx_collected_data_hash ON collected_data(hash);
CREATE INDEX idx_collected_data_collected_at ON collected_data(collected_at);
CREATE INDEX idx_processed_data_processed_at ON processed_data(processed_at);
CREATE INDEX idx_publish_records_status ON publish_records(status);
CREATE INDEX idx_publish_records_platform ON publish_records(platform);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_timestamp ON user_activities(timestamp);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表创建更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON workflow_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_templates_updated_at BEFORE UPDATE ON agent_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认数据

-- 插入默认Agent模板
INSERT INTO agent_templates (name, description, category, template_definition, config_schema, code_template, author) VALUES
('Web Scraper', '通用网页抓取Agent模板', 'work', 
 '{"type": "web_scraper", "features": ["css_selectors", "xpath", "anti_bot"]}',
 '{"properties": {"url": {"type": "string"}, "selectors": {"type": "object"}}}',
 'class WebScraperAgent extends WorkAgent { /* template code */ }',
 'System'),
 
('Content Generator', 'AI内容生成Agent模板', 'process',
 '{"type": "content_generator", "features": ["llm_integration", "templates", "quality_control"]}',
 '{"properties": {"llm_config": {"type": "object"}, "template": {"type": "string"}}}',
 'class ContentGeneratorAgent extends ProcessAgent { /* template code */ }',
 'System'),
 
('Twitter Publisher', 'Twitter发布Agent模板', 'publish',
 '{"type": "twitter_publisher", "features": ["media_upload", "thread_support", "scheduling"]}',
 '{"properties": {"api_credentials": {"type": "object"}, "format_config": {"type": "object"}}}',
 'class TwitterPublisherAgent extends PublishAgent { /* template code */ }',
 'System'),
 
('Performance Monitor', '性能监控验证Agent模板', 'validate',
 '{"type": "performance_monitor", "features": ["metrics_collection", "trend_analysis", "alerting"]}',
 '{"properties": {"metrics": {"type": "array"}, "thresholds": {"type": "object"}}}',
 'class PerformanceMonitorAgent extends ValidateAgent { /* template code */ }',
 'System');

-- 插入默认工作流模板
INSERT INTO workflow_templates (name, description, category, difficulty, estimated_time, workflow_definition, author) VALUES
('Basic Content Pipeline', '基础内容处理流水线：采集 -> 处理 -> 发布', 'content', 'beginner', 30,
 '{"nodes": [{"type": "work", "name": "Data Collector"}, {"type": "process", "name": "Content Processor"}, {"type": "publish", "name": "Content Publisher"}]}',
 'System'),
 
('Social Media Automation', '社交媒体自动化：监控 -> 生成 -> 发布 -> 验证', 'social', 'intermediate', 60,
 '{"nodes": [{"type": "work", "name": "Social Monitor"}, {"type": "process", "name": "Response Generator"}, {"type": "publish", "name": "Multi-Platform Publisher"}, {"type": "validate", "name": "Performance Tracker"}]}',
 'System');

-- 创建视图
CREATE VIEW agent_stats AS
SELECT 
    a.id,
    a.name,
    a.category,
    a.status,
    COUNT(er.id) as total_executions,
    COUNT(CASE WHEN er.status = 'success' THEN 1 END) as successful_executions,
    COUNT(CASE WHEN er.status = 'failed' THEN 1 END) as failed_executions,
    AVG(er.duration) as avg_execution_time,
    MAX(er.start_time) as last_executed
FROM agents a
LEFT JOIN execution_records er ON a.id = er.agent_id
GROUP BY a.id, a.name, a.category, a.status;

CREATE VIEW user_dashboard AS
SELECT 
    u.id,
    u.wallet_address,
    COUNT(DISTINCT a.id) as total_agents,
    COUNT(DISTINCT w.id) as total_workflows,
    COUNT(DISTINCT er.id) as total_executions,
    COALESCE(AVG(CASE WHEN er.status = 'success' THEN 1.0 ELSE 0.0 END) * 100, 0) as success_rate
FROM users u
LEFT JOIN agents a ON u.id = a.owner_id
LEFT JOIN workflows w ON u.id = w.owner_id
LEFT JOIN execution_records er ON a.id = er.agent_id
GROUP BY u.id, u.wallet_address;

-- 创建函数
CREATE OR REPLACE FUNCTION get_agent_performance(agent_uuid UUID, days INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    executions BIGINT,
    success_rate DECIMAL,
    avg_duration DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        er.start_time::DATE as date,
        COUNT(*) as executions,
        ROUND(AVG(CASE WHEN er.status = 'success' THEN 1.0 ELSE 0.0 END) * 100, 2) as success_rate,
        ROUND(AVG(er.duration), 2) as avg_duration
    FROM execution_records er
    WHERE er.agent_id = agent_uuid
        AND er.start_time >= NOW() - INTERVAL '1 day' * days
    GROUP BY er.start_time::DATE
    ORDER BY date;
END;
$$ LANGUAGE plpgsql;