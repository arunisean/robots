# Agent Template System

The Agent Template System provides a comprehensive framework for quickly creating, customizing, and deploying intelligent agents. It includes code generation, configuration templates, testing frameworks, and extensive documentation.

## 🚀 Quick Start

### Using the CLI Tool

```bash
# List available templates
npx agent-cli list

# Generate agent interactively
npx agent-cli generate --interactive

# Generate specific agent
npx agent-cli generate -c work -t web_scraper -n MyWebScraperAgent -o ./src/agents

# Create examples for all categories
npx agent-cli examples -o ./examples

# Generate documentation
npx agent-cli docs -o ./docs
```

### Using the Programmatic API

```typescript
import { TemplateService } from './TemplateService';
import { AgentCategory } from '@multi-agent-platform/shared';

const templateService = new TemplateService();

// Create agent from template
const result = await templateService.createAgentFromTemplate(
  AgentCategory.WORK,
  'web_scraper',
  'MyWebScraperAgent',
  {
    templateOptions: {
      name: 'My Web Scraper',
      description: 'Custom web scraper for my use case'
    },
    outputDir: './src/agents'
  }
);

if (result.success) {
  console.log('Agent created successfully!');
  console.log('Files:', result.files);
}
```

## 📋 Available Templates

### Work Agents (Data Collection)
- **Web Scraper** (🟡 Medium): Scrapes data from websites using CSS selectors
- **API Collector** (🟢 Easy): Collects data from REST APIs
- **Social Media** (🔴 Hard): Collects data from social media platforms

### Process Agents (Data Processing)
- **Text Processor** (🟢 Easy): Processes and transforms text data
- **Content Generator** (🟡 Medium): Generates content using AI/LLM services
- **Data Transformer** (🟢 Easy): Transforms data between different formats

### Publish Agents (Content Publishing)
- **Twitter Publisher** (🟡 Medium): Publishes content to Twitter
- **LinkedIn Publisher** (🟡 Medium): Publishes content to LinkedIn
- **Website Publisher** (🟢 Easy): Publishes content to websites

### Validate Agents (Validation & Monitoring)
- **Performance Monitor** (🟡 Medium): Monitors agent performance and metrics
- **Quality Assessor** (🔴 Hard): Assesses content and data quality
- **Security Scanner** (🔴 Hard): Scans for security issues and vulnerabilities

## 🏗️ Architecture

### Core Components

1. **AgentTemplateGenerator**: Core template generation engine
2. **TemplateService**: High-level service for template management
3. **AgentCLI**: Command-line interface for template operations
4. **DocumentationGenerator**: Generates comprehensive documentation

### Template Structure

Each template generates:
- **Agent Implementation**: TypeScript class with proper structure
- **Configuration File**: JSON configuration with sensible defaults
- **Test Suite**: Comprehensive Jest tests
- **Documentation**: Quick start guide and implementation notes

## 🛠️ Development Workflow

### 1. Choose Template
Select the appropriate template based on your agent's purpose:
- Data collection → Work Agent
- Data processing → Process Agent
- Content publishing → Publish Agent
- Monitoring/validation → Validate Agent

### 2. Generate Code
```bash
npx agent-cli generate -c work -t web_scraper -n MyWebScraperAgent
```

### 3. Implement Logic
Fill in the abstract methods with your specific implementation:
```typescript
protected async collectFromTarget(target: DataTarget): Promise<any> {
  // Your implementation here
  const response = await fetch(target.url);
  return await response.text();
}
```

### 4. Configure Agent
Update the configuration file with your specific settings:
```json
{
  "dataSources": [
    {
      "url": "https://your-target-site.com",
      "type": "WEB_SCRAPING",
      "config": {
        "selectors": {
          "title": "h1",
          "content": ".article-content"
        }
      }
    }
  ]
}
```

### 5. Test Implementation
```bash
npm test MyWebScraperAgent.test.ts
```

