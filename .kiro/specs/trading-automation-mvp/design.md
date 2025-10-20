# Design Document

## Overview

This document outlines the technical design for transforming the Multi-Agent Automation Platform into a Web3 Trading Automation Platform. The design maintains the existing workflow execution architecture while adapting it for financial trading use cases through agent category restructuring, strategy template system, and enhanced user experience focused on zero-configuration trading automation.

### Design Principles

1. **Minimal Disruption**: Leverage existing workflow engine, database schema, and API structure
2. **User-First**: Hide technical complexity behind intuitive strategy templates
3. **Safety-First**: Enforce risk controls at the system level, not user discretion
4. **Incremental Enhancement**: Add parallel execution and conditional logic without full DAG rewrite
5. **Market-Ready**: Focus on 3 proven strategy templates that solve real trading problems

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Strategy   │  │  Monitoring  │  │     Risk     │      │
│  │   Library    │  │  Dashboard   │  │   Controls   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ REST API / WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Fastify)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Strategy Template Engine                    │   │
│  │  - Template Registry                                  │   │
│  │  - Parameter Validation                               │   │
│  │  - Workflow Generation                                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Enhanced Workflow Executor                    │   │
│  │  - Parallel Monitor Execution                         │   │
│  │  - Conditional Logic Engine                           │   │
│  │  - Risk Control Middleware                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Agent Runtime                            │   │
│  │  Monitor → Analyze → Execute → Verify                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              External Integrations                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Binance  │  │ Uniswap  │  │Etherscan │  │  Price   │   │
│  │   API    │  │   SDK    │  │   API    │  │  Feeds   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Agent Category Mapping


**Old Categories → New Categories:**

| Old Category | New Category | Purpose in Trading Context |
|-------------|--------------|---------------------------|
| Work        | Monitor      | Collect market data, prices, on-chain events |
| Process     | Analyze      | Generate trading signals, calculate indicators |
| Publish     | Execute      | Place orders, execute trades, manage positions |
| Validate    | Verify       | Confirm execution, calculate P&L, check risks |

**Migration Strategy:**
- Update enum values in `packages/shared/src/types/agent.ts`
- Add database migration to rename category values
- Maintain API compatibility with category aliases during transition period

## Components and Interfaces

### 1. Strategy Template System

#### StrategyTemplate Interface

```typescript
interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'arbitrage' | 'grid' | 'trend' | 'copy_trade' | 'defi';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  
  // User-configurable parameters
  parameters: TemplateParameter[];
  
  // Pre-configured workflow definition
  workflowDefinition: TradingWorkflowDefinition;
  
  // Risk profile
  riskProfile: RiskProfile;
  
  // Historical performance (optional)
  performance?: PerformanceMetrics;
  
  // Metadata
  tags: string[];
  author: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateParameter {
  key: string;
  label: string;
  description: string;
  type: 'number' | 'string' | 'token_pair' | 'percentage' | 'address';
  defaultValue: any;
  validation: {
    required: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
  unit?: string; // e.g., "USDT", "%", "seconds"
}

interface RiskProfile {
  level: 'low' | 'medium' | 'high';
  maxLossPerTrade: number; // percentage
  maxDailyLoss: number; // percentage
  maxPositionSize: number; // percentage of portfolio
  requiredCapital: number; // minimum in USDT
}

interface PerformanceMetrics {
  backtestPeriod: string;
  totalReturn: number; // percentage
  annualizedReturn: number; // percentage
  winRate: number; // percentage
  maxDrawdown: number; // percentage
  sharpeRatio: number;
  totalTrades: number;
}
```

#### TradingWorkflowDefinition Interface

