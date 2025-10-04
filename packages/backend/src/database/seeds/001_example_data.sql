-- Example seed data for development and testing
-- This file creates example users, workflows, and execution history

-- Create example user (for development)
INSERT INTO users (id, wallet_address, preferences, profile) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '0x1234567890123456789012345678901234567890',
  '{
    "theme": "dark",
    "notifications": {
      "email": true,
      "browser": true
    },
    "language": "en"
  }',
  '{
    "displayName": "Demo User",
    "bio": "Platform demo user",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=demo"
  }'
)
ON CONFLICT (wallet_address) DO NOTHING;

-- Create example workflows
INSERT INTO workflows (id, name, description, version, status, definition, settings, metadata, owner_id) VALUES
(
  '10000000-0000-0000-0000-000000000001',
  'Tech News to Twitter',
  'Automatically scrape tech news and post summaries to Twitter',
  '1.0.0',
  'active',
  '{
    "nodes": [
      {
        "id": "scraper-1",
        "type": "work.web_scraper",
        "category": "WORK",
        "order": 1,
        "config": {
          "id": "scraper-1",
          "name": "HN Scraper",
          "category": "WORK",
          "dataSources": [{
            "id": "hn-source",
            "type": "WEB_SCRAPING",
            "url": "https://news.ycombinator.com",
            "selectors": {
              "title": ".titleline > a",
              "url": ".titleline > a::attr(href)",
              "points": ".score"
            },
            "pagination": {
              "enabled": false
            }
          }],
          "resources": {
            "memory": 256,
            "cpu": 0.5,
            "timeout": 300
          }
        }
      },
      {
        "id": "processor-1",
        "type": "process.text_processor",
        "category": "PROCESS",
        "order": 2,
        "config": {
          "id": "processor-1",
          "name": "Content Summarizer",
          "category": "PROCESS",
          "processingRules": [{
            "name": "summarize-news",
            "type": "CONTENT_GENERATION",
            "order": 1,
            "enabled": true,
            "config": {
              "contentGeneration": {
                "style": "casual",
                "tone": "neutral",
                "length": "short"
              }
            }
          }],
          "resources": {
            "memory": 512,
            "cpu": 1,
            "timeout": 600
          }
        }
      },
      {
        "id": "publisher-1",
        "type": "publish.twitter",
        "category": "PUBLISH",
        "order": 3,
        "config": {
          "id": "publisher-1",
          "name": "Twitter Publisher",
          "category": "PUBLISH",
          "publishTargets": [{
            "id": "twitter-main",
            "platform": "TWITTER",
            "credentials": {
              "apiKey": "demo_key",
              "apiSecret": "demo_secret"
            }
          }],
          "resources": {
            "memory": 256,
            "cpu": 0.5,
            "timeout": 180
          }
        }
      },
      {
        "id": "validator-1",
        "type": "validate.performance_monitor",
        "category": "VALIDATE",
        "order": 4,
        "config": {
          "id": "validator-1",
          "name": "Performance Monitor",
          "category": "VALIDATE",
          "validationRules": [{
            "name": "check-performance",
            "type": "PERFORMANCE",
            "threshold": 0.8,
            "enabled": true
          }],
          "resources": {
            "memory": 384,
            "cpu": 0.5,
            "timeout": 240
          }
        }
      }
    ],
    "connections": [
      {"from": "scraper-1", "to": "processor-1"},
      {"from": "processor-1", "to": "publisher-1"},
      {"from": "publisher-1", "to": "validator-1"}
    ]
  }',
  '{
    "maxConcurrentExecutions": 1,
    "executionTimeout": 1800,
    "retryPolicy": {
      "enabled": true,
      "maxRetries": 3,
      "backoffStrategy": "exponential",
      "backoffMs": 1000
    },
    "errorHandling": {
      "strategy": "stop",
      "notifyOnError": true
    },
    "logging": {
      "level": "info",
      "retention": 30,
      "includeData": false
    }
  }',
  '{
    "tags": ["news", "twitter", "automation"],
    "category": "content",
    "estimatedTime": "5-10 minutes",
    "requiredCredentials": ["twitter_api"]
  }',
  '00000000-0000-0000-0000-000000000001'
),
(
  '10000000-0000-0000-0000-000000000002',
  'RSS to Website',
  'Collect RSS feeds and publish to website',
  '1.0.0',
  'draft',
  '{
    "nodes": [
      {
        "id": "rss-1",
        "type": "work.rss_collector",
        "category": "WORK",
        "order": 1,
        "config": {
          "id": "rss-1",
          "name": "RSS Collector",
          "category": "WORK",
          "dataSources": [{
            "id": "rss-source",
            "type": "RSS_FEED",
            "url": "https://example.com/feed.xml"
          }]
        }
      },
      {
        "id": "transformer-1",
        "type": "process.data_transformer",
        "category": "PROCESS",
        "order": 2,
        "config": {
          "id": "transformer-1",
          "name": "Data Transformer",
          "category": "PROCESS",
          "processingRules": [{
            "name": "transform-data",
            "type": "DATA_TRANSFORMATION",
            "order": 1,
            "enabled": true
          }]
        }
      },
      {
        "id": "website-1",
        "type": "publish.website",
        "category": "PUBLISH",
        "order": 3,
        "config": {
          "id": "website-1",
          "name": "Website Publisher",
          "category": "PUBLISH",
          "publishTargets": [{
            "id": "website-main",
            "platform": "WEBSITE"
          }]
        }
      }
    ],
    "connections": [
      {"from": "rss-1", "to": "transformer-1"},
      {"from": "transformer-1", "to": "website-1"}
    ]
  }',
  '{}',
  '{
    "tags": ["rss", "website"],
    "category": "content"
  }',
  '00000000-0000-0000-0000-000000000001'
);

