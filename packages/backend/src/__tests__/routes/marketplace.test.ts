import Fastify from 'fastify';
import { marketplaceRoutes } from '../../routes/marketplace';
import { AgentCategory } from '@multi-agent-platform/shared';

// Mock dependencies
jest.mock('../../agents/templates/AgentTemplateGenerator', () => ({
  AgentTemplateGenerator: {
    generateConfigTemplate: jest.fn(() => ({
      id: 'generated-config',
      name: 'Generated Config',
      category: AgentCategory.WORK
    })),
    generateCodeTemplate: jest.fn(() => 'class GeneratedAgent {}'),
    generateTestTemplate: jest.fn(() => 'describe("GeneratedAgent", () => {})')
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

describe('Marketplace Routes', () => {
  let app: any;

  beforeEach(async () => {
    app = Fastify();
    await app.register(marketplaceRoutes, { prefix: '/api/marketplace' });
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('GET /api/marketplace/', () => {
    it('should return all marketplace templates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/marketplace/'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      
      // Check template structure
      const template = body.data[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('category');
      expect(template).toHaveProperty('type');
      expect(template).toHaveProperty('version');
      expect(template).toHaveProperty('author');
      expect(template).toHaveProperty('rating');
      expect(template).toHaveProperty('downloads');
      expect(template).toHaveProperty('tags');
      expect(template).toHaveProperty('complexity');
      expect(template).toHaveProperty('features');
    });
  });

  describe('GET /api/marketplace/category/:category', () => {
    it('should return templates for valid category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/marketplace/category/work'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      
      // All templates should be work category
      body.data.forEach((template: any) => {
        expect(template.category).toBe(AgentCategory.WORK);
      });
    });

    it('should return error for invalid category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/marketplace/category/invalid'
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid category');
    });
  });

  describe('GET /api/marketplace/template/:templateId', () => {
    it('should return template with generated code and config', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/marketplace/template/work-web-scraper-basic'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('name');
      expect(body.data).toHaveProperty('config');
      expect(body.data).toHaveProperty('code');
      expect(body.data).toHaveProperty('testCode');
    });

    it('should return 404 for non-existent template', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/marketplace/template/non-existent'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Template not found');
    });
  });

  describe('GET /api/marketplace/search', () => {
    it('should search templates by query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/marketplace/search?q=web'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toHaveProperty('total');
      expect(body.meta).toHaveProperty('query');
    });

    it('should filter by category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/marketplace/search?category=work'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      
      // All results should be work category
      body.data.forEach((template: any) => {
        expect(template.category).toBe(AgentCategory.WORK);
      });
    });

    it('should filter by complexity', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/marketplace/search?complexity=easy'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      
      // All results should be easy complexity
      body.data.forEach((template: any) => {
        expect(template.complexity).toBe('easy');
      });
    });

    it('should filter by tags', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/marketplace/search?tags=web-scraping'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      
      // All results should have the tag
      body.data.forEach((template: any) => {
        expect(template.tags).toContain('web-scraping');
      });
    });

    it('should handle multiple filters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/marketplace/search?category=work&complexity=easy&tags=web-scraping'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('GET /api/marketplace/popular', () => {
    it('should return popular templates sorted by downloads', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/marketplace/popular'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeLessThanOrEqual(10);
      
      // Should be sorted by downloads (descending)
      for (let i = 1; i < body.data.length; i++) {
        expect(body.data[i-1].downloads).toBeGreaterThanOrEqual(body.data[i].downloads);
      }
    });
  });

  describe('GET /api/marketplace/featured', () => {
    it('should return featured templates with high ratings', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/marketplace/featured'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      
      // All featured templates should have rating >= 4.5
      body.data.forEach((template: any) => {
        expect(template.rating).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe('GET /api/marketplace/stats', () => {
    it('should return marketplace statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/marketplace/stats'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('totalTemplates');
      expect(body.data).toHaveProperty('byCategory');
      expect(body.data).toHaveProperty('byComplexity');
      expect(body.data).toHaveProperty('totalDownloads');
      expect(body.data).toHaveProperty('averageRating');
      expect(body.data).toHaveProperty('mostPopularTags');
      
      expect(body.data.byCategory).toHaveProperty('work');
      expect(body.data.byCategory).toHaveProperty('process');
      expect(body.data.byCategory).toHaveProperty('publish');
      expect(body.data.byCategory).toHaveProperty('validate');
      
      expect(body.data.byComplexity).toHaveProperty('easy');
      expect(body.data.byComplexity).toHaveProperty('medium');
      expect(body.data.byComplexity).toHaveProperty('hard');
      
      expect(Array.isArray(body.data.mostPopularTags)).toBe(true);
    });
  });

  describe('POST /api/marketplace/template/:templateId/install', () => {
    it('should install template and return configuration', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/marketplace/template/work-web-scraper-basic/install',
        payload: {
          name: 'My Custom Scraper',
          customConfig: {
            memory: 1024
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('templateId');
      expect(body.data).toHaveProperty('templateName');
      expect(body.data).toHaveProperty('config');
      expect(body.data).toHaveProperty('message');
    });

    it('should return 404 for non-existent template', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/marketplace/template/non-existent/install'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Template not found');
    });

    it('should work without custom configuration', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/marketplace/template/work-web-scraper-basic/install'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });
});