```typescript
interface TradingWorkflowDefinition {
  trigger: TriggerConfig;
  
  stages: {
    monitor: MonitorStageConfig;
    analyze: AnalyzeStageConfig;
    decision: DecisionConfig;
    execute: ExecuteStageConfig;
    verify: VerifyStageConfig;
  };
  
  settings: TradingWorkflowSettings;
}

interface MonitorStageConfig {
  agents: MonitorAgentConfig[];
  executionMode: 'parallel' | 'sequential';
  timeout: number; // seconds
}

interface AnalyzeStageConfig {
  agents: AnalyzeAgentConfig[];
  executionMode: 'parallel' | 'sequential';
  aggregationStrategy: 'first' | 'last' | 'average' | 'weighted';
}

interface DecisionConfig {
  rules: DecisionRule[];
  operator: 'AND' | 'OR';
}

interface DecisionRule {
  field: string; // path to value in analyze output
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
  value: number | number[];
  description: string;
}

interface ExecuteStageConfig {
  agents: ExecuteAgentConfig[];
  executionMode: 'sequential'; // always sequential for trades
  requireConfirmation: boolean;
}

interface VerifyStageConfig {
  agent: VerifyAgentConfig;
  failureAction: 'retry' | 'alert' | 'rollback';
}

interface TradingWorkflowSettings {
  paperTrading: boolean;
  riskControls: RiskControlConfig;
  notifications: NotificationConfig;
  logging: LoggingConfig;
}
```

### 2. Enhanced Workflow Executor

#### Parallel Execution Support

```typescript
class EnhancedWorkflowExecutor {
  async executeMonitorStage(
    agents: MonitorAgentConfig[],
    context: ExecutionContext
  ): Promise<AggregatedMonitorOutput> {
    // Execute all monitor agents in parallel
    const results = await Promise.allSettled(
      agents.map(agent => this.executeAgent(agent, context))
    );
    
    // Aggregate successful results
    const successfulResults = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
    
    // Log failures but continue
    const failures = results
      .filter(r => r.status === 'rejected')
      .map(r => r.reason);
    
    if (failures.length > 0) {
      this.logger.warn('Some monitor agents failed', { failures });
    }
    
    return this.aggregateMonitorData(successfulResults);
  }
}
```

#### Conditional Execution Logic

```typescript
class DecisionEngine {
  evaluateRules(
    rules: DecisionRule[],
    operator: 'AND' | 'OR',
    data: any
  ): boolean {
    const results = rules.map(rule => this.evaluateRule(rule, data));
    
    return operator === 'AND'
      ? results.every(r => r)
      : results.some(r => r);
  }
  
  private evaluateRule(rule: DecisionRule, data: any): boolean {
    const value = this.getNestedValue(data, rule.field);
    
    switch (rule.operator) {
      case 'gt': return value > rule.value;
      case 'lt': return value < rule.value;
      case 'eq': return value === rule.value;
      case 'gte': return value >= rule.value;
      case 'lte': return value <= rule.value;
      case 'between':
        const [min, max] = rule.value as number[];
        return value >= min && value <= max;
      default: return false;
    }
  }
}
```

### 3. Risk Control Middleware

```typescript
interface RiskControlConfig {
  maxLossPerTrade: number; // percentage
  maxDailyLoss: number; // percentage
  maxPositionSize: number; // percentage
  maxConcurrentTrades: number;
  cooldownPeriod: number; // seconds after loss
}

class RiskControlMiddleware {
  private dailyLoss: Map<string, number> = new Map();
  private activeTrades: Map<string, number> = new Map();
  
  async checkBeforeExecution(
    userId: string,
    tradeSize: number,
    portfolioValue: number,
    config: RiskControlConfig
  ): Promise<RiskCheckResult> {
    const checks = [
      this.checkPositionSize(tradeSize, portfolioValue, config),
      this.checkDailyLoss(userId, config),
      this.checkConcurrentTrades(userId, config),
      this.checkCooldownPeriod(userId, config)
    ];
    
    const failures = checks.filter(c => !c.passed);
    
    return {
      allowed: failures.length === 0,
      failures: failures,
      warnings: this.generateWarnings(checks)
    };
  }
  
  async recordTradeResult(
    userId: string,
    profitLoss: number,
    timestamp: Date
  ): Promise<void> {
    // Update daily loss tracking
    const today = this.getDateKey(timestamp);
    const currentLoss = this.dailyLoss.get(`${userId}:${today}`) || 0;
    this.dailyLoss.set(`${userId}:${today}`, currentLoss + profitLoss);
    
    // Trigger alerts if thresholds exceeded
    if (profitLoss < 0) {
      await this.checkLossThresholds(userId, currentLoss + profitLoss);
    }
  }
}
```

### 4. Strategy Template Registry

