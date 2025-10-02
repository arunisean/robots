import { AgentCategory } from '@multi-agent-platform/shared';
import { AgentTemplateGenerator, AgentTemplate } from './AgentTemplateGenerator';
import { TemplateService } from './TemplateService';

/**
 * Documentation Generator
 * Creates comprehensive documentation for agent templates and development
 */
export class DocumentationGenerator {
  private templateService: TemplateService;

  constructor() {
    this.templateService = new TemplateService();
  }

  /**
   * Generate complete developer guide
   */
  generateDeveloperGuide(): string {
    return `# Multi-Agent Platform Developer Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Agent Categories](#agent-categories)
4. [Template System](#template-system)
5. [Development Workflow](#development-workflow)
6. [Best Practices](#best-practices)
7. [API Reference](#api-reference)
8. [Examples](#examples)

## Introduction

The Multi-Agent Platform provides a unified framework for building, deploying, and managing intelligent agents. The platform supports four main categories of agents:

- **Work Agents**: Data collection and ingestion
- **Process Agents**: Data processing and transformation
- **Publish Agents**: Content publishing and distribution
- **Validate Agents**: Validation, monitoring, and quality assurance

## Getting Started

### Prerequisites
- Node.js 18+ 
- TypeScript 4.5+
- Docker (optional, for containerized deployment)

### Installation
\`\`\`bash
npm install @multi-agent-platform/shared
npm install @multi-agent-platform/backend
\`\`\`

### Quick Start
\`\`\`typescript
import { TemplateService } from '@multi-agent-platform/backend';
import { AgentCategory } from '@multi-agent-platform/shared';

const templateService = new TemplateService();

// Create a new agent from template
const result = await templateService.createAgentFromTemplate(
  AgentCategory.WORK,
  'web_scraper',
  'MyWebScraperAgent',
  {
    outputDir: './src/agents'
  }
);
\`\`\`

## Agent Categories

${this.generateCategoryDocumentation()}

## Template System

The template system provides pre-built agent templates that follow best practices and include:

- **Configuration Templates**: Pre-configured settings for each agent type
- **Code Templates**: Boilerplate code with proper structure and interfaces
- **Test Templates**: Comprehensive test suites for validation
- **Documentation**: Quick start guides and implementation notes

### Available Templates

${this.generateTemplateOverview()}

### Using Templates

#### Command Line Interface
\`\`\`bash
# List available templates
npx agent-cli list

# Generate agent interactively
npx agent-cli generate --interactive

# Generate specific agent
npx agent-cli generate -c work -t web_scraper -n MyWebScraperAgent

# Create examples
npx agent-cli examples -o ./examples
\`\`\`

#### Programmatic API
\`\`\`typescript
import { TemplateService } from '@multi-agent-platform/backend';

const service = new TemplateService();

// Get available templates
const templates = service.getAvailableTemplates();

// Create agent from template
const result = await service.createAgentFromTemplate(
  AgentCategory.WORK,
  'web_scraper',
  'MyAgent'
);
\`\`\`

## Development Workflow

### 1. Choose Template
Select the appropriate template based on your agent's purpose:
- Data collection → Work Agent
- Data processing → Process Agent  
- Content publishing → Publish Agent
- Monitoring/validation → Validate Agent

### 2. Generate Code
Use the template system to generate boilerplate code:
\`\`\`bash
npx agent-cli generate -c work -t web_scraper -n MyWebScraperAgent -o ./src/agents
\`\`\`

### 3. Implement Logic
Fill in the abstract methods with your specific implementation:
\`\`\`typescript
protected async collectFromTarget(target: DataTarget): Promise<any> {
  // Your implementation here
}
\`\`\`

### 4. Configure Agent
Update the configuration file with your specific settings:
\`\`\`json
{
  "dataSources": [
    {
      "url": "https://your-target-site.com",
      "type": "WEB_SCRAPING"
    }
  ]
}
\`\`\`

### 5. Test Implementation
Run the generated tests and add your own:
\`\`\`bash
npm test MyWebScraperAgent.test.ts
\`\`\`

### 6. Register Agent
Register your agent with the factory:
\`\`\`typescript
import { AgentFactory } from '@multi-agent-platform/backend';
import { MyWebScraperAgent } from './MyWebScraperAgent';

const factory = new AgentFactory();
factory.registerAgentType('work.my_web_scraper', MyWebScraperAgent);
\`\`\`

## Best Practices

${this.templateService.generateBestPracticesDoc()}

## API Reference

### AgentTemplateGenerator

#### Methods

##### generateConfigTemplate(category, agentType, options?)
Generates configuration template for specified agent type.

**Parameters:**
- \`category\`: AgentCategory - The agent category
- \`agentType\`: string - Specific agent type
- \`options\`: TemplateOptions - Customization options

**Returns:** AgentConfig

##### generateCodeTemplate(category, agentType, className, options?)
Generates code template for agent implementation.

**Parameters:**
- \`category\`: AgentCategory - The agent category
- \`agentType\`: string - Specific agent type  
- \`className\`: string - Name of the agent class
- \`options\`: CodeTemplateOptions - Code generation options

**Returns:** string (TypeScript code)

##### generateTestTemplate(category, className, agentType)
Generates test template for agent.

**Parameters:**
- \`category\`: AgentCategory - The agent category
- \`className\`: string - Name of the agent class
- \`agentType\`: string - Specific agent type

**Returns:** string (Jest test code)

##### getAvailableTemplates(category)
Gets available templates for category.

**Parameters:**
- \`category\`: AgentCategory - The agent category

**Returns:** AgentTemplate[]

### TemplateService

#### Methods

##### createAgentFromTemplate(category, agentType, className, options?)
Creates complete agent from template including files.

**Parameters:**
- \`category\`: AgentCategory - The agent category
- \`agentType\`: string - Specific agent type
- \`className\`: string - Name of the agent class
- \`options\`: CreateAgentOptions - Creation options

**Returns:** Promise<AgentCreationResult>

##### getAvailableTemplates(category?)
Gets available templates, optionally filtered by category.

**Parameters:**
- \`category\`: AgentCategory? - Optional category filter

**Returns:** Record<string, AgentTemplate[]>

##### getTemplateDetails(category, agentType)
Gets detailed information about specific template.

**Parameters:**
- \`category\`: AgentCategory - The agent category
- \`agentType\`: string - Specific agent type

**Returns:** AgentTemplate | null

##### generateQuickStartGuide(category, agentType)
Generates quick start guide for template.

**Parameters:**
- \`category\`: AgentCategory - The agent category
- \`agentType\`: string - Specific agent type

**Returns:** string (Markdown guide)

##### createExampleAgents(outputDir)
Creates example agents for all categories.

**Parameters:**
- \`outputDir\`: string - Output directory path

**Returns:** Promise<ExampleCreationResult[]>

## Examples

### Work Agent Example
\`\`\`typescript
${this.generateExampleCode(AgentCategory.WORK, 'web_scraper', 'ExampleWebScraperAgent')}
\`\`\`

### Process Agent Example
\`\`\`typescript
${this.generateExampleCode(AgentCategory.PROCESS, 'text_processor', 'ExampleTextProcessorAgent')}
\`\`\`

### Publish Agent Example
\`\`\`typescript
${this.generateExampleCode(AgentCategory.PUBLISH, 'twitter', 'ExampleTwitterPublisherAgent')}
\`\`\`

### Validate Agent Example
\`\`\`typescript
${this.generateExampleCode(AgentCategory.VALIDATE, 'performance_monitor', 'ExamplePerformanceMonitorAgent')}
\`\`\`

## Troubleshooting

### Common Issues

#### Template Generation Fails
- Ensure output directory is writable
- Check that agent type is valid for category
- Verify all required parameters are provided

#### Agent Initialization Errors
- Validate configuration against schema
- Check resource allocation limits
- Ensure all required dependencies are installed

#### Test Failures
- Verify mock data matches expected format
- Check async/await usage in tests
- Ensure proper cleanup in test teardown

### Getting Help

- Check the [GitHub Issues](https://github.com/multi-agent-platform/issues)
- Review the [API Documentation](https://docs.multi-agent-platform.com)
- Join our [Discord Community](https://discord.gg/multi-agent-platform)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
\`\`\`bash
git clone https://github.com/multi-agent-platform/platform.git
cd platform
npm install
npm run build
npm test
\`\`\`

### Adding New Templates
1. Add template definition to \`AgentTemplateGenerator\`
2. Implement code generation logic
3. Add comprehensive tests
4. Update documentation
5. Submit pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
`;
  }

