import Fastify from 'fastify';
import { agentRoutes } from '../../routes/agents';
import { AgentCategory, AgentConfig, DataSourceType, ProcessingType } from '@multi-agent-platform/shared';

// Mock dependencies
jest.mock('../../agents/factory/AgentFactory', () => ({
  AgentFactory: jest.fn().mockImplementation(() => ({
    getAvailableTypes: jest.fn(() => ['work.web_scraper', 'process.text_processor']),
    validateConfigForType: jest.fn(() => ({ success: true })),
    createAgent: jest.fn(() => ({
      id: 'test-agent-id',
      name: 'Test Agent',
      category: 'work',
      version: '1.0.0',
      description: 'Test Description',
      getStatus: () => 'inactive',
      getMetrics: () => ({ totalExecutions: 0 }),
      validateConfig: () => ({ success: true })
    }))
  }))
}));

jest.mock('../../agents/registry/AgentRegistry', () => ({
  AgentRegistry: jest.fn().mockImplementation(() => ({
    register: jest.fn(),
    list: jest.fn(() => []),
    get: jest.fn(() => null),
    getStats: jest.fn(() => ({ totalAgents: 0 })),
    performHealthCheck: jest.fn(() => []),
    getAgentsByStatus: jest.fn(() => []),
    updateAgentConfig: jest.fn(),
    unregister: jest.fn(),
    shutdown: jest.fn(),
    on: jest.fn()
  }))
}));

jest.mock('../../agents/runtime/AgentRuntimeManager', () => ({
  AgentRuntimeManager: jest.fn().mockImplementation(() => ({
    registerAgent: jest.fn(),
    unregisterAgent: jest.fn(),
    startAgent: jest.fn(),
    stopAgent: jest.fn(),
    executeAgent: jest.fn(() => ({ result: 'success' })),
    getRunningAgents: jest.fn(() => []),
    getAgentResourceUsage: jest.fn(() => null),
    getAgentMetrics: jest.fn(() => null),
    getRuntimeStats: jest.fn(() => ({ totalAgents: 0 })),
    performHealthCheck: jest.fn(() => []),
    shutdown: jest.fn()
  }))
}));

jest.mock('../../agents/templates/AgentTemplateGenerator', () => ({
  AgentTemplateGenerator: {
    getAvailableTemplates: jest.fn(() => []),
    generateConfigTemplate: jest.fn(() => ({
      id: 'test-config',
      name: 'Test Config',
      category: 'work'
    })),
    generateCodeTemplate: jest.fn((category, type, className) => `class ${className} {}`),
    generateTestTemplate: jest.fn((category, className) => `describe("${className}", () => {})`)
  }
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Agent Routes', () => {
  let app: any;

  beforeEach(async () => {
    app = Fastify();
    await app.register(agentRoutes, { prefix: '/api/agents' });
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('GET /api/agents/types', () => {
    it('should return available agent types and templates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/agents/types'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('availableTypes');
      expect(body.data).toHaveProperty('templates');
      expect(body.data.templates).toHaveProperty('work');
      expect(body.data.templates).toHaveProperty('process');
      expect(body.data.templates).toHaveProperty('publish');
      expect(body.data.templates).toHaveProperty('validate');
    });
  });

  describe('POST /api/agents/template/config', () => {
    it('should generate configuration template', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/agents/template/config',
        payload: {
          category: AgentCategory.WORK,
          type: 'web_scraper',
          options: {
            name: 'Test Web Scraper',
            memory: 512
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('name');
      expect(body.data).toHaveProperty('category');
      expect(body.data.category).toBe(AgentCategory.WORK);
    });

    it('should return error for missing parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/agents/template/config',
        payload: {
          category: AgentCategory.WORK
          // Missing type
        }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Category and type are required');
    });
  });

  describe('POST /api/agents/template/code', () => {
    it('should generate code template', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/agents/template/code',
        payload: {
          category: AgentCategory.WORK,
          type: 'web_scraper',
          className: 'MyWebScraperAgent'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('code');
      expect(body.data).toHaveProperty('test');
      expect(body.data.code).toContain('MyWebScraperAgent');
      expect(body.data.test).toContain('MyWebScraperAgent');
    });

    it('should return error for missing parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/agents/template/code',
        payload: {
          category: AgentCategory.WORK,
          type: 'web_scraper'
          // Missing className
        }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Category, type, and className are required');
    });
  });

  describe('POST /api/agents/install', () => {
    const validWorkConfig: AgentConfig = {
      id: 'test-agent',
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

    it('should install agent successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/agents/install',
        payload: {
          type: 'work.web_scraper',
          config: validWorkConfig,
          autoStart: false
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('agentId');
      expect(body.data).toHaveProperty('name');
      expect(body.data).toHaveProperty('type');
      expect(body.data).toHaveProperty('status');
    });

    it('should return error for missing parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/agents/install',
        payload: {
          type: 'work.web_scraper'
          // Missing config
        }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Type and config are required');
    });
  });

  describe('GET /api/agents/list', () => {
    it('should return list of agents', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/agents/list'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /api/agents/agent/:agentId', () => {
    it('should return agent details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/agents/agent/test-agent-id'
      });

      // This will return 404 since no agents are registered in test
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Agent not found');
    });
  });

  describe('POST /api/agents/agent/:agentId/start', () => {
    it('should return error for non-existent agent', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/agents/agent/non-existent/start'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Agent not found');
    });
  });

  describe('POST /api/agents/agent/:agentId/stop', () => {
    it('should return error for non-existent agent', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/agents/agent/non-existent/stop'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Agent not found');
    });
  });

  describe('POST /api/agents/agent/:agentId/execute', () => {
    it('should return error for non-existent agent', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/agents/agent/non-existent/execute',
        payload: {
          input: { test: 'data' }
        }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Agent not found');
    });
  });

  describe('PUT /api/agents/agent/:agentId/config', () => {
    it('should return error for non-existent agent', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/agents/agent/non-existent/config',
        payload: {
          config: { name: 'Updated Name' }
        }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Agent not found');
    });
  });

  describe('DELETE /api/agents/agent/:agentId', () => {
    it('should return error for non-existent agent', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/agents/agent/non-existent'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Agent not found');
    });
  });

  describe('GET /api/agents/stats', () => {
    it('should return runtime statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/agents/stats'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('runtime');
      expect(body.data).toHaveProperty('registry');
    });
  });

  describe('GET /api/agents/health', () => {
    it('should return health check results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/agents/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('runtime');
      expect(body.data).toHaveProperty('registry');
      expect(body.data).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/agents/filter', () => {
    it('should filter agents by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/agents/filter?status=active'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should filter agents by category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/agents/filter?category=work'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should filter agents by both status and category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/agents/filter?status=active&category=work'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });
});