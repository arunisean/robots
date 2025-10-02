import { AgentTemplateGenerator } from '../../../agents/templates/AgentTemplateGenerator';
import { AgentCategory, DataSourceType, ProcessingType } from '@multi-agent-platform/shared';

describe('AgentTemplateGenerator', () => {
  describe('generateConfigTemplate', () => {
    it('should generate work agent config template', () => {
      const config = AgentTemplateGenerator.generateConfigTemplate(
        AgentCategory.WORK,
        'web_scraper',
        {
          name: 'Test Web Scraper',
          description: 'Test description'
        }
      );

      expect(config.category).toBe(AgentCategory.WORK);
      expect(config.name).toBe('Test Web Scraper');
      expect(config.description).toBe('Test description');
      expect(config.dataSources).toBeDefined();
      expect(config.dataSources).toHaveLength(1);
      expect(config.dataSources[0].type).toBe(DataSourceType.WEB_SCRAPING);
    });

    it('should generate process agent config template', () => {
      const config = AgentTemplateGenerator.generateConfigTemplate(
        AgentCategory.PROCESS,
        'text_processor',
        {
          name: 'Test Text Processor'
        }
      );

      expect(config.category).toBe(AgentCategory.PROCESS);
      expect(config.name).toBe('Test Text Processor');
      expect(config.processingRules).toBeDefined();
      expect(config.processingRules).toHaveLength(1);
      expect(config.processingRules[0].type).toBe(ProcessingType.TEXT_PROCESSING);
    });

    it('should generate publish agent config template', () => {
      const config = AgentTemplateGenerator.generateConfigTemplate(
        AgentCategory.PUBLISH,
        'twitter',
        {
          name: 'Test Twitter Publisher'
        }
      );

      expect(config.category).toBe(AgentCategory.PUBLISH);
      expect(config.name).toBe('Test Twitter Publisher');
      expect(config.settings.platforms).toContain('twitter');
    });

    it('should generate validate agent config template', () => {
      const config = AgentTemplateGenerator.generateConfigTemplate(
        AgentCategory.VALIDATE,
        'performance_monitor',
        {
          name: 'Test Performance Monitor'
        }
      );

      expect(config.category).toBe(AgentCategory.VALIDATE);
      expect(config.name).toBe('Test Performance Monitor');
      expect(config.settings.validationRules).toBeDefined();
      expect(config.settings.reportingInterval).toBeDefined();
    });

    it('should use default values when options not provided', () => {
      const config = AgentTemplateGenerator.generateConfigTemplate(
        AgentCategory.WORK,
        'web_scraper'
      );

      expect(config.name).toBe('Work web_scraper');
      expect(config.description).toContain('Auto-generated work agent');
      expect(config.version).toBe('1.0.0');
      expect(config.enabled).toBe(true);
    });

    it('should set appropriate resource defaults by category', () => {
      const workConfig = AgentTemplateGenerator.generateConfigTemplate(
        AgentCategory.WORK,
        'web_scraper'
      );
      const processConfig = AgentTemplateGenerator.generateConfigTemplate(
        AgentCategory.PROCESS,
        'text_processor'
      );

      expect(workConfig.resources.memory).toBe(256);
      expect(processConfig.resources.memory).toBe(512);
      expect(processConfig.resources.cpu).toBeGreaterThan(workConfig.resources.cpu);
    });
  });

  describe('generateCodeTemplate', () => {
    it('should generate work agent code template', () => {
      const code = AgentTemplateGenerator.generateCodeTemplate(
        AgentCategory.WORK,
        'web_scraper',
        'TestWebScraperAgent'
      );

      expect(code).toContain('class TestWebScraperAgent extends WorkAgent');
      expect(code).toContain('collectFromTarget');
      expect(code).toContain('cleanData');
      expect(code).toContain('getCollectionType');
      expect(code).toContain('testDataSourceConnection');
    });

    it('should generate process agent code template', () => {
      const code = AgentTemplateGenerator.generateCodeTemplate(
        AgentCategory.PROCESS,
        'text_processor',
        'TestTextProcessorAgent'
      );

      expect(code).toContain('class TestTextProcessorAgent extends ProcessAgent');
      expect(code).toContain('processContent');
      expect(code).toContain('checkQuality');
      expect(code).toContain('doProcessData');
      expect(code).toContain('testLLMConnection');
    });

    it('should generate publish agent code template', () => {
      const code = AgentTemplateGenerator.generateCodeTemplate(
        AgentCategory.PUBLISH,
        'twitter',
        'TestTwitterPublisherAgent'
      );

      expect(code).toContain('class TestTwitterPublisherAgent extends PublishAgent');
      expect(code).toContain('formatForTarget');
      expect(code).toContain('publishContent');
      expect(code).toContain('getPublishType');
    });

    it('should generate validate agent code template', () => {
      const code = AgentTemplateGenerator.generateCodeTemplate(
        AgentCategory.VALIDATE,
        'performance_monitor',
        'TestPerformanceMonitorAgent'
      );

      expect(code).toContain('class TestPerformanceMonitorAgent extends ValidateAgent');
      expect(code).toContain('collectMetrics');
      expect(code).toContain('analyzePerformance');
      expect(code).toContain('generateRecommendations');
    });

    it('should include proper imports in generated code', () => {
      const code = AgentTemplateGenerator.generateCodeTemplate(
        AgentCategory.WORK,
        'web_scraper',
        'TestAgent'
      );

      expect(code).toContain('from \'@multi-agent-platform/shared\'');
      expect(code).toContain('from \'../work/WorkAgent\'');
    });

    it('should include TODO comments for implementation', () => {
      const code = AgentTemplateGenerator.generateCodeTemplate(
        AgentCategory.WORK,
        'web_scraper',
        'TestAgent'
      );

      expect(code).toContain('// TODO: Implement');
    });

    it('should throw error for unknown category', () => {
      expect(() => {
        AgentTemplateGenerator.generateCodeTemplate(
          'unknown' as AgentCategory,
          'test',
          'TestAgent'
        );
      }).toThrow('Unknown agent category');
    });
  });

  describe('generateTestTemplate', () => {
    it('should generate test template with proper structure', () => {
      const test = AgentTemplateGenerator.generateTestTemplate(
        AgentCategory.WORK,
        'TestWebScraperAgent',
        'web_scraper'
      );

      expect(test).toContain('describe(\'TestWebScraperAgent\'');
      expect(test).toContain('beforeEach');
      expect(test).toContain('initialization');
      expect(test).toContain('execution');
      expect(test).toContain('health check');
    });

    it('should include category-specific test configuration', () => {
      const workTest = AgentTemplateGenerator.generateTestTemplate(
        AgentCategory.WORK,
        'TestWorkAgent',
        'web_scraper'
      );
      const processTest = AgentTemplateGenerator.generateTestTemplate(
        AgentCategory.PROCESS,
        'TestProcessAgent',
        'text_processor'
      );

      expect(workTest).toContain('dataSources');
      expect(processTest).toContain('processingRules');
    });

    it('should include proper test input for category', () => {
      const test = AgentTemplateGenerator.generateTestTemplate(
        AgentCategory.PROCESS,
        'TestProcessAgent',
        'text_processor'
      );

      expect(test).toContain('data: [{ content: \'test content\' }]');
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return templates for work category', () => {
      const templates = AgentTemplateGenerator.getAvailableTemplates(AgentCategory.WORK);

      expect(templates).toHaveLength(3);
      expect(templates.map(t => t.type)).toContain('web_scraper');
      expect(templates.map(t => t.type)).toContain('api_collector');
      expect(templates.map(t => t.type)).toContain('social_media');
    });

    it('should return templates for process category', () => {
      const templates = AgentTemplateGenerator.getAvailableTemplates(AgentCategory.PROCESS);

      expect(templates).toHaveLength(3);
      expect(templates.map(t => t.type)).toContain('text_processor');
      expect(templates.map(t => t.type)).toContain('content_generator');
      expect(templates.map(t => t.type)).toContain('data_transformer');
    });

    it('should return templates for publish category', () => {
      const templates = AgentTemplateGenerator.getAvailableTemplates(AgentCategory.PUBLISH);

      expect(templates).toHaveLength(3);
      expect(templates.map(t => t.type)).toContain('twitter');
      expect(templates.map(t => t.type)).toContain('linkedin');
      expect(templates.map(t => t.type)).toContain('website');
    });

    it('should return templates for validate category', () => {
      const templates = AgentTemplateGenerator.getAvailableTemplates(AgentCategory.VALIDATE);

      expect(templates).toHaveLength(3);
      expect(templates.map(t => t.type)).toContain('performance_monitor');
      expect(templates.map(t => t.type)).toContain('quality_assessor');
      expect(templates.map(t => t.type)).toContain('security_scanner');
    });

    it('should return empty array for unknown category', () => {
      const templates = AgentTemplateGenerator.getAvailableTemplates('unknown' as AgentCategory);
      expect(templates).toHaveLength(0);
    });

    it('should include template metadata', () => {
      const templates = AgentTemplateGenerator.getAvailableTemplates(AgentCategory.WORK);
      const webScraper = templates.find(t => t.type === 'web_scraper');

      expect(webScraper).toBeDefined();
      expect(webScraper!.name).toBe('Web Scraper');
      expect(webScraper!.description).toContain('Scrapes data from websites');
      expect(webScraper!.complexity).toBe('medium');
      expect(webScraper!.features).toContain('css-selectors');
    });
  });

  describe('template validation', () => {
    it('should generate valid TypeScript code', () => {
      const code = AgentTemplateGenerator.generateCodeTemplate(
        AgentCategory.WORK,
        'web_scraper',
        'TestAgent'
      );

      // Basic syntax checks
      expect(code).toContain('export class');
      expect(code).toContain('constructor(');
      expect(code).toContain('protected async');
      expect(code).not.toContain('undefined');
    });

    it('should generate valid JSON configuration', () => {
      const config = AgentTemplateGenerator.generateConfigTemplate(
        AgentCategory.WORK,
        'web_scraper'
      );

      // Should be serializable to JSON
      expect(() => JSON.stringify(config)).not.toThrow();
      
      // Should have required fields
      expect(config.id).toBeDefined();
      expect(config.name).toBeDefined();
      expect(config.category).toBeDefined();
      expect(config.resources).toBeDefined();
    });

    it('should generate valid test code', () => {
      const test = AgentTemplateGenerator.generateTestTemplate(
        AgentCategory.WORK,
        'TestAgent',
        'web_scraper'
      );

      // Basic Jest syntax checks
      expect(test).toContain('describe(');
      expect(test).toContain('it(');
      expect(test).toContain('expect(');
      expect(test).toContain('beforeEach(');
    });
  });

  describe('customization options', () => {
    it('should apply custom template options', () => {
      const config = AgentTemplateGenerator.generateConfigTemplate(
        AgentCategory.WORK,
        'web_scraper',
        {
          id: 'custom-id',
          name: 'Custom Name',
          description: 'Custom Description',
          memory: 1024,
          cpu: 2,
          timeout: 600,
          storage: 500
        }
      );

      expect(config.id).toBe('custom-id');
      expect(config.name).toBe('Custom Name');
      expect(config.description).toBe('Custom Description');
      expect(config.resources.memory).toBe(1024);
      expect(config.resources.cpu).toBe(2);
      expect(config.resources.timeout).toBe(600);
      expect(config.resources.storage).toBe(500);
    });

    it('should apply custom data sources for work agents', () => {
      const customDataSources = [
        {
          id: 'custom-source',
          name: 'Custom Source',
          type: DataSourceType.API,
          url: 'https://api.example.com',
          config: { method: 'GET' }
        }
      ];

      const config = AgentTemplateGenerator.generateConfigTemplate(
        AgentCategory.WORK,
        'api_collector',
        { dataSources: customDataSources }
      );

      expect(config.dataSources).toEqual(customDataSources);
    });

    it('should apply custom processing rules for process agents', () => {
      const customRules = [
        {
          id: 'custom-rule',
          name: 'Custom Rule',
          type: ProcessingType.CONTENT_GENERATION,
          order: 1,
          enabled: true,
          config: { temperature: 0.7 }
        }
      ];

      const config = AgentTemplateGenerator.generateConfigTemplate(
        AgentCategory.PROCESS,
        'content_generator',
        { processingRules: customRules }
      );

      expect(config.processingRules).toEqual(customRules);
    });
  });
});