### 6. Register Agent
```typescript
import { AgentFactory } from '@multi-agent-platform/backend';
import { MyWebScraperAgent } from './MyWebScraperAgent';

const factory = new AgentFactory();
factory.registerAgentType('work.my_web_scraper', MyWebScraperAgent);
```

## 📚 API Reference

### AgentTemplateGenerator

#### Static Methods

- `generateConfigTemplate(category, agentType, options?)`: Generate configuration template
- `generateCodeTemplate(category, agentType, className, options?)`: Generate code template
- `generateTestTemplate(category, className, agentType)`: Generate test template
- `getAvailableTemplates(category)`: Get available templates for category

### TemplateService

#### Methods

- `createAgentFromTemplate(category, agentType, className, options?)`: Create complete agent
- `getAvailableTemplates(category?)`: Get available templates
- `getTemplateDetails(category, agentType)`: Get template details
- `generateQuickStartGuide(category, agentType)`: Generate quick start guide
- `createExampleAgents(outputDir)`: Create example agents

### AgentCLI

#### Commands

- `list`: List available templates
- `generate`: Generate agent from template
- `examples`: Create example agents
- `info <category> <type>`: Show template information
- `docs`: Generate documentation
- `validate <file>`: Validate agent implementation

## 🎯 Examples

### Create Web Scraper
```typescript
const result = await templateService.createAgentFromTemplate(
  AgentCategory.WORK,
  'web_scraper',
  'NewsScraperAgent',
  {
    templateOptions: {
      name: 'News Scraper',
      description: 'Scrapes news from multiple sources',
      memory: 512
    },
    outputDir: './src/agents/news'
  }
);
```

### Create Content Generator
```typescript
const result = await templateService.createAgentFromTemplate(
  AgentCategory.PROCESS,
  'content_generator',
  'BlogGeneratorAgent',
  {
    templateOptions: {
      name: 'Blog Generator',
      description: 'Generates blog posts using AI'
    },
    outputDir: './src/agents/blog'
  }
);
```

### Create Twitter Publisher
```typescript
const result = await templateService.createAgentFromTemplate(
  AgentCategory.PUBLISH,
  'twitter',
  'TwitterBotAgent',
  {
    templateOptions: {
      name: 'Twitter Bot',
      description: 'Automated Twitter posting'
    },
    outputDir: './src/agents/twitter'
  }
);
```

## 🔧 Customization

### Template Options
```typescript
interface TemplateOptions {
  id?: string;
  name?: string;
  description?: string;
  version?: string;
  memory?: number;
  cpu?: number;
  timeout?: number;
  storage?: number;
  dataSources?: any[];      // For work agents
  processingRules?: any[];  // For process agents
}
```

### Code Options
```typescript
interface CodeTemplateOptions {
  description?: string;
  features?: string[];
  dependencies?: string[];
}
```

## 📖 Best Practices

### Configuration Validation
- Always validate configuration in the `validateConfig` method
- Provide clear error messages for invalid configurations
- Use type-safe configuration interfaces

### Error Handling
- Use try-catch blocks for external operations
- Log errors with appropriate context
- Implement graceful degradation where possible

### Resource Management
- Respect resource limits (memory, CPU, timeout)
- Clean up resources in the `cleanup` method
- Monitor resource usage during execution

### Testing
- Test all public methods
- Mock external dependencies
- Test error conditions
- Verify configuration validation

## 🚨 Troubleshooting

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

## 🤝 Contributing

We welcome contributions to the template system! Please:

1. Add new templates following existing patterns
2. Include comprehensive tests
3. Update documentation
4. Follow TypeScript best practices

### Adding New Templates

1. Add template definition to `AgentTemplateGenerator.getAvailableTemplates()`
2. Implement code generation in the appropriate `generate*AgentCode()` method
3. Add tests in `AgentTemplateGenerator.test.ts`
4. Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.