  /**
   * Generate API reference documentation
   */
  generateAPIReference(): string {
    return `# API Reference

## Core Interfaces

### IAgent
Base interface that all agents must implement.

\`\`\`typescript
interface IAgent {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly category: AgentCategory;
  readonly description: string;

  initialize(config: AgentConfig): Promise<void>;
  execute(input: AgentInput): Promise<AgentOutput>;
  cleanup(): Promise<void>;
  getStatus(): AgentStatus;
  getMetrics(): AgentMetrics;
  validateConfig(config: AgentConfig): ValidationResult;
  updateConfig(config: Partial<AgentConfig>): Promise<void>;
  healthCheck(): Promise<boolean>;
}
\`\`\`

### BaseAgent
Abstract base class providing common functionality.

\`\`\`typescript
abstract class BaseAgent extends EventEmitter implements IAgent {
  protected abstract doExecute(input: AgentInput): Promise<any>;
  abstract validateConfig(config: AgentConfig): ValidationResult;
  
  // Template method pattern hooks
  protected async preProcess(input: AgentInput): Promise<void>;
  protected async postProcess(result: any, input: AgentInput): Promise<AgentOutput>;
  protected async cleanup(): Promise<void>;
}
\`\`\`

## Agent Categories

### Work Agents
Data collection and ingestion agents.

\`\`\`typescript
abstract class WorkAgent extends BaseAgent {
  protected abstract collectFromTarget(target: DataTarget): Promise<any>;
  protected abstract cleanData(data: any, rules?: CollectionRule[]): Promise<CollectedData>;
  protected abstract getCollectionType(): string;
  protected abstract testDataSourceConnection(source: DataSource): Promise<void>;
}
\`\`\`

### Process Agents
Data processing and transformation agents.

\`\`\`typescript
abstract class ProcessAgent extends BaseAgent {
  protected abstract processContent(data: any, rules?: ProcessingRule[]): Promise<ProcessedData>;
  protected abstract checkQuality(data: ProcessedData): Promise<ProcessedData>;
  protected abstract getProcessingType(): string;
  protected abstract testLLMConnection(): Promise<void>;
}
\`\`\`

### Publish Agents
Content publishing and distribution agents.

\`\`\`typescript
abstract class PublishAgent extends BaseAgent {
  protected abstract formatForTarget(content: PublishContent, target: PublishTarget): Promise<PublishContent>;
  protected abstract publishContent(content: PublishContent, target: PublishTarget): Promise<PublishResult>;
  protected abstract getPublishType(): string;
}
\`\`\`

### Validate Agents
Validation, monitoring, and quality assurance agents.

\`\`\`typescript
abstract class ValidateAgent extends BaseAgent {
  protected abstract collectMetrics(agentId: string): Promise<any>;
  protected abstract analyzePerformance(metrics: any): Promise<any>;
  protected abstract generateRecommendations(analysis: any): Promise<any[]>;
  protected abstract testTargetConnection(target: any): Promise<void>;
}
\`\`\`

## Configuration Types

### AgentConfig
Base configuration for all agents.

\`\`\`typescript
interface AgentConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  category: AgentCategory;
  enabled: boolean;
  schedule?: ScheduleConfig;
  resources: ResourceAllocation;
  settings: Record<string, any>;
}
\`\`\`

### ResourceAllocation
Resource limits and allocation.

\`\`\`typescript
interface ResourceAllocation {
  memory: number; // MB
  cpu: number; // CPU cores
  timeout: number; // seconds
  storage: number; // MB
}
\`\`\`

## Input/Output Types

### AgentInput
Standard input format for all agents.

\`\`\`typescript
interface AgentInput {
  data: any;
  metadata: InputMetadata;
  context: ExecutionContext;
}
\`\`\`

### AgentOutput
Standard output format for all agents.

\`\`\`typescript
interface AgentOutput {
  data: any;
  metadata: OutputMetadata;
  metrics: ExecutionMetrics;
  status: ExecutionStatus;
}
\`\`\`

## Factory and Registry

### AgentFactory
Creates and manages agent instances.

\`\`\`typescript
class AgentFactory {
  createAgent(type: string, config: AgentConfig): Promise<IAgent>;
  getAvailableTypes(): string[];
  validateAgentType(type: string): boolean;
  registerAgentType(type: string, constructor: AgentConstructor): void;
  createAgents(configs: AgentCreationConfig[]): Promise<AgentCreationResult[]>;
}
\`\`\`

### AgentRegistry
Manages agent lifecycle and health.

\`\`\`typescript
class AgentRegistry extends EventEmitter {
  register(agent: IAgent): Promise<void>;
  unregister(agentId: string): Promise<void>;
  get(agentId: string): IAgent | null;
  list(category?: AgentCategory): IAgent[];
  performHealthCheck(): Promise<HealthCheckResult[]>;
  getStats(): RegistryStats;
}
\`\`\`

## Events

### Agent Events
All agents emit standardized events:

- \`initialized\`: Agent successfully initialized
- \`execution:started\`: Agent execution began
- \`execution:completed\`: Agent execution completed successfully
- \`execution:failed\`: Agent execution failed
- \`config:updated\`: Agent configuration updated
- \`error\`: Agent encountered an error

### Registry Events
The registry emits management events:

- \`agentRegistered\`: New agent registered
- \`agentUnregistered\`: Agent unregistered
- \`healthCheckCompleted\`: Health check completed
- \`registryShutdown\`: Registry shutting down

## Error Handling

### ValidationResult
Configuration validation result.

\`\`\`typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
\`\`\`

### ExecutionStatus
Execution status enumeration.

\`\`\`typescript
enum ExecutionStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PENDING = 'pending',
  CANCELLED = 'cancelled'
}
\`\`\`

## Metrics and Monitoring

### AgentMetrics
Performance and execution metrics.

\`\`\`typescript
interface AgentMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionTime?: number;
  uptime: number; // percentage
  errorRate: number; // percentage
}
\`\`\`

### ExecutionMetrics
Per-execution metrics.

\`\`\`typescript
interface ExecutionMetrics {
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  memoryUsed: number; // MB
  cpuUsed: number; // percentage
  networkRequests: number;
  errors: number;
}
\`\`\`
`;
  }