```typescript
class StrategyTemplateRegistry {
  private templates: Map<string, StrategyTemplate> = new Map();
  
  registerTemplate(template: StrategyTemplate): void {
    this.validateTemplate(template);
    this.templates.set(template.id, template);
  }
  
  getTemplate(id: string): StrategyTemplate | undefined {
    return this.templates.get(id);
  }
  
  listTemplates(filters?: TemplateFilters): StrategyTemplate[] {
    let templates = Array.from(this.templates.values());
    
    if (filters?.category) {
      templates = templates.filter(t => t.category === filters.category);
    }
    
    if (filters?.difficulty) {
      templates = templates.filter(t => t.difficulty === filters.difficulty);
    }
    
    if (filters?.tags) {
      templates = templates.filter(t =>
        filters.tags!.some(tag => t.tags.includes(tag))
      );
    }
    
    return templates;
  }
  
  instantiateWorkflow(
    templateId: string,
    userParams: Record<string, any>,
    userId: string
  ): Workflow {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    // Validate user parameters
    this.validateParameters(template.parameters, userParams);
    
    // Generate workflow from template
    return this.generateWorkflow(template, userParams, userId);
  }
}
```

## Data Models

### Database Schema Changes

#### 1. Update Agent Categories (Migration)

```sql
-- Migration: Rename agent categories
UPDATE workflows 
SET definition = jsonb_set(
  definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'agentCategory' = 'work' THEN jsonb_set(node, '{agentCategory}', '"monitor"')
        WHEN node->>'agentCategory' = 'process' THEN jsonb_set(node, '{agentCategory}', '"analyze"')
        WHEN node->>'agentCategory' = 'publish' THEN jsonb_set(node, '{agentCategory}', '"execute"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(definition->'nodes') AS node
  )
);
```

#### 2. Strategy Templates Table

```sql
CREATE TABLE strategy_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  parameters JSONB NOT NULL,
  workflow_definition JSONB NOT NULL,
  risk_profile JSONB NOT NULL,
  performance_metrics JSONB,
  tags TEXT[],
  author_id UUID REFERENCES users(id),
  version VARCHAR(20) NOT NULL,
  published BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_strategy_templates_category ON strategy_templates(category);
CREATE INDEX idx_strategy_templates_difficulty ON strategy_templates(difficulty);
CREATE INDEX idx_strategy_templates_tags ON strategy_templates USING GIN(tags);
```

#### 3. User Strategy Instances Table

```sql
CREATE TABLE user_strategy_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  template_id UUID NOT NULL REFERENCES strategy_templates(id),
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  name VARCHAR(255) NOT NULL,
  parameters JSONB NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'active', 'paused', 'stopped'
  paper_trading BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_executed_at TIMESTAMP,
  total_trades INTEGER DEFAULT 0,
  total_profit_loss DECIMAL(20, 8) DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0
);

CREATE INDEX idx_user_strategy_instances_user ON user_strategy_instances(user_id);
CREATE INDEX idx_user_strategy_instances_status ON user_strategy_instances(status);
```

#### 4. Risk Control Events Table

```sql
CREATE TABLE risk_control_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  strategy_instance_id UUID REFERENCES user_strategy_instances(id),
  event_type VARCHAR(50) NOT NULL, -- 'max_loss_per_trade', 'max_daily_loss', etc.
  triggered_at TIMESTAMP DEFAULT NOW(),
  details JSONB NOT NULL,
  action_taken VARCHAR(50) NOT NULL -- 'paused', 'stopped', 'alerted'
);

CREATE INDEX idx_risk_control_events_user ON risk_control_events(user_id);
CREATE INDEX idx_risk_control_events_type ON risk_control_events(event_type);
```

#### 5. Exchange Credentials Table

```sql
CREATE TABLE exchange_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  exchange_name VARCHAR(50) NOT NULL, -- 'binance', 'okx', etc.
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  permissions JSONB, -- ['spot_trading', 'futures_trading']
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, exchange_name)
);

CREATE INDEX idx_exchange_credentials_user ON exchange_credentials(user_id);
```

### Type Definitions Updates

#### Updated AgentCategory Enum

```typescript
// packages/shared/src/types/agent.ts
export enum AgentCategory {
  MONITOR = 'monitor',   // formerly WORK
  ANALYZE = 'analyze',   // formerly PROCESS
  EXECUTE = 'execute',   // formerly PUBLISH
  VERIFY = 'verify'      // unchanged
}

// Backward compatibility aliases
export const AgentCategoryAliases = {
  work: AgentCategory.MONITOR,
  process: AgentCategory.ANALYZE,
  publish: AgentCategory.EXECUTE,
  validate: AgentCategory.VERIFY
};
```