-- Create example execution history
INSERT INTO workflow_executions (id, workflow_id, status, start_time, end_time, duration, triggered_by, trigger_type, input_data, metadata) VALUES
(
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'completed',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours' + INTERVAL '5 minutes',
  300000,
  '00000000-0000-0000-0000-000000000001',
  'manual',
  '{}',
  '{
    "note": "First test execution"
  }'
),
(
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'completed',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour' + INTERVAL '4 minutes 30 seconds',
  270000,
  '00000000-0000-0000-0000-000000000001',
  'manual',
  '{}',
  '{
    "note": "Second test execution"
  }'
),
(
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  'failed',
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '30 minutes' + INTERVAL '2 minutes',
  120000,
  '00000000-0000-0000-0000-000000000001',
  'manual',
  '{}',
  '{
    "note": "Failed execution for testing"
  }'
);

-- Create example agent execution results
INSERT INTO agent_execution_results (execution_id, agent_id, agent_type, agent_category, status, order_index, input_data, output_data, start_time, end_time, duration, metrics) VALUES
-- First execution - all successful
(
  '20000000-0000-0000-0000-000000000001',
  'scraper-1',
  'work.web_scraper',
  'WORK',
  'success',
  1,
  '{}',
  '{
    "itemsCollected": 30,
    "source": "https://news.ycombinator.com"
  }',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours' + INTERVAL '1 minute',
  60000,
  '{
    "memoryUsed": 128,
    "cpuTime": 0.3,
    "networkCalls": 1
  }'
),
(
  '20000000-0000-0000-0000-000000000001',
  'processor-1',
  'process.text_processor',
  'PROCESS',
  'success',
  2,
  '{
    "itemsCollected": 30
  }',
  '{
    "itemsProcessed": 30,
    "summaries": []
  }',
  NOW() - INTERVAL '2 hours' + INTERVAL '1 minute',
  NOW() - INTERVAL '2 hours' + INTERVAL '3 minutes',
  120000,
  '{
    "memoryUsed": 256,
    "cpuTime": 0.8,
    "llmCalls": 30
  }'
),
(
  '20000000-0000-0000-0000-000000000001',
  'publisher-1',
  'publish.twitter',
  'PUBLISH',
  'success',
  3,
  '{
    "itemsProcessed": 30
  }',
  '{
    "itemsPublished": 30,
    "platform": "twitter"
  }',
  NOW() - INTERVAL '2 hours' + INTERVAL '3 minutes',
  NOW() - INTERVAL '2 hours' + INTERVAL '4 minutes',
  60000,
  '{
    "memoryUsed": 128,
    "cpuTime": 0.2,
    "networkCalls": 30
  }'
),
(
  '20000000-0000-0000-0000-000000000001',
  'validator-1',
  'validate.performance_monitor',
  'VALIDATE',
  'success',
  4,
  '{
    "itemsPublished": 30
  }',
  '{
    "validationScore": 0.95,
    "issues": []
  }',
  NOW() - INTERVAL '2 hours' + INTERVAL '4 minutes',
  NOW() - INTERVAL '2 hours' + INTERVAL '5 minutes',
  60000,
  '{
    "memoryUsed": 192,
    "cpuTime": 0.4
  }'
),
-- Second execution - all successful
(
  '20000000-0000-0000-0000-000000000002',
  'scraper-1',
  'work.web_scraper',
  'WORK',
  'success',
  1,
  '{}',
  '{
    "itemsCollected": 28
  }',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour' + INTERVAL '50 seconds',
  50000,
  '{
    "memoryUsed": 120,
    "cpuTime": 0.25
  }'
),
(
  '20000000-0000-0000-0000-000000000002',
  'processor-1',
  'process.text_processor',
  'PROCESS',
  'success',
  2,
  '{
    "itemsCollected": 28
  }',
  '{
    "itemsProcessed": 28
  }',
  NOW() - INTERVAL '1 hour' + INTERVAL '50 seconds',
  NOW() - INTERVAL '1 hour' + INTERVAL '2 minutes 40 seconds',
  110000,
  '{
    "memoryUsed": 240,
    "cpuTime": 0.75
  }'
),
(
  '20000000-0000-0000-0000-000000000002',
  'publisher-1',
  'publish.twitter',
  'PUBLISH',
  'success',
  3,
  '{
    "itemsProcessed": 28
  }',
  '{
    "itemsPublished": 28
  }',
  NOW() - INTERVAL '1 hour' + INTERVAL '2 minutes 40 seconds',
  NOW() - INTERVAL '1 hour' + INTERVAL '3 minutes 30 seconds',
  50000,
  '{
    "memoryUsed": 125,
    "cpuTime": 0.2
  }'
),
(
  '20000000-0000-0000-0000-000000000002',
  'validator-1',
  'validate.performance_monitor',
  'VALIDATE',
  'success',
  4,
  '{
    "itemsPublished": 28
  }',
  '{
    "validationScore": 0.92
  }',
  NOW() - INTERVAL '1 hour' + INTERVAL '3 minutes 30 seconds',
  NOW() - INTERVAL '1 hour' + INTERVAL '4 minutes 30 seconds',
  60000,
  '{
    "memoryUsed": 190,
    "cpuTime": 0.38
  }'
),
-- Third execution - failed at processor
(
  '20000000-0000-0000-0000-000000000003',
  'scraper-1',
  'work.web_scraper',
  'WORK',
  'success',
  1,
  '{}',
  '{
    "itemsCollected": 25
  }',
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '30 minutes' + INTERVAL '45 seconds',
  45000,
  '{
    "memoryUsed": 115,
    "cpuTime": 0.22
  }'
),
(
  '20000000-0000-0000-0000-000000000003',
  'processor-1',
  'process.text_processor',
  'PROCESS',
  'failed',
  2,
  '{
    "itemsCollected": 25
  }',
  '{}',
  NOW() - INTERVAL '30 minutes' + INTERVAL '45 seconds',
  NOW() - INTERVAL '30 minutes' + INTERVAL '2 minutes',
  75000,
  '{
    "memoryUsed": 512,
    "cpuTime": 0.9
  }'
);

