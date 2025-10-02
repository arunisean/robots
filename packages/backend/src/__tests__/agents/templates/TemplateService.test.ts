import { TemplateService } from '../../../agents/templates/TemplateService';
import { AgentCategory } from '@multi-agent-platform/shared';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock logger
jest.mock('../../../utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService();
    jest.clearAllMocks();
  });

  describe('createAgentFromTemplate', () => {
    it('should create agent from template successfully', async () => {
      const result = await templateService.createAgentFromTemplate(
        AgentCategory.WORK,
        'web_scraper',
        'TestWebScraperAgent',
        {
          templateOptions: {
            name: 'Test Web Scraper',
            description: 'Test description'
          }
        }
      );

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.code).toBeDefined();
      expect(result.test).toBeDefined();
      expect(result.className).toBe('TestWebScraperAgent');
      expect(result.config.name).toBe('Test Web Scraper');
      expect(result.code).toContain('class TestWebScraperAgent extends WorkAgent');
    });

    it('should write files when output directory is specified', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await templateService.createAgentFromTemplate(
        AgentCategory.WORK,
        'web_scraper',
        'TestAgent',
        {
          outputDir: './test-output'
        }
      );

      expect(result.success).toBe(true);
      expect(result.files).toBeDefined();
      expect(result.files).toHaveLength(3);
      
      // Verify mkdir was called
      expect(mockFs.mkdir).toHaveBeenCalledWith('./test-output', { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.join('./test-output', '__tests__'), { recursive: true });
      
      // Verify files were written
      expect(mockFs.writeFile).toHaveBeenCalledTimes(3);
    });

    it('should handle file writing errors gracefully', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      const result = await templateService.createAgentFromTemplate(
        AgentCategory.WORK,
        'web_scraper',
        'TestAgent',
        {
          outputDir: './test-output'
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });

    it('should create different agent types correctly', async () => {
      const categories = [
        AgentCategory.WORK,
        AgentCategory.PROCESS,
        AgentCategory.PUBLISH,
        AgentCategory.VALIDATE
      ];

      for (const category of categories) {
        const templates = templateService.getAvailableTemplates(category)[category];
        const template = templates[0];

        const result = await templateService.createAgentFromTemplate(
          category,
          template.type,
          `Test${template.name.replace(/\s+/g, '')}Agent`
        );

        expect(result.success).toBe(true);
        expect(result.config.category).toBe(category);
        expect(result.code).toContain(`class Test${template.name.replace(/\s+/g, '')}Agent`);
      }
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return all templates when no category specified', () => {
      const templates = templateService.getAvailableTemplates();

      expect(templates).toHaveProperty(AgentCategory.WORK);
      expect(templates).toHaveProperty(AgentCategory.PROCESS);
      expect(templates).toHaveProperty(AgentCategory.PUBLISH);
      expect(templates).toHaveProperty(AgentCategory.VALIDATE);

      expect(templates[AgentCategory.WORK]).toHaveLength(3);
      expect(templates[AgentCategory.PROCESS]).toHaveLength(3);
      expect(templates[AgentCategory.PUBLISH]).toHaveLength(3);
      expect(templates[AgentCategory.VALIDATE]).toHaveLength(3);
    });

    it('should return templates for specific category', () => {
      const templates = templateService.getAvailableTemplates(AgentCategory.WORK);

      expect(templates).toHaveProperty(AgentCategory.WORK);
      expect(templates[AgentCategory.WORK]).toHaveLength(3);
      expect(Object.keys(templates)).toHaveLength(1);
    });
  });

  describe('getTemplateDetails', () => {
    it('should return template details for valid template', () => {
      const template = templateService.getTemplateDetails(AgentCategory.WORK, 'web_scraper');

      expect(template).toBeDefined();
      expect(template!.type).toBe('web_scraper');
      expect(template!.name).toBe('Web Scraper');
      expect(template!.complexity).toBe('medium');
    });

    it('should return null for invalid template', () => {
      const template = templateService.getTemplateDetails(AgentCategory.WORK, 'invalid_type');
      expect(template).toBeNull();
    });
  });

  describe('generateQuickStartGuide', () => {
    it('should generate quick start guide for valid template', () => {
      const guide = templateService.generateQuickStartGuide(AgentCategory.WORK, 'web_scraper');

      expect(guide).toContain('# Web Scraper Quick Start Guide');
      expect(guide).toContain('## Overview');
      expect(guide).toContain('## Getting Started');
      expect(guide).toContain('### 1. Create Agent Configuration');
      expect(guide).toContain('### 2. Customize Implementation');
      expect(guide).toContain('### 3. Register and Use');
      expect(guide).toContain('## Key Implementation Points');
      expect(guide).toContain('## Best Practices');
      expect(guide).toContain('## Common Patterns');
    });

    it('should include category-specific implementation guidance', () => {
      const workGuide = templateService.generateQuickStartGuide(AgentCategory.WORK, 'web_scraper');
      const processGuide = templateService.generateQuickStartGuide(AgentCategory.PROCESS, 'text_processor');

      expect(workGuide).toContain('collectFromTarget');
      expect(workGuide).toContain('cleanData');
      expect(processGuide).toContain('processContent');
      expect(processGuide).toContain('checkQuality');
    });

    it('should return template not found for invalid template', () => {
      const guide = templateService.generateQuickStartGuide(AgentCategory.WORK, 'invalid_type');
      expect(guide).toBe('Template not found');
    });
  });

  describe('generateBestPracticesDoc', () => {
    it('should generate comprehensive best practices documentation', () => {
      const doc = templateService.generateBestPracticesDoc();

      expect(doc).toContain('# Agent Development Best Practices');
      expect(doc).toContain('## General Principles');
      expect(doc).toContain('### 1. Configuration Validation');
      expect(doc).toContain('### 2. Error Handling');
      expect(doc).toContain('### 3. Resource Management');
      expect(doc).toContain('## Category-Specific Best Practices');
      expect(doc).toContain('### Work Agents (Data Collection)');
      expect(doc).toContain('### Process Agents (Data Processing)');
      expect(doc).toContain('### Publish Agents (Content Publishing)');
      expect(doc).toContain('### Validate Agents (Validation & Monitoring)');
      expect(doc).toContain('## Testing Guidelines');
      expect(doc).toContain('## Performance Optimization');
    });
  });

  describe('createExampleAgents', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should create all example agents successfully', async () => {
      const results = await templateService.createExampleAgents('./examples');

      expect(results).toHaveLength(4);
      expect(results.every(r => r.success)).toBe(true);
      
      const categories = results.map(r => r.category);
      expect(categories).toContain(AgentCategory.WORK);
      expect(categories).toContain(AgentCategory.PROCESS);
      expect(categories).toContain(AgentCategory.PUBLISH);
      expect(categories).toContain(AgentCategory.VALIDATE);
    });

    it('should handle individual example creation failures', async () => {
      // Mock one failure
      let callCount = 0;
      mockFs.writeFile.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Write failed');
        }
        return Promise.resolve(undefined);
      });

      const results = await templateService.createExampleAgents('./examples');

      expect(results).toHaveLength(4);
      expect(results.some(r => !r.success)).toBe(true);
      expect(results.some(r => r.success)).toBe(true);
    });

    it('should create examples in correct directory structure', async () => {
      await templateService.createExampleAgents('./test-examples');

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join('./test-examples', 'examples'),
        { recursive: true }
      );
    });
  });

  describe('error handling', () => {
    it('should handle template generation errors', async () => {
      // Test with invalid category
      const result = await templateService.createAgentFromTemplate(
        'invalid' as AgentCategory,
        'test',
        'TestAgent'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle file system errors during creation', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Disk full'));

      const result = await templateService.createAgentFromTemplate(
        AgentCategory.WORK,
        'web_scraper',
        'TestAgent',
        { outputDir: './test' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Disk full');
    });
  });

  describe('integration scenarios', () => {
    it('should create complete agent package with all files', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await templateService.createAgentFromTemplate(
        AgentCategory.WORK,
        'web_scraper',
        'MyWebScraperAgent',
        {
          templateOptions: {
            name: 'My Web Scraper',
            description: 'Custom web scraper for my use case',
            memory: 512,
            cpu: 1
          },
          codeOptions: {
            description: 'Custom implementation with advanced features',
            features: ['rate-limiting', 'proxy-support']
          },
          outputDir: './my-agents'
        }
      );

      expect(result.success).toBe(true);
      expect(result.config.name).toBe('My Web Scraper');
      expect(result.config.resources.memory).toBe(512);
      expect(result.code).toContain('Custom implementation with advanced features');
      expect(result.files).toHaveLength(3);

      // Verify correct file paths
      expect(result.files).toContain(path.join('./my-agents', 'MyWebScraperAgent.ts'));
      expect(result.files).toContain(path.join('./my-agents', '__tests__', 'MyWebScraperAgent.test.ts'));
      expect(result.files).toContain(path.join('./my-agents', 'MyWebScraperAgent.config.json'));
    });

    it('should generate valid configuration for all agent types', async () => {
      const testCases = [
        { category: AgentCategory.WORK, type: 'web_scraper' },
        { category: AgentCategory.PROCESS, type: 'text_processor' },
        { category: AgentCategory.PUBLISH, type: 'twitter' },
        { category: AgentCategory.VALIDATE, type: 'performance_monitor' }
      ];

      for (const testCase of testCases) {
        const result = await templateService.createAgentFromTemplate(
          testCase.category,
          testCase.type,
          'TestAgent'
        );

        expect(result.success).toBe(true);
        expect(result.config.category).toBe(testCase.category);
        
        // Verify configuration is valid JSON
        expect(() => JSON.stringify(result.config)).not.toThrow();
        
        // Verify required fields
        expect(result.config.id).toBeDefined();
        expect(result.config.name).toBeDefined();
        expect(result.config.resources).toBeDefined();
      }
    });
  });
});