  /**
   * Generate troubleshooting guide
   */
  generateTroubleshootingGuide(): string {
    return `# Troubleshooting Guide

## Common Issues and Solutions

### Agent Creation Issues

#### "Unknown agent type" Error
**Problem:** Agent factory cannot find the specified agent type.

**Solutions:**
1. Verify the agent type is correctly spelled
2. Check that the agent is registered with the factory
3. Ensure the agent category matches the type

\`\`\`typescript
// Correct registration
factory.registerAgentType('work.web_scraper', WebScraperAgent);

// Correct usage
const agent = await factory.createAgent('work.web_scraper', config);
\`\`\`

#### "Configuration validation failed" Error
**Problem:** Agent configuration doesn't meet requirements.

**Solutions:**
1. Check required fields are present
2. Validate data types match expected types
3. Ensure resource limits are within bounds

\`\`\`typescript
// Example valid configuration
const config = {
  id: 'my-agent',
  name: 'My Agent',
  category: AgentCategory.WORK,
  resources: {
    memory: 256, // MB
    cpu: 0.5,    // cores
    timeout: 300, // seconds
    storage: 100  // MB
  },
  dataSources: [/* required for work agents */]
};
\`\`\`

### Agent Execution Issues

#### "Agent is in error state" Error
**Problem:** Agent encountered an error and is in error state.

**Solutions:**
1. Check agent logs for specific error details
2. Verify external dependencies are available
3. Restart the agent after fixing issues

\`\`\`typescript
// Check agent status
if (agent.getStatus() === AgentStatus.ERROR) {
  // Get error details
  const error = agent.getLastError();
  console.log('Agent error:', error);
  
  // Restart agent
  await agent.cleanup();
  await agent.initialize(config);
}
\`\`\`

#### "Resource allocation exceeded" Error
**Problem:** Agent exceeded allocated resources.

**Solutions:**
1. Increase resource limits in configuration
2. Optimize agent implementation for efficiency
3. Process data in smaller batches

\`\`\`typescript
// Increase resource limits
const config = {
  // ...
  resources: {
    memory: 512,  // Increased from 256
    cpu: 1,       // Increased from 0.5
    timeout: 600, // Increased from 300
    storage: 200  // Increased from 100
  }
};
\`\`\`

### Work Agent Issues

#### "No data sources configured" Error
**Problem:** Work agent requires at least one data source.

**Solution:** Add data sources to configuration.

\`\`\`typescript
const config = {
  // ...
  dataSources: [
    {
      id: 'source-1',
      name: 'My Data Source',
      type: DataSourceType.WEB_SCRAPING,
      url: 'https://example.com',
      config: {}
    }
  ]
};
\`\`\`

#### "Connection failed" Error
**Problem:** Cannot connect to data source.

**Solutions:**
1. Verify URL is accessible
2. Check network connectivity
3. Validate authentication credentials
4. Implement retry logic with backoff

\`\`\`typescript
protected async testDataSourceConnection(source: DataSource): Promise<void> {
  const maxRetries = 3;
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(source.url, { 
        method: 'HEAD',
        timeout: 5000 
      });
      if (response.ok) return;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  throw new Error(\`Connection failed after \${maxRetries} retries: \${lastError.message}\`);
}
\`\`\`

### Process Agent Issues

#### "No processing rules configured" Error
**Problem:** Process agent requires processing rules.

**Solution:** Add processing rules to configuration.

\`\`\`typescript
const config = {
  // ...
  processingRules: [
    {
      id: 'rule-1',
      name: 'Text Cleaning',
      type: ProcessingType.TEXT_PROCESSING,
      order: 1,
      enabled: true,
      config: {
        operations: ['trim', 'lowercase']
      }
    }
  ]
};
\`\`\`

#### "LLM service not accessible" Error
**Problem:** Cannot connect to LLM service.

**Solutions:**
1. Verify API credentials
2. Check service availability
3. Implement fallback processing

\`\`\`typescript
protected async testLLMConnection(): Promise<void> {
  try {
    // Test connection to LLM service
    await this.llmService.ping();
  } catch (error) {
    this.logger.warn('LLM service unavailable, using fallback processing');
    // Implement fallback logic
  }
}
\`\`\`

### Publish Agent Issues

#### "Invalid signature" Error
**Problem:** API authentication failed.

**Solutions:**
1. Verify API credentials are correct
2. Check token expiration
3. Refresh authentication tokens

\`\`\`typescript
protected async publishContent(content: PublishContent, target: PublishTarget): Promise<PublishResult> {
  try {
    return await this.performPublish(content, target);
  } catch (error) {
    if (error.status === 401) {
      // Refresh token and retry
      await this.refreshAuthToken(target);
      return await this.performPublish(content, target);
    }
    throw error;
  }
}
\`\`\`

#### "Content too long" Error
**Problem:** Content exceeds platform limits.

**Solution:** Implement content truncation or splitting.

\`\`\`typescript
protected async formatForTarget(content: PublishContent, target: PublishTarget): Promise<PublishContent> {
  const maxLength = this.getPlatformLimit(target.platform);
  
  if (content.content.length > maxLength) {
    content.content = content.content.substring(0, maxLength - 3) + '...';
  }
  
  return content;
}
\`\`\`

### Validate Agent Issues

#### "Metrics collection failed" Error
**Problem:** Cannot collect metrics from target agent.

**Solutions:**
1. Verify target agent is running
2. Check metrics endpoint availability
3. Implement graceful degradation

\`\`\`typescript
protected async collectMetrics(agentId: string): Promise<any> {
  try {
    const agent = this.registry.get(agentId);
    if (!agent) {
      throw new Error(\`Agent \${agentId} not found\`);
    }
    
    return agent.getMetrics();
  } catch (error) {
    this.logger.warn(\`Failed to collect metrics for \${agentId}: \${error.message}\`);
    return this.getDefaultMetrics(agentId);
  }
}
\`\`\`

## Performance Issues

### High Memory Usage
**Problem:** Agent consuming too much memory.

**Solutions:**
1. Process data in smaller batches
2. Implement streaming for large datasets
3. Clear caches regularly
4. Use object pooling

\`\`\`typescript
// Process in batches
const batchSize = 100;
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);
  await this.processBatch(batch);
  
  // Clear memory between batches
  if (global.gc) global.gc();
}
\`\`\`

### Slow Execution
**Problem:** Agent execution is slower than expected.

**Solutions:**
1. Profile code to identify bottlenecks
2. Implement parallel processing
3. Use caching for expensive operations
4. Optimize database queries

\`\`\`typescript
// Parallel processing
const promises = targets.map(target => this.processTarget(target));
const results = await Promise.all(promises);
\`\`\`

### High CPU Usage
**Problem:** Agent consuming too much CPU.

**Solutions:**
1. Use asynchronous operations
2. Implement proper batching
3. Add delays between operations
4. Use worker threads for CPU-intensive tasks

\`\`\`typescript
// Add delays to reduce CPU usage
for (const item of items) {
  await this.processItem(item);
  await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay
}
\`\`\`

## Testing Issues

### Test Failures
**Problem:** Tests are failing unexpectedly.

**Solutions:**
1. Check mock configurations
2. Verify async/await usage
3. Ensure proper test isolation
4. Check test data validity

\`\`\`typescript
// Proper async test
it('should process data successfully', async () => {
  const mockData = { content: 'test' };
  const result = await agent.execute({
    data: mockData,
    metadata: { /* ... */ },
    context: { /* ... */ }
  });
  
  expect(result.status).toBe('success');
});
\`\`\`

### Mock Issues
**Problem:** Mocks not working as expected.

**Solutions:**
1. Verify mock setup is correct
2. Check mock return values
3. Ensure mocks are reset between tests

\`\`\`typescript
beforeEach(() => {
  jest.clearAllMocks();
  mockService.mockImplementation(() => Promise.resolve(mockData));
});
\`\`\`

## Debugging Tips

### Enable Debug Logging
\`\`\`typescript
// Set log level to debug
process.env.LOG_LEVEL = 'debug';

// Or configure logger
const logger = new Logger('MyAgent', { level: 'debug' });
\`\`\`

### Use Health Checks
\`\`\`typescript
// Regular health checks
setInterval(async () => {
  const isHealthy = await agent.healthCheck();
  if (!isHealthy) {
    console.warn('Agent health check failed');
  }
}, 30000);
\`\`\`

### Monitor Metrics
\`\`\`typescript
// Log metrics periodically
setInterval(() => {
  const metrics = agent.getMetrics();
  console.log('Agent metrics:', metrics);
}, 60000);
\`\`\`

## Getting Help

If you're still experiencing issues:

1. Check the [GitHub Issues](https://github.com/multi-agent-platform/issues)
2. Search existing issues for similar problems
3. Create a new issue with:
   - Detailed error messages
   - Agent configuration
   - Steps to reproduce
   - Environment information

4. Join our [Discord Community](https://discord.gg/multi-agent-platform) for real-time help
`;
  }