-- Update the workflow statistics (trigger will handle this, but we can set initial values)
UPDATE workflows 
SET 
  last_executed_at = NOW() - INTERVAL '30 minutes',
  execution_count = 3,
  success_count = 2,
  failure_count = 1,
  avg_execution_time = 230000
WHERE id = '10000000-0000-0000-0000-000000000001';

-- Create some execution events for the latest execution
INSERT INTO execution_events (execution_id, event_type, agent_id, data, timestamp) VALUES
('20000000-0000-0000-0000-000000000003', 'started', NULL, '{"workflowId": "10000000-0000-0000-0000-000000000001"}', NOW() - INTERVAL '30 minutes'),
('20000000-0000-0000-0000-000000000003', 'agent_started', 'scraper-1', '{"agentType": "work.web_scraper"}', NOW() - INTERVAL '30 minutes'),
('20000000-0000-0000-0000-000000000003', 'agent_progress', 'scraper-1', '{"progress": 50, "message": "Scraping in progress"}', NOW() - INTERVAL '30 minutes' + INTERVAL '20 seconds'),
('20000000-0000-0000-0000-000000000003', 'agent_completed', 'scraper-1', '{"itemsCollected": 25}', NOW() - INTERVAL '30 minutes' + INTERVAL '45 seconds'),
('20000000-0000-0000-0000-000000000003', 'agent_started', 'processor-1', '{"agentType": "process.text_processor"}', NOW() - INTERVAL '30 minutes' + INTERVAL '45 seconds'),
('20000000-0000-0000-0000-000000000003', 'agent_progress', 'processor-1', '{"progress": 30, "message": "Processing items"}', NOW() - INTERVAL '30 minutes' + INTERVAL '1 minute 15 seconds'),
('20000000-0000-0000-0000-000000000003', 'agent_failed', 'processor-1', '{"error": "LLM service timeout"}', NOW() - INTERVAL '30 minutes' + INTERVAL '2 minutes'),
('20000000-0000-0000-0000-000000000003', 'failed', NULL, '{"error": "Workflow failed at processor-1"}', NOW() - INTERVAL '30 minutes' + INTERVAL '2 minutes');

