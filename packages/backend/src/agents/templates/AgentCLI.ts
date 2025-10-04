#!/usr/bin/env node

import { Command } from 'commander';
import { AgentCategory } from '@multi-agent-platform/shared';
import { TemplateService } from './TemplateService';
import { AgentTemplateGenerator } from './AgentTemplateGenerator';
import { getErrorMessage } from '../../utils/error-handler';
// import * as inquirer from 'inquirer'; // 暂时注释掉，因为模块不存在
import * as path from 'path';
import * as fs from 'fs/promises';

// 简单的inquirer替代实现
const inquirer = {
  prompt: async (questions: any[]) => {
    // 简单的默认值实现
    const answers: any = {};
    for (const q of questions) {
      answers[q.name] = q.default || '';
    }
    return answers;
  }
};

/**
 * Agent CLI Tool
 * Command-line interface for agent template generation
 */
class AgentCLI {
  private templateService: TemplateService;
  private program: Command;

  constructor() {
    this.templateService = new TemplateService();
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('agent-cli')
      .description('CLI tool for generating agent templates')
      .version('1.0.0');

    // List available templates
    this.program
      .command('list')
      .description('List available agent templates')
      .option('-c, --category <category>', 'Filter by category (work, process, publish, validate)')
      .action(this.listTemplates.bind(this));

    // Generate agent from template
    this.program
      .command('generate')
      .description('Generate agent from template')
      .option('-c, --category <category>', 'Agent category')
      .option('-t, --type <type>', 'Agent type')
      .option('-n, --name <name>', 'Agent class name')
      .option('-o, --output <dir>', 'Output directory', './generated')
      .option('-i, --interactive', 'Interactive mode')
      .action(this.generateAgent.bind(this));

    // Create examples
    this.program
      .command('examples')
      .description('Generate example agents')
      .option('-o, --output <dir>', 'Output directory', './examples')
      .action(this.createExamples.bind(this));

    // Show template details
    this.program
      .command('info <category> <type>')
      .description('Show detailed information about a template')
      .action(this.showTemplateInfo.bind(this));

    // Generate documentation
    this.program
      .command('docs')
      .description('Generate documentation')
      .option('-o, --output <dir>', 'Output directory', './docs')
      .option('-t, --type <type>', 'Documentation type (quickstart, bestpractices, all)', 'all')
      .action(this.generateDocs.bind(this));

    // Validate agent implementation
    this.program
      .command('validate <file>')
      .description('Validate agent implementation')
      .action(this.validateAgent.bind(this));
  }

  async run(args: string[]): Promise<void> {
    await this.program.parseAsync(args);
  }