  // Private helper methods

  private generateCategoryDocumentation(): string {
    const categories = [
      {
        category: AgentCategory.WORK,
        title: 'Work Agents',
        description: 'Data collection and ingestion agents that gather information from various sources.',
        useCases: [
          'Web scraping and data extraction',
          'API data collection',
          'Social media monitoring',
          'RSS feed aggregation',
          'Database synchronization'
        ]
      },
      {
        category: AgentCategory.PROCESS,
        title: 'Process Agents',
        description: 'Data processing and transformation agents that analyze and modify collected data.',
        useCases: [
          'Text processing and NLP',
          'Content generation with AI',
          'Data format transformation',
          'Quality control and validation',
          'Language translation'
        ]
      },
      {
        category: AgentCategory.PUBLISH,
        title: 'Publish Agents',
        description: 'Content publishing and distribution agents that deliver processed content to various platforms.',
        useCases: [
          'Social media posting',
          'Blog and website publishing',
          'Email newsletter distribution',
          'Content syndication',
          'Multi-platform broadcasting'
        ]
      },
      {
        category: AgentCategory.VALIDATE,
        title: 'Validate Agents',
        description: 'Validation, monitoring, and quality assurance agents that ensure system reliability.',
        useCases: [
          'Performance monitoring',
          'Quality assessment',
          'Security scanning',
          'Compliance checking',
          'Anomaly detection'
        ]
      }
    ];

    return categories.map(cat => `
### ${cat.title}

${cat.description}

**Common Use Cases:**
${cat.useCases.map(use => `- ${use}`).join('\n')}

**Available Templates:**
${this.getTemplatesForCategory(cat.category).map(t => `- **${t.name}** (${t.complexity}): ${t.description}`).join('\n')}
`).join('\n');
  }

