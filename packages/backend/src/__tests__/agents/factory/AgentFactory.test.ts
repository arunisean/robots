import { AgentFactory } from '../../../agents/factory/AgentFactory';
import { AgentCategory, AgentConfig, DataSourceType, ProcessingType } from '@multi-agent-platform/shared';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

describe('AgentFactory', () => {
  let factory: AgentFactory;
  let mockConfig: AgentConfig;

  beforeEach(() => {
    factory = new AgentFactory();
    mockConfig = {
      id: 'test-id',
      name: 'Test Agent',
      description: 'Test Description',
      version: '1.0.0',
      category: AgentCategory.WORK,
      enabled: true,
      resources: {
        memory: 512,
        cpu: 1,
        timeout: 300,
        storage: 100
      },
      settings: {},
      dataSources: [
        {
          id: 'test-source',
          name: 'Test Source',
          type: DataSourceType.WEB_SCRAPING,
          url: 'https://example.com',
          config: {}
        }
      ]
    };
  });

  describe('getAvailableTypes', () => {
    it('should return list of available agent types', () => {
      const types = factory.getAvailableTypes();
      
      expect(types).toBeInstanceOf(Array);
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain('work.web_scraper');
      expect(types).toContain('process.text_processor');
      expect(types).toContain('publish.twitter');
      expect(types).toContain('validate.performance_monitor');
    });
  });

  describe('validateAgentType', () => {
    it('should validate known agent types', () => {
      expect(factory.validateAgentType('work.web_scraper')).toBe(true);
      expect(factory.validateAgentType('process.text_processor')).toBe(true);
      expect(factory.validateAgentType('publish.twitter')).toBe(true);
      expect(factory.validateAgentType('validate.performance_monitor')).toBe(true);
    });

    it('should reject unknown agent types', () => {
      expect(factory.validateAgentType('unknown.type')).toBe(false);
      expect(factory.validateAgentType('invalid')).toBe(false);
      expect(factory.validateAgentType('')).toBe(false);
    });
  });

  describe('createAgent', () => {
    it('should create agent of known type', async () => {
      const agent = await factory.createAgent('work.web_scraper', mockConfig);
      
      expect(agent).toBeDefined();
      expect(agent.id).toBe('test-id');
      expect(agent.name).toBe('Test Agent');
      expect(agent.category).toBe(AgentCategory.WORK);
    });

    it('should throw error for unknown agent type', async () => {
      await expect(factory.createAgent('unknown.type', mockConfig))
        .rejects.toThrow('Unknown agent type: unknown.type');
    });

    it('should initialize agent with provided config', async () => {
      const agent = await factory.createAgent('work.web_scraper', mockConfig);
      
      // Agent should be initialized and active
      expect(agent.getStatus()).toBe('active');
    });
  });

  describe('createAgentByCategory', () => {
    it('should create agent by category and specific type', async () => {
      const agent = await factory.createAgentByCategory(
        AgentCategory.WORK,
        'web_scraper',
        mockConfig
      );
      
      expect(agent).toBeDefined();
      expect(agent.category).toBe(AgentCategory.WORK);
    });

    it('should throw error for invalid category/type combination', async () => {
      await expect(factory.createAgentByCategory(
        AgentCategory.WORK,
        'invalid_type',
        mockConfig
      )).rejects.toThrow();
    });
  });

  describe('getTypesByCategory', () => {
    it('should return types for work category', () => {
      const types = factory.getTypesByCategory(AgentCategory.WORK);
      
      expect(types).toContain('web_scraper');
      expect(types).toContain('api_collector');
      expect(types).toContain('social_media');
    });

    it('should return types for process category', () => {
      const types = factory.getTypesByCategory(AgentCategory.PROCESS);
      
      expect(types).toContain('text_processor');
      expect(types).toContain('content_generator');
      expect(types).toContain('data_transformer');
    });

    it('should return types for publish category', () => {
      const types = factory.getTypesByCategory(AgentCategory.PUBLISH);
      
      expect(types).toContain('twitter');
      expect(types).toContain('linkedin');
      expect(types).toContain('website');
    });

    it('should return types for validate category', () => {
      const types = factory.getTypesByCategory(AgentCategory.VALIDATE);
      
      expect(types).toContain('performance_monitor');
      expect(types).toContain('quality_assessor');
      expect(types).toContain('security_scanner');
    });
  });

  describe('validateConfigForType', () => {
    it('should validate valid configuration', () => {
      const result = factory.validateConfigForType('work.web_scraper', mockConfig);
      
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject configuration with missing name', () => {
      const invalidConfig = { ...mockConfig, name: '' };
      const result = factory.validateConfigForType('work.web_scraper', invalidConfig);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Agent name is required');
    });

    it('should reject configuration with invalid category', () => {
      const invalidConfig = { ...mockConfig, category: 'invalid' as any };
      const result = factory.validateConfigForType('work.web_scraper', invalidConfig);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Valid agent category is required');
    });

    it('should reject unknown agent type', () => {
      const result = factory.validateConfigForType('unknown.type', mockConfig);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Unknown agent type: unknown.type');
    });
  });

  describe('createAgents', () => {
    it('should create multiple agents successfully', async () => {
      const processConfig = { 
        ...mockConfig, 
        id: 'agent-2', 
        name: 'Agent 2', 
        category: AgentCategory.PROCESS,
        processingRules: [
          {
            id: 'rule-1',
            name: 'Test Rule',
            type: ProcessingType.TEXT_PROCESSING,
            order: 1,
            enabled: true,
            config: {}
          }
        ]
      };
      delete processConfig.dataSources; // Process agents don't need data sources
      
      const configs = [
        { type: 'work.web_scraper', config: { ...mockConfig, id: 'agent-1', name: 'Agent 1' } },
        { type: 'process.text_processor', config: processConfig }
      ];

      const results = await factory.createAgents(configs);
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].agent).toBeDefined();
      expect(results[1].success).toBe(true);
      expect(results[1].agent).toBeDefined();
    });

    it('should handle mixed success and failure', async () => {
      const configs = [
        { type: 'work.web_scraper', config: mockConfig },
        { type: 'unknown.type', config: mockConfig }
      ];

      const results = await factory.createAgents(configs);
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].agent).toBeDefined();
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
    });
  });

  describe('registerAgentType', () => {
    it('should register new agent type', () => {
      const mockConstructor = jest.fn();
      
      factory.registerAgentType('custom.test', mockConstructor as any);
      
      expect(factory.validateAgentType('custom.test')).toBe(true);
      expect(factory.getAvailableTypes()).toContain('custom.test');
    });
  });

  describe('unregisterAgentType', () => {
    it('should unregister existing agent type', () => {
      factory.unregisterAgentType('work.web_scraper');
      
      expect(factory.validateAgentType('work.web_scraper')).toBe(false);
      expect(factory.getAvailableTypes()).not.toContain('work.web_scraper');
    });
  });
});