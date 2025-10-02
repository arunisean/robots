import { AgentCategory } from '@multi-agent-platform/shared';
import { AgentTemplateGenerator, AgentTemplate, TemplateOptions, CodeTemplateOptions } from './AgentTemplateGenerator';
import { Logger } from '../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Template Service
 * Provides high-level interface for agent template management
 */
export class TemplateService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('TemplateService');
  }

  /**
   * Create a new agent from template
   */
  async createAgentFromTemplate(
    category: AgentCategory,
    agentType: string,
    className: string,
    options: CreateAgentOptions = {}
  ): Promise<AgentCreationResult> {
    this.logger.info(`Creating agent from template: ${category}.${agentType}`);

    try {
      // Generate configuration
      const config = AgentTemplateGenerator.generateConfigTemplate(
        category,
        agentType,
        options.templateOptions
      );

      // Generate code
      const code = AgentTemplateGenerator.generateCodeTemplate(
        category,
        agentType,
        className,
        options.codeOptions
      );

      // Generate test
      const test = AgentTemplateGenerator.generateTestTemplate(
        category,
        className,
        agentType
      );

      // Write files if output directory is specified
      if (options.outputDir) {
        await this.writeAgentFiles(options.outputDir, className, code, test, config);
      }

      return {
        success: true,
        config,
        code,
        test,
        className,
        files: options.outputDir ? this.getGeneratedFilePaths(options.outputDir, className) : undefined
      };
    } catch (error) {
      this.logger.error(`Failed to create agent from template:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get available templates for category
   */
  getAvailableTemplates(category?: AgentCategory): Record<string, AgentTemplate[]> {
    if (category) {
      return { [category]: AgentTemplateGenerator.getAvailableTemplates(category) };
    }

    return {
      [AgentCategory.WORK]: AgentTemplateGenerator.getAvailableTemplates(AgentCategory.WORK),
      [AgentCategory.PROCESS]: AgentTemplateGenerator.getAvailableTemplates(AgentCategory.PROCESS),
      [AgentCategory.PUBLISH]: AgentTemplateGenerator.getAvailableTemplates(AgentCategory.PUBLISH),
      [AgentCategory.VALIDATE]: AgentTemplateGenerator.getAvailableTemplates(AgentCategory.VALIDATE)
    };
  }

  /**
   * Get template details
   */
  getTemplateDetails(category: AgentCategory, agentType: string): AgentTemplate | null {
    const templates = AgentTemplateGenerator.getAvailableTemplates(category);
    return templates.find(t => t.type === agentType) || null;
  }

  /**
   * Generate quick start guide for agent type
   */
  generateQuickStartGuide(category: AgentCategory, agentType: string): string {
    const template = this.getTemplateDetails(category, agentType);
    if (!template) {
      return 'Template not found';
    }

    return `# ${template.name} Quick Start Guide

## Overview
${template.description}

**Complexity:** ${template.complexity}
**Features:** ${template.features.join(', ')}

## Getting Started

### 1. Create Agent Configuration
\`\`\`typescript
import { TemplateService } from './agents/templates/TemplateService';
import { AgentCategory } from '@multi-agent-platform/shared';

const templateService = new TemplateService();
const result = await templateService.createAgentFromTemplate(
  AgentCategory.${category.toUpperCase()},
  '${agentType}',
  'My${template.name.replace(/\s+/g, '')}Agent',
  {
    templateOptions: {
      name: 'My Custom ${template.name}',
      description: 'Custom implementation of ${template.name.toLowerCase()}'
    },
    outputDir: './src/agents/custom'
  }
);
\`\`\`

### 2. Customize Implementation
Edit the generated files to implement your specific logic:
- **Agent Class:** Implement the abstract methods
- **Configuration:** Adjust settings for your use case
- **Tests:** Add specific test cases

### 3. Register and Use
\`\`\`typescript
import { AgentFactory } from './agents/factory/AgentFactory';

const factory = new AgentFactory();
factory.registerAgentType('${category}.${agentType}', My${template.name.replace(/\s+/g, '')}Agent);

const agent = await factory.createAgent('${category}.${agentType}', config);
\`\`\`

## Key Implementation Points

${this.getImplementationGuide(category, agentType)}

## Best Practices

${this.getBestPractices(category)}

## Common Patterns

${this.getCommonPatterns(category, agentType)}
`;
  }

  /**
   * Generate best practices documentation
   */
  generateBestPracticesDoc(): string {
    return `# Agent Development Best Practices

## General Principles

### 1. Configuration Validation
- Always validate configuration in the \`validateConfig\` method
- Provide clear error messages for invalid configurations
- Use type-safe configuration interfaces

### 2. Error Handling
- Use try-catch blocks for external operations
- Log errors with appropriate context
- Implement graceful degradation where possible

### 3. Resource Management
- Respect resource limits (memory, CPU, timeout)
- Clean up resources in the \`cleanup\` method
- Monitor resource usage during execution

### 4. Logging
- Use structured logging with appropriate levels
- Include relevant context in log messages
- Avoid logging sensitive information

## Category-Specific Best Practices

### Work Agents (Data Collection)
- Implement rate limiting to respect target servers
- Handle network failures gracefully
- Validate collected data before processing
- Implement deduplication strategies
- Use appropriate user agents and headers

### Process Agents (Data Processing)
- Validate input data before processing
- Implement quality checks on output
- Use streaming for large datasets
- Cache expensive operations when possible
- Implement proper error recovery

### Publish Agents (Content Publishing)
- Validate content before publishing
- Implement retry logic with exponential backoff
- Handle platform-specific formatting
- Track publishing metrics
- Implement content scheduling

### Validate Agents (Validation & Monitoring)
- Implement comprehensive health checks
- Use appropriate metrics and thresholds
- Generate actionable recommendations
- Implement alerting for critical issues
- Maintain historical data for trend analysis

## Testing Guidelines

### Unit Tests
- Test all public methods
- Mock external dependencies
- Test error conditions
- Verify configuration validation

### Integration Tests
- Test with real external services (when safe)
- Test end-to-end workflows
- Verify resource cleanup
- Test concurrent execution

## Performance Optimization

### Memory Management
- Use streaming for large datasets
- Implement proper garbage collection
- Monitor memory usage patterns
- Use object pooling for frequently created objects

### CPU Optimization
- Use asynchronous operations
- Implement proper batching
- Avoid blocking operations
- Use worker threads for CPU-intensive tasks

### Network Optimization
- Implement connection pooling
- Use compression when appropriate
- Implement proper caching strategies
- Handle network timeouts gracefully
`;
  }

  /**
   * Create example agents for demonstration
   */
  async createExampleAgents(outputDir: string): Promise<ExampleCreationResult[]> {
    const examples = [
      {
        category: AgentCategory.WORK,
        type: 'web_scraper',
        className: 'ExampleWebScraperAgent',
        description: 'Example web scraper that collects news articles'
      },
      {
        category: AgentCategory.PROCESS,
        type: 'text_processor',
        className: 'ExampleTextProcessorAgent',
        description: 'Example text processor that cleans and formats content'
      },
      {
        category: AgentCategory.PUBLISH,
        type: 'twitter',
        className: 'ExampleTwitterPublisherAgent',
        description: 'Example Twitter publisher for social media content'
      },
      {
        category: AgentCategory.VALIDATE,
        type: 'performance_monitor',
        className: 'ExamplePerformanceMonitorAgent',
        description: 'Example performance monitor for agent metrics'
      }
    ];

    const results: ExampleCreationResult[] = [];

    for (const example of examples) {
      try {
        const result = await this.createAgentFromTemplate(
          example.category,
          example.type,
          example.className,
          {
            templateOptions: {
              name: example.className,
              description: example.description
            },
            outputDir: path.join(outputDir, 'examples')
          }
        );

        results.push({
          ...example,
          success: result.success,
          files: result.files,
          error: result.error
        });
      } catch (error) {
        results.push({
          ...example,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Private helper methods

  private async writeAgentFiles(
    outputDir: string,
    className: string,
    code: string,
    test: string,
    config: any
  ): Promise<void> {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(path.join(outputDir, '__tests__'), { recursive: true });

    // Write agent implementation
    const agentFile = path.join(outputDir, `${className}.ts`);
    await fs.writeFile(agentFile, code, 'utf8');

    // Write test file
    const testFile = path.join(outputDir, '__tests__', `${className}.test.ts`);
    await fs.writeFile(testFile, test, 'utf8');

    // Write configuration example
    const configFile = path.join(outputDir, `${className}.config.json`);
    await fs.writeFile(configFile, JSON.stringify(config, null, 2), 'utf8');

    this.logger.info(`Generated agent files in: ${outputDir}`);
  }

  private getGeneratedFilePaths(outputDir: string, className: string): string[] {
    return [
      path.join(outputDir, `${className}.ts`),
      path.join(outputDir, '__tests__', `${className}.test.ts`),
      path.join(outputDir, `${className}.config.json`)
    ];
  }

  private getImplementationGuide(category: AgentCategory, agentType: string): string {
    switch (category) {
      case AgentCategory.WORK:
        return `- Implement \`collectFromTarget\` method for data collection
- Implement \`cleanData\` method for data processing
- Configure data sources in agent configuration
- Handle rate limiting and error recovery
- Implement proper data validation and deduplication`;

      case AgentCategory.PROCESS:
        return `- Implement \`processContent\` method for data transformation
- Implement \`checkQuality\` method for quality assurance
- Configure processing rules in agent configuration
- Handle batch processing for large datasets
- Implement proper error handling and recovery`;

      case AgentCategory.PUBLISH:
        return `- Implement \`formatForTarget\` method for platform-specific formatting
- Implement \`publishContent\` method for actual publishing
- Configure publishing targets and authentication
- Handle platform-specific limitations and requirements
- Implement retry logic and error handling`;

      case AgentCategory.VALIDATE:
        return `- Implement \`collectMetrics\` method for data collection
- Implement \`analyzePerformance\` method for analysis
- Configure validation rules and thresholds
- Generate actionable recommendations
- Implement proper alerting and reporting`;

      default:
        return '- Follow the agent interface contract\n- Implement required abstract methods\n- Add proper error handling';
    }
  }

  private getBestPractices(category: AgentCategory): string {
    const common = `- Use proper logging and error handling
- Validate all inputs and configurations
- Implement proper resource cleanup
- Follow the single responsibility principle
- Write comprehensive tests`;

    const specific = {
      [AgentCategory.WORK]: `- Respect robots.txt and rate limits
- Use appropriate HTTP headers and user agents
- Implement proper data deduplication
- Handle network failures gracefully`,

      [AgentCategory.PROCESS]: `- Validate data quality before and after processing
- Use streaming for large datasets
- Implement proper batch processing
- Cache expensive operations`,

      [AgentCategory.PUBLISH]: `- Validate content before publishing
- Handle platform-specific requirements
- Implement proper scheduling and queuing
- Track publishing metrics and success rates`,

      [AgentCategory.VALIDATE]: `- Use appropriate metrics and thresholds
- Generate actionable insights
- Implement proper alerting mechanisms
- Maintain historical data for trend analysis`
    };

    return `${common}\n${specific[category] || ''}`;
  }

  private getCommonPatterns(category: AgentCategory, agentType: string): string {
    return `### Configuration Pattern
\`\`\`typescript
const config = {
  // Base configuration
  id: 'my-agent',
  name: 'My Agent',
  category: AgentCategory.${category.toUpperCase()},
  
  // Category-specific configuration
  ${this.getCategorySpecificConfig(category)}
};
\`\`\`

### Error Handling Pattern
\`\`\`typescript
try {
  const result = await this.performOperation();
  this.logger.info('Operation completed successfully');
  return result;
} catch (error) {
  this.logger.error('Operation failed:', error);
  throw new Error(\`Operation failed: \${error.message}\`);
}
\`\`\`

### Resource Management Pattern
\`\`\`typescript
async cleanup(): Promise<void> {
  try {
    // Clean up resources
    await this.closeConnections();
    await this.clearCaches();
  } catch (error) {
    this.logger.error('Cleanup failed:', error);
  }
}
\`\`\``;
  }

  private getCategorySpecificConfig(category: AgentCategory): string {
    switch (category) {
      case AgentCategory.WORK:
        return `dataSources: [
    {
      id: 'source-1',
      type: DataSourceType.WEB_SCRAPING,
      url: 'https://example.com',
      config: {}
    }
  ]`;
      case AgentCategory.PROCESS:
        return `processingRules: [
    {
      id: 'rule-1',
      type: ProcessingType.TEXT_PROCESSING,
      order: 1,
      enabled: true,
      config: {}
    }
  ]`;
      default:
        return `settings: {
    // Agent-specific settings
  }`;
    }
  }
}

// Type definitions
export interface CreateAgentOptions {
  templateOptions?: TemplateOptions;
  codeOptions?: CodeTemplateOptions;
  outputDir?: string;
}

export interface AgentCreationResult {
  success: boolean;
  config?: any;
  code?: string;
  test?: string;
  className?: string;
  files?: string[];
  error?: string;
}

export interface ExampleCreationResult {
  category: AgentCategory;
  type: string;
  className: string;
  description: string;
  success: boolean;
  files?: string[];
  error?: string;
}