  private generateTemplateOverview(): string {
    const allTemplates = this.templateService.getAvailableTemplates();
    let overview = '';

    for (const [category, templates] of Object.entries(allTemplates)) {
      overview += `\n#### ${category.toUpperCase()} Templates\n\n`;
      overview += '| Template | Complexity | Description | Features |\n';
      overview += '|----------|------------|-------------|----------|\n';
      
      templates.forEach(template => {
        overview += `| ${template.name} | ${this.getComplexityBadge(template.complexity)} | ${template.description} | ${template.features.join(', ')} |\n`;
      });
    }

    return overview;
  }

  private generateExampleCode(category: AgentCategory, type: string, className: string): string {
    return AgentTemplateGenerator.generateCodeTemplate(category, type, className)
      .split('\n')
      .slice(0, 30) // First 30 lines
      .join('\n') + '\n\n// ... rest of implementation';
  }

  private getTemplatesForCategory(category: AgentCategory): AgentTemplate[] {
    return AgentTemplateGenerator.getAvailableTemplates(category);
  }

  private getComplexityBadge(complexity: string): string {
    switch (complexity) {
      case 'easy': return '🟢 Easy';
      case 'medium': return '🟡 Medium';
      case 'hard': return '🔴 Hard';
      default: return '⚪ Unknown';
    }
  }
}

export { DocumentationGenerator };