## Error Handling

### Error Categories

1. **Configuration Errors**: Invalid parameters, missing credentials
2. **Execution Errors**: API failures, network timeouts, insufficient funds
3. **Risk Control Errors**: Threshold exceeded, position limit reached
4. **Data Errors**: Invalid market data, missing price feeds

### Error Handling Strategy

```typescript
class TradingErrorHandler {
  async handleError(
    error: Error,
    context: ExecutionContext,
    stage: 'monitor' | 'analyze' | 'execute' | 'verify'
  ): Promise<ErrorResolution> {
    const errorCategory = this.categorizeError(error);
    
    switch (errorCategory) {
      case 'transient':
        // Retry with exponential backoff
        return { action: 'retry', maxRetries: 3, backoffMs: 1000 };
        
      case 'configuration':
        // Stop and notify user
        return { action: 'stop', notify: true, reason: error.message };
        
      case 'risk_control':
        // Immediate stop, log event
        await this.logRiskEvent(context, error);
        return { action: 'stop', notify: true, critical: true };
        
      case 'insufficient_funds':
        // Pause and notify
        return { action: 'pause', notify: true, reason: 'Insufficient funds' };
        
      default:
        // Log and continue or stop based on stage
        return stage === 'execute'
          ? { action: 'stop', notify: true }
          : { action: 'continue', logWarning: true };
    }
  }
}
```

## Testing Strategy

### Unit Testing

- **Template Registry**: Parameter validation, workflow generation
- **Decision Engine**: Rule evaluation logic
- **Risk Control**: Threshold calculations, limit enforcement
- **Agent Execution**: Individual agent logic (mocked external APIs)

### Integration Testing

- **End-to-End Strategy Execution**: Full workflow from template to execution
- **Parallel Monitor Execution**: Multiple agents running concurrently
- **Conditional Logic**: Decision rules triggering/blocking execution
- **Risk Control Integration**: Limits preventing trades

### Paper Trading Testing

- **Simulated Execution**: All strategies tested in paper mode first
- **Performance Validation**: Backtest results match live paper trading
- **User Flow**: Complete user journey from template selection to monitoring

### External API Mocking

```typescript
// Test doubles for external services
class MockBinanceAPI {
  async getPrice(symbol: string): Promise<number> {
    return this.mockPrices.get(symbol) || 0;
  }
  
  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    return {
      orderId: 'mock-' + Date.now(),
      status: 'filled',
      executedQty: order.quantity,
      executedPrice: this.mockPrices.get(order.symbol)
    };
  }
}
```

## Performance Considerations

### Parallel Execution Optimization

- Monitor agents execute concurrently with `Promise.allSettled()`
- Timeout per agent to prevent blocking
- Graceful degradation if some monitors fail

### Caching Strategy

- Price data cached for 1-5 seconds (configurable per strategy)
- Exchange rate limits respected with request queuing
- User portfolio balances cached and invalidated on trades

### Database Query Optimization

- Indexes on frequently queried fields (user_id, status, template_id)
- Pagination for strategy lists and execution history
- Aggregated metrics pre-calculated and stored

## Security Considerations

### API Credential Management

- AES-256 encryption for stored credentials
- Credentials never logged or exposed in responses
- Per-user encryption keys derived from wallet signature
- Automatic credential rotation reminders

### Transaction Security

- All Execute operations require fresh wallet signature
- Paper trading clearly separated from live trading
- Withdrawal/transfer operations require additional confirmation
- Rate limiting on API endpoints

### Risk Controls as Security

- Hard-coded maximum limits that cannot be disabled
- Emergency stop functionality always available
- Audit log of all trading decisions and executions
- Automatic circuit breakers on unusual activity

## Deployment Considerations

### Backward Compatibility

- API versioning to support old agent categories during migration
- Database migration with rollback capability
- Feature flags for gradual rollout of new features

### Monitoring and Observability

- Real-time metrics: active strategies, trades per minute, error rates
- Alerting on: high error rates, risk control triggers, API failures
- User-facing status page for exchange connectivity

### Scalability

- Horizontal scaling of workflow executors
- Message queue for asynchronous execution (future)
- Database read replicas for monitoring dashboards
