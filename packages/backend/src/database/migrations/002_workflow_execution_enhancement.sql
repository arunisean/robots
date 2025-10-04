-- Workflow Execution Enhancement Migration
-- Adds tables and columns for enhanced workflow execution tracking

-- Workflow executions table (separate from execution_records for better organization)
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP,
  duration INTEGER, -- in milliseconds
  triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  trigger_type VARCHAR(50) DEFAULT 'manual', -- manual, scheduled, webhook, api
  input_data JSONB DEFAULT '{}',
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for workflow_executions
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_start_time ON workflow_executions(start_time);
CREATE INDEX idx_workflow_executions_triggered_by ON workflow_executions(triggered_by);

-- Agent execution results table (detailed results for each agent in a workflow)
CREATE TABLE agent_execution_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL, -- Agent ID from workflow definition
  agent_type VARCHAR(100) NOT NULL,
  agent_category VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  order_index INTEGER NOT NULL, -- Execution order in workflow
  input_data JSONB,
  output_data JSONB,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL, -- in milliseconds
  error TEXT,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for agent_execution_results
CREATE INDEX idx_agent_results_execution_id ON agent_execution_results(execution_id);
CREATE INDEX idx_agent_results_agent_id ON agent_execution_results(agent_id);
CREATE INDEX idx_agent_results_status ON agent_execution_results(status);
CREATE INDEX idx_agent_results_order_index ON agent_execution_results(order_index);

-- Add columns to workflows table for better tracking
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS last_executed_at TIMESTAMP;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS execution_count INTEGER DEFAULT 0;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS avg_execution_time INTEGER; -- in milliseconds

-- Workflow templates table (for example workflows)
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
  definition JSONB NOT NULL,
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  tags TEXT[],
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0,
  featured BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for workflow_templates
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_difficulty ON workflow_templates(difficulty);
CREATE INDEX idx_workflow_templates_author_id ON workflow_templates(author_id);
CREATE INDEX idx_workflow_templates_published ON workflow_templates(published);
CREATE INDEX idx_workflow_templates_featured ON workflow_templates(featured);
CREATE INDEX idx_workflow_templates_rating ON workflow_templates(rating);

-- Workflow template ratings
CREATE TABLE workflow_template_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

-- Create indexes for workflow_template_ratings
CREATE INDEX idx_workflow_template_ratings_template_id ON workflow_template_ratings(template_id);
CREATE INDEX idx_workflow_template_ratings_user_id ON workflow_template_ratings(user_id);

-- Execution events table (for real-time monitoring)
CREATE TABLE execution_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- started, agent_started, agent_progress, agent_completed, agent_failed, completed, failed
  agent_id VARCHAR(255), -- null for workflow-level events
  data JSONB DEFAULT '{}',
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for execution_events
CREATE INDEX idx_execution_events_execution_id ON execution_events(execution_id);
CREATE INDEX idx_execution_events_event_type ON execution_events(event_type);
CREATE INDEX idx_execution_events_timestamp ON execution_events(timestamp);
CREATE INDEX idx_execution_events_agent_id ON execution_events(agent_id);

-- Function to update workflow statistics
CREATE OR REPLACE FUNCTION update_workflow_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update workflow statistics when execution completes
    IF NEW.status IN ('completed', 'failed') AND (OLD IS NULL OR OLD.status != NEW.status) THEN
      UPDATE workflows
      SET 
        last_executed_at = NEW.end_time,
        execution_count = execution_count + 1,
        success_count = success_count + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
        failure_count = failure_count + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
        avg_execution_time = (
          SELECT AVG(duration)::INTEGER
          FROM workflow_executions
          WHERE workflow_id = NEW.workflow_id AND duration IS NOT NULL
        )
      WHERE id = NEW.workflow_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for workflow statistics
CREATE TRIGGER update_workflow_stats_trigger
AFTER INSERT OR UPDATE ON workflow_executions
FOR EACH ROW
EXECUTE FUNCTION update_workflow_stats();

-- Function to calculate execution duration
CREATE OR REPLACE FUNCTION calculate_execution_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.duration = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for duration calculation
CREATE TRIGGER calculate_workflow_execution_duration
BEFORE UPDATE ON workflow_executions
FOR EACH ROW
WHEN (NEW.end_time IS NOT NULL AND OLD.end_time IS NULL)
EXECUTE FUNCTION calculate_execution_duration();

CREATE TRIGGER calculate_agent_execution_duration
BEFORE INSERT OR UPDATE ON agent_execution_results
FOR EACH ROW
WHEN (NEW.end_time IS NOT NULL)
EXECUTE FUNCTION calculate_execution_duration();