  private async listTemplates(options: any): Promise<void> {
    console.log('📋 Available Agent Templates\\n');

    const templates = this.templateService.getAvailableTemplates(
      options.category ? this.parseCategory(options.category) : undefined
    );

    for (const [category, categoryTemplates] of Object.entries(templates)) {
      console.log(`\\n🏷️  ${category.toUpperCase()} AGENTS`);
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

  private async generateAgent(options: any): Promise<void> {
    let { category, type, name, output, interactive } = options;

    if (interactive || !category || !type || !name) {
      const answers = await this.promptForAgentDetails(category, type, name);
      category = answers.category;
      type = answers.type;
      name = answers.name;
      output = answers.output || output;
    }

    console.log(`\\n🚀 Generating ${category} agent: ${name}\\n`);

    try {
      const result = await this.templateService.createAgentFromTemplate(
        this.parseCategory(category),
        type,
        name,
        {
          outputDir: output,
          templateOptions: {
            name: name,
            description: `Generated ${category} agent for ${type}`
          }
        }
      );

      if (result.success) {
        console.log('✅ Agent generated successfully!\\n');
        console.log('📁 Generated files:');
        result.files?.forEach(file => console.log(`   ${file}`));
        console.log('\\n📖 Next steps:');
        console.log('   1. Review and customize the generated code');
        console.log('   2. Implement the abstract methods');
        console.log('   3. Run the tests to verify functionality');
        console.log('   4. Register the agent with AgentFactory');
      } else {
        console.error('❌ Failed to generate agent:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', getErrorMessage(error));
      process.exit(1);
    }
  }

  private async createExamples(options: any): Promise<void> {
    console.log(`\\n📚 Creating example agents in ${options.output}\\n`);

    try {
      const results = await this.templateService.createExampleAgents(options.output);
      
      console.log('📊 Example Creation Results:\\n');
      results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.className} (${result.category}.${result.type})`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      });

      const successCount = results.filter(r => r.success).length;
      console.log(`\\n🎉 Created ${successCount}/${results.length} example agents successfully!`);
    } catch (error) {
      console.error('❌ Error creating examples:', getErrorMessage(error));
      process.exit(1);
    }
  }

  private async showTemplateInfo(category: string, type: string): Promise<void> {
    const template = this.templateService.getTemplateDetails(
      this.parseCategory(category),
      type
    );

    if (!template) {
      console.error(`❌ Template not found: ${category}.${type}`);
      process.exit(1);
    }

    console.log(`\\n📋 Template Information\\n`);
    console.log(`Name: ${template.name}`);
    console.log(`Type: ${template.type}`);
    console.log(`Category: ${category}`);
    console.log(`Complexity: ${this.getComplexityIcon(template.complexity)} ${template.complexity}`);
    console.log(`Description: ${template.description}`);
    console.log(`Features: ${template.features.join(', ')}`);

    console.log('\\n📖 Quick Start Guide:\\n');
    const guide = this.templateService.generateQuickStartGuide(
      this.parseCategory(category),
      type
    );
    console.log(guide);
  }

  private async generateDocs(options: any): Promise<void> {
    console.log(`\\n📚 Generating documentation in ${options.output}\\n`);

    try {
      await fs.mkdir(options.output, { recursive: true });

      if (options.type === 'bestpractices' || options.type === 'all') {
        const bestPractices = this.templateService.generateBestPracticesDoc();
        await fs.writeFile(
          path.join(options.output, 'best-practices.md'),
          bestPractices,
          'utf8'
        );
        console.log('✅ Generated best-practices.md');
      }

      if (options.type === 'quickstart' || options.type === 'all') {
        const templates = this.templateService.getAvailableTemplates();
        
        for (const [category, categoryTemplates] of Object.entries(templates)) {
          for (const template of categoryTemplates) {
            const guide = this.templateService.generateQuickStartGuide(
              this.parseCategory(category),
              template.type
            );
            
            const filename = `quickstart-${category}-${template.type}.md`;
            await fs.writeFile(
              path.join(options.output, filename),
              guide,
              'utf8'
            );
            console.log(`✅ Generated ${filename}`);
          }
        }
      }

      console.log('\\n🎉 Documentation generated successfully!');
    } catch (error) {
      console.error('❌ Error generating documentation:', getErrorMessage(error));
      process.exit(1);
    }
  }

  private async validateAgent(file: string): Promise<void> {
    console.log(`\\n🔍 Validating agent implementation: ${file}\\n`);

    try {
      // Check if file exists
      await fs.access(file);
      
      // Read and analyze the file
      const content = await fs.readFile(file, 'utf8');
      const validation = this.analyzeAgentCode(content);
      
      console.log('📊 Validation Results:\\n');
      
      validation.checks.forEach(check => {
        const status = check.passed ? '✅' : '❌';
        console.log(`${status} ${check.name}`);
        if (check.message) {
          console.log(`   ${check.message}`);
        }
      });

      const passedCount = validation.checks.filter(c => c.passed).length;
      const totalCount = validation.checks.length;
      
      console.log(`\\n📈 Score: ${passedCount}/${totalCount} checks passed`);
      
      if (validation.suggestions.length > 0) {
        console.log('\\n💡 Suggestions:');
        validation.suggestions.forEach(suggestion => {
          console.log(`   • ${suggestion}`);
        });
      }

      if (passedCount === totalCount) {
        console.log('\\n🎉 Agent implementation looks good!');
      } else {
        console.log('\\n⚠️  Some issues found. Please review and fix.');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error validating agent:', getErrorMessage(error));
      process.exit(1);
    }
  }

  private async promptForAgentDetails(
    category?: string,
    type?: string,
    name?: string
  ): Promise<any> {
    const questions = [];

    if (!category) {
      questions.push({
        type: 'list',
        name: 'category',
        message: 'Select agent category:',
        choices: [
          { name: '🔍 Work Agent (Data Collection)', value: 'work' },
          { name: '⚙️  Process Agent (Data Processing)', value: 'process' },
          { name: '📤 Publish Agent (Content Publishing)', value: 'publish' },
          { name: '✅ Validate Agent (Validation & Monitoring)', value: 'validate' }
        ]
      });
    }

    if (!type) {
      questions.push({
        type: 'list',
        name: 'type',
        message: 'Select agent type:',
        choices: (answers: any) => {
          const selectedCategory = category || answers.category;
          const templates = AgentTemplateGenerator.getAvailableTemplates(
            this.parseCategory(selectedCategory)
          );
          return templates.map(t => ({
            name: `${t.name} - ${t.description}`,
            value: t.type
          }));
        }
      });
    }

    if (!name) {
      questions.push({
        type: 'input',
        name: 'name',
        message: 'Enter agent class name:',
        validate: (input: string) => {
          if (!input.trim()) return 'Agent name is required';
          if (!/^[A-Z][a-zA-Z0-9]*Agent$/.test(input)) {
            return 'Agent name should start with uppercase letter and end with "Agent"';
          }
          return true;
        }
      });
    }

    questions.push({
      type: 'input',
      name: 'output',
      message: 'Output directory:',
      default: './generated'
    });

    const answers = await inquirer.prompt(questions);
    return { category, type, name, ...answers };
  }

  private parseCategory(category: string): AgentCategory {
    switch (category.toLowerCase()) {
      case 'work': return AgentCategory.WORK;
      case 'process': return AgentCategory.PROCESS;
      case 'publish': return AgentCategory.PUBLISH;
      case 'validate': return AgentCategory.VALIDATE;
      default: throw new Error(`Invalid category: ${category}`);
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

  private analyzeAgentCode(content: string): ValidationResult {
    const checks: ValidationCheck[] = [];
    const suggestions: string[] = [];

    // Check for required imports
    checks.push({
      name: 'Has required imports',
      passed: content.includes('from \'@multi-agent-platform/shared\''),
      message: content.includes('from \'@multi-agent-platform/shared\'') ? 
        undefined : 'Missing imports from shared package'
    });

    // Check for class declaration
    const hasClassDeclaration = /class\s+\w+Agent\s+extends\s+\w+Agent/.test(content);
    checks.push({
      name: 'Has proper class declaration',
      passed: hasClassDeclaration,
      message: hasClassDeclaration ? undefined : 'Missing proper agent class declaration'
    });

    // Check for constructor
    checks.push({
      name: 'Has constructor',
      passed: content.includes('constructor('),
      message: content.includes('constructor(') ? undefined : 'Missing constructor'
    });

    // Check for abstract method implementations
    const hasAbstractMethods = content.includes('protected async') || content.includes('async ');
    checks.push({
      name: 'Has method implementations',
      passed: hasAbstractMethods,
      message: hasAbstractMethods ? undefined : 'Missing method implementations'
    });

    // Check for error handling
    const hasErrorHandling = content.includes('try') && content.includes('catch');
    checks.push({
      name: 'Has error handling',
      passed: hasErrorHandling,
      message: hasErrorHandling ? undefined : 'Consider adding error handling'
    });

    // Check for logging
    const hasLogging = content.includes('this.logger');
    checks.push({
      name: 'Uses logging',
      passed: hasLogging,
      message: hasLogging ? undefined : 'Consider adding logging statements'
    });

    // Generate suggestions
    if (!content.includes('TODO')) {
      suggestions.push('Consider adding TODO comments for incomplete implementations');
    }

    if (!content.includes('validate')) {
      suggestions.push('Consider adding input validation');
    }

    if (!content.includes('async') && !content.includes('Promise')) {
      suggestions.push('Consider using async/await for better error handling');
    }

    return { checks, suggestions };
  }
}

// Type definitions
interface ValidationCheck {
  name: string;
  passed: boolean;
  message?: string;
}

interface ValidationResult {
  checks: ValidationCheck[];
  suggestions: string[];
}

// CLI entry point
if (require.main === module) {
  const cli = new AgentCLI();
  cli.run(process.argv).catch(error => {
    console.error('❌ CLI Error:', getErrorMessage(error));
    process.exit(1);
  });
}

export { AgentCLI };