-- Create user activity records
INSERT INTO user_activities (user_id, type, description, metadata, timestamp, ip_address) VALUES
('00000000-0000-0000-0000-000000000001', 'workflow_created', 'Created workflow: Tech News to Twitter', '{"workflowId": "10000000-0000-0000-0000-000000000001"}', NOW() - INTERVAL '1 day', '127.0.0.1'),
('00000000-0000-0000-0000-000000000001', 'workflow_executed', 'Executed workflow: Tech News to Twitter', '{"workflowId": "10000000-0000-0000-0000-000000000001", "executionId": "20000000-0000-0000-0000-000000000001"}', NOW() - INTERVAL '2 hours', '127.0.0.1'),
('00000000-0000-0000-0000-000000000001', 'workflow_executed', 'Executed workflow: Tech News to Twitter', '{"workflowId": "10000000-0000-0000-0000-000000000001", "executionId": "20000000-0000-0000-0000-000000000002"}', NOW() - INTERVAL '1 hour', '127.0.0.1'),
('00000000-0000-0000-0000-000000000001', 'workflow_executed', 'Executed workflow: Tech News to Twitter', '{"workflowId": "10000000-0000-0000-0000-000000000001", "executionId": "20000000-0000-0000-0000-000000000003"}', NOW() - INTERVAL '30 minutes', '127.0.0.1');
