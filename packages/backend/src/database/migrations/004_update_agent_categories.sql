-- Migration: Update agent categories from content-focused to trading-focused
-- Work -> Monitor, Process -> Analyze, Publish -> Execute, Validate -> Verify

-- Update agents table category values
UPDATE agents 
SET category = CASE 
  WHEN category = 'work' THEN 'monitor'
  WHEN category = 'process' THEN 'analyze'
  WHEN category = 'publish' THEN 'execute'
  WHEN category = 'validate' THEN 'verify'
  ELSE category
END
WHERE category IN ('work', 'process', 'publish', 'validate');

-- Update workflows table - update agent categories in definition JSON
UPDATE workflows 
SET definition = jsonb_set(
  definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        node,
        '{agentCategory}',
        to_jsonb(
          CASE node->>'agentCategory'
            WHEN 'work' THEN 'monitor'
            WHEN 'process' THEN 'analyze'
            WHEN 'publish' THEN 'execute'
            WHEN 'validate' THEN 'verify'
            ELSE node->>'agentCategory'
          END
        )
      )
    )
    FROM jsonb_array_elements(definition->'nodes') AS node
  )
)
WHERE definition->'nodes' IS NOT NULL;

-- Update agent_execution_results table
UPDATE agent_execution_results
SET agent_category = CASE 
  WHEN agent_category = 'work' THEN 'monitor'
  WHEN agent_category = 'process' THEN 'analyze'
  WHEN agent_category = 'publish' THEN 'execute'
  WHEN agent_category = 'validate' THEN 'verify'
  ELSE agent_category
END
WHERE agent_category IN ('work', 'process', 'publish', 'validate');

-- Update workflow_templates table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_templates') THEN
    UPDATE workflow_templates 
    SET definition = jsonb_set(
      definition,
      '{nodes}',
      (
        SELECT jsonb_agg(
          jsonb_set(
            node,
            '{agentCategory}',
            to_jsonb(
              CASE node->>'agentCategory'
                WHEN 'work' THEN 'monitor'
                WHEN 'process' THEN 'analyze'
                WHEN 'publish' THEN 'execute'
                WHEN 'validate' THEN 'verify'
                ELSE node->>'agentCategory'
              END
            )
          )
        )
        FROM jsonb_array_elements(definition->'nodes') AS node
      )
    )
    WHERE definition->'nodes' IS NOT NULL;
  END IF;
END $$;

-- Add comment to document the migration
COMMENT ON TABLE agents IS 'Agent categories updated: work->monitor, process->analyze, publish->execute, validate->verify (Migration 004)';
