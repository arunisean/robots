import { TemplateService } from '../TemplateService';
import { AgentTemplateGenerator } from '../AgentTemplateGenerator';
import { DocumentationGenerator } from '../DocumentationGenerator';
import { AgentCategory } from '@multi-agent-platform/shared';
import { getErrorMessage } from '../../../utils/error-handler';

/**
 * Example usage of the Agent Template System
 * Demonstrates how to use templates to create agents quickly
 */
export class ExampleUsage {
  private templateService: TemplateService;
  private docGenerator: DocumentationGenerator;

  constructor() {
    this.templateService = new TemplateService();
    this.docGenerator = new DocumentationGenerator();
  }

  /**
   * Example 1: Create a simple web scraper agent
   */
  async createWebScraperExample(): Promise<void> {
    console.log('🕷️  Creating Web Scraper Agent Example...\n');

    // Create agent from template
    const result = await this.templateService.createAgentFromTemplate(
      AgentCategory.WORK,
      'web_scraper',
      'NewsScraperAgent',
      {
        templateOptions: {
          name: 'News Scraper Agent',
          description: 'Scrapes news articles from various sources',
          memory: 512,
          cpu: 1
        },
        codeOptions: {
          description: 'Advanced news scraper with rate limiting and content extraction',
          features: ['rate-limiting', 'content-extraction', 'duplicate-detection']
        },
        outputDir: './generated/news-scraper'
      }
    );

    if (result.success) {
      console.log('✅ News Scraper Agent created successfully!');
      console.log('📁 Generated files:');
      result.files?.forEach(file => console.log(`   ${file}`));
      console.log('\n📋 Configuration preview:');
      console.log(JSON.stringify(result.config, null, 2));
    } else {
      console.error('❌ Failed to create agent:', result.error);
    }
  }

  /**
   * Example 2: Create a text processing agent
   */
  async createTextProcessorExample(): Promise<void> {
    console.log('\n⚙️  Creating Text Processor Agent Example...\n');

    const result = await this.templateService.createAgentFromTemplate(
      AgentCategory.PROCESS,
      'text_processor',
      'ContentCleanerAgent',
      {
        templateOptions: {
          name: 'Content Cleaner Agent',
          description: 'Cleans and formats text content for publishing'
        },
        outputDir: './generated/content-cleaner'
      }
    );

    if (result.success) {
      console.log('✅ Content Cleaner Agent created successfully!');
      console.log('📁 Generated files:');
      result.files?.forEach(file => console.log(`   ${file}`));
    }
  }

  /**
   * Example 3: List all available templates
   */
  listAvailableTemplates(): void {
    console.log('\n📋 Available Agent Templates:\n');

    const templates = this.templateService.getAvailableTemplates();

    for (const [category, categoryTemplates] of Object.entries(templates)) {
      console.log(`🏷️  ${category.toUpperCase()} AGENTS`);
      console.log('─'.repeat(50));

      categoryTemplates.forEach(template => {
        const complexityIcon = this.getComplexityIcon(template.complexity);
        console.log(`${complexityIcon} ${template.name} (${template.type})`);
        console.log(`   ${template.description}`);
        console.log(`   Features: ${template.features.join(', ')}`);
        console.log('');
      });
    }
  }

  /**
   * Example 4: Generate configuration only
   */
  generateConfigurationExample(): void {
    console.log('\n⚙️  Configuration Generation Example:\n');

    // Generate different configurations
    const workConfig = AgentTemplateGenerator.generateConfigTemplate(
      AgentCategory.WORK,
      'api_collector',
      {
        name: 'API Data Collector',
        description: 'Collects data from REST APIs',
        memory: 256,
        timeout: 180
      }
    );

    const processConfig = AgentTemplateGenerator.generateConfigTemplate(
      AgentCategory.PROCESS,
      'content_generator',
      {
        name: 'AI Content Generator',
        description: 'Generates content using LLM services',
        memory: 1024,
        cpu: 2
      }
    );

    console.log('📋 Work Agent Configuration:');
    console.log(JSON.stringify(workConfig, null, 2));
    console.log('\n📋 Process Agent Configuration:');
    console.log(JSON.stringify(processConfig, null, 2));
  }

  /**
   * Example 5: Generate quick start guide
   */
  generateQuickStartExample(): void {
    console.log('\n📖 Quick Start Guide Example:\n');

    const guide = this.templateService.generateQuickStartGuide(
      AgentCategory.PUBLISH,
      'twitter'
    );

    console.log(guide);
  }

  /**
   * Example 6: Create example agents for all categories
   */
  async createAllExamples(): Promise<void> {
    console.log('\n🎯 Creating Example Agents for All Categories...\n');

    const results = await this.templateService.createExampleAgents('./generated/examples');

    console.log('📊 Creation Results:\n');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.className} (${result.category}.${result.type})`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    const successCount = results.filter(r => r.success).length;
    console.log(`\n🎉 Created ${successCount}/${results.length} example agents successfully!`);
  }

  /**
   * Example 7: Generate comprehensive documentation
   */
  generateDocumentationExample(): void {
    console.log('\n📚 Documentation Generation Example:\n');

    // Generate developer guide
    const developerGuide = this.docGenerator.generateDeveloperGuide();
    console.log('📖 Developer Guide generated (length:', developerGuide.length, 'characters)');

    // Generate API reference
    const apiReference = this.docGenerator.generateAPIReference();
    console.log('📋 API Reference generated (length:', apiReference.length, 'characters)');

    // Generate troubleshooting guide
    const troubleshooting = this.docGenerator.generateTroubleshootingGuide();
    console.log('🔧 Troubleshooting Guide generated (length:', troubleshooting.length, 'characters)');
  }

  /**
   * Run all examples
   */
  async runAllExamples(): Promise<void> {
    console.log('🚀 Agent Template System Examples\n');
    console.log('='.repeat(50));

    try {
      // List available templates
      this.listAvailableTemplates();

      // Generate configurations
      this.generateConfigurationExample();

      // Create specific agents
      await this.createWebScraperExample();
      await this.createTextProcessorExample();

      // Generate quick start guide
      this.generateQuickStartExample();

      // Create all examples
      await this.createAllExamples();

      // Generate documentation
      this.generateDocumentationExample();

      console.log('\n🎉 All examples completed successfully!');
      console.log('\n💡 Next steps:');
      console.log('   1. Check the generated files in ./generated/');
      console.log('   2. Customize the agent implementations');
      console.log('   3. Run the tests to verify functionality');
      console.log('   4. Register agents with AgentFactory');

    } catch (error) {
      console.error('\n❌ Error running examples:', getErrorMessage(error));
    }
  }

  private getComplexityIcon(complexity: string): string {
    switch (complexity) {
      case 'easy': return '🟢';
      case 'medium': return '🟡';
      case 'hard': return '🔴';
      default: return '⚪';
    }
  }
}

// Example usage
if (require.main === module) {
  const examples = new ExampleUsage();
  examples.runAllExamples().catch(console.error);
}

// ExampleUsage已经通过class声明导出