-- Add trigger to workflow_templates
CREATE TRIGGER update_workflow_templates_updated_at 
BEFORE UPDATE ON workflow_templates 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Insert example workflow templates
INSERT INTO workflow_templates (name, description, category, difficulty, definition, settings, metadata, tags, published, featured) VALUES
(
  'Tech News Aggregator',
  'Scrape tech news from Hacker News, summarize with AI, and publish to Twitter',
  'content',
  'beginner',
  '{
    "nodes": [
      {
        "id": "agent-1",
        "type": "work.web_scraper",
        "category": "WORK",
        "order": 1,
        "config": {
          "dataSources": [{
            "type": "WEB_SCRAPING",
            "url": "https://news.ycombinator.com",
            "selectors": {
              "title": ".titleline > a",
              "url": ".titleline > a::attr(href)"
            }
          }]
        }
      },
      {
        "id": "agent-2",
        "type": "process.text_processor",
        "category": "PROCESS",
        "order": 2,
        "config": {
          "processingRules": [{
            "name": "summarize",
            "type": "CONTENT_GENERATION",
            "config": {
              "contentGeneration": {
                "style": "casual",
                "length": "short"
              }
            }
          }]
        }
      },
      {
        "id": "agent-3",
        "type": "publish.twitter",
        "category": "PUBLISH",
        "order": 3,
        "config": {
          "publishTargets": [{
            "platform": "TWITTER"
          }]
        }
      },
      {
        "id": "agent-4",
        "type": "validate.performance_monitor",
        "category": "VALIDATE",
        "order": 4,
        "config": {
          "validationRules": [{
            "type": "PERFORMANCE",
            "threshold": 0.8
          }]
        }
      }
    ],
    "connections": [
      {"from": "agent-1", "to": "agent-2"},
      {"from": "agent-2", "to": "agent-3"},
      {"from": "agent-3", "to": "agent-4"}
    ]
  }',
  '{
    "maxConcurrentExecutions": 1,
    "executionTimeout": 1800,
    "retryPolicy": {
      "enabled": true,
      "maxRetries": 3
    }
  }',
  '{
    "estimatedTime": "5-10 minutes",
    "requiredCredentials": ["twitter_api"],
    "complexity": "low"
  }',
  ARRAY['news', 'twitter', 'automation', 'ai'],
  true,
  true
),
(
  'RSS Feed Processor',
  'Collect RSS feeds, transform data, and publish to website',
  'content',
  'beginner',
  '{
    "nodes": [
      {
        "id": "agent-1",
        "type": "work.rss_collector",
        "category": "WORK",
        "order": 1,
        "config": {
          "dataSources": [{
            "type": "RSS_FEED",
            "url": "https://example.com/feed.xml"
          }]
        }
      },
      {
        "id": "agent-2",
        "type": "process.data_transformer",
        "category": "PROCESS",
        "order": 2,
        "config": {
          "processingRules": [{
            "name": "transform",
            "type": "DATA_TRANSFORMATION"
          }]
        }
      },
      {
        "id": "agent-3",
        "type": "publish.website",
        "category": "PUBLISH",
        "order": 3,
        "config": {
          "publishTargets": [{
            "platform": "WEBSITE"
          }]
        }
      }
    ],
    "connections": [
      {"from": "agent-1", "to": "agent-2"},
      {"from": "agent-2", "to": "agent-3"}
    ]
  }',
  '{}',
  '{
    "estimatedTime": "3-5 minutes",
    "complexity": "low"
  }',
  ARRAY['rss', 'website', 'automation'],
  true,
  false
);

-- Create view for execution statistics
CREATE OR REPLACE VIEW workflow_execution_stats AS
SELECT 
  w.id as workflow_id,
  w.name as workflow_name,
  w.status as workflow_status,
  COUNT(we.id) as total_executions,
  COUNT(CASE WHEN we.status = 'completed' THEN 1 END) as successful_executions,
  COUNT(CASE WHEN we.status = 'failed' THEN 1 END) as failed_executions,
  COUNT(CASE WHEN we.status = 'running' THEN 1 END) as running_executions,
  AVG(we.duration) as avg_duration_ms,
  MAX(we.start_time) as last_execution_time
FROM workflows w
LEFT JOIN workflow_executions we ON w.id = we.workflow_id
GROUP BY w.id, w.name, w.status;

-- Create view for agent performance
CREATE OR REPLACE VIEW agent_performance_stats AS
SELECT 
  aer.agent_type,
  aer.agent_category,
  COUNT(*) as total_executions,
  COUNT(CASE WHEN aer.status = 'success' THEN 1 END) as successful_executions,
  COUNT(CASE WHEN aer.status = 'failed' THEN 1 END) as failed_executions,
  AVG(aer.duration) as avg_duration_ms,
  MIN(aer.duration) as min_duration_ms,
  MAX(aer.duration) as max_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY aer.duration) as median_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY aer.duration) as p95_duration_ms
FROM agent_execution_results aer
GROUP BY aer.agent_type, aer.agent_category;

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
