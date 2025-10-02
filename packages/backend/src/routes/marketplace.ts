import { FastifyPluginAsync } from 'fastify';
import { AgentTemplateGenerator } from '../agents/templates/AgentTemplateGenerator';
import { AgentCategory } from '@multi-agent-platform/shared';
import { logger } from '../utils/logger';

interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  type: string;
  version: string;
  author: string;
  rating: number;
  downloads: number;
  tags: string[];
  complexity: 'easy' | 'medium' | 'hard';
  features: string[];
  createdAt: Date;
  updatedAt: Date;
  config?: any;
  code?: string;
  documentation?: string;
}

export const marketplaceRoutes: FastifyPluginAsync = async (fastify) => {
  // Mock marketplace data - in a real implementation, this would come from a database
  const marketplaceTemplates: MarketplaceTemplate[] = [
    {
      id: 'work-web-scraper-basic',
      name: 'Basic Web Scraper',
      description: 'A simple web scraper for extracting data from websites using CSS selectors',
      category: AgentCategory.WORK,
      type: 'web_scraper',
      version: '1.0.0',
      author: 'Multi-Agent Platform Team',
      rating: 4.5,
      downloads: 1250,
      tags: ['web-scraping', 'data-extraction', 'css-selectors'],
      complexity: 'easy',
      features: ['CSS selectors', 'Rate limiting', 'Data cleaning', 'Error handling'],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-02-01')
    },
    {
      id: 'work-api-collector-rest',
      name: 'REST API Collector',
      description: 'Collects data from REST APIs with authentication and pagination support',
      category: AgentCategory.WORK,
      type: 'api_collector',
      version: '1.2.0',
      author: 'API Specialists',
      rating: 4.8,
      downloads: 890,
      tags: ['api', 'rest', 'authentication', 'pagination'],
      complexity: 'medium',
      features: ['OAuth 2.0', 'API key auth', 'Pagination', 'Rate limiting', 'Retry logic'],
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-02-15')
    },
    {
      id: 'process-content-generator-ai',
      name: 'AI Content Generator',
      description: 'Generates high-quality content using advanced AI models',
      category: AgentCategory.PROCESS,
      type: 'content_generator',
      version: '2.0.0',
      author: 'AI Content Labs',
      rating: 4.9,
      downloads: 2100,
      tags: ['ai', 'content-generation', 'llm', 'gpt'],
      complexity: 'hard',
      features: ['Multiple AI models', 'Custom prompts', 'Quality scoring', 'Batch processing'],
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-20')
    },
    {
      id: 'publish-social-media-multi',
      name: 'Multi-Platform Social Publisher',
      description: 'Publishes content to multiple social media platforms simultaneously',
      category: AgentCategory.PUBLISH,
      type: 'social_media',
      version: '1.5.0',
      author: 'Social Media Pro',
      rating: 4.6,
      downloads: 1680,
      tags: ['social-media', 'multi-platform', 'scheduling', 'analytics'],
      complexity: 'medium',
      features: ['Twitter', 'LinkedIn', 'Facebook', 'Scheduling', 'Analytics'],
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-02-10')
    },
    {
      id: 'validate-performance-monitor-advanced',
      name: 'Advanced Performance Monitor',
      description: 'Comprehensive performance monitoring with AI-powered insights',
      category: AgentCategory.VALIDATE,
      type: 'performance_monitor',
      version: '1.3.0',
      author: 'Performance Analytics Inc',
      rating: 4.7,
      downloads: 750,
      tags: ['monitoring', 'performance', 'analytics', 'ai-insights'],
      complexity: 'hard',
      features: ['Real-time monitoring', 'AI insights', 'Alerting', 'Custom dashboards'],
      createdAt: new Date('2024-01-25'),
      updatedAt: new Date('2024-02-05')
    }
  ];

  /**
   * Get all marketplace templates
   */
  fastify.get('/', async (request, reply) => {
    try {
      return reply.send({
        success: true,
        data: marketplaceTemplates
      });
    } catch (error) {
      logger.error('Error getting marketplace templates:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get marketplace templates'
      });
    }
  });

  /**
   * Get marketplace templates by category
   */
  fastify.get<{ Params: { category: string } }>('/category/:category', async (request, reply) => {
    try {
      const { category } = request.params;
      
      if (!Object.values(AgentCategory).includes(category as AgentCategory)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid category'
        });
      }

      const templates = marketplaceTemplates.filter(t => t.category === category);
      
      return reply.send({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Error getting templates by category:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get templates by category'
      });
    }
  });

  /**
   * Get marketplace template by ID
   */
  fastify.get<{ Params: { templateId: string } }>('/template/:templateId', async (request, reply) => {
    try {
      const { templateId } = request.params;
      const template = marketplaceTemplates.find(t => t.id === templateId);

      if (!template) {
        return reply.status(404).send({
          success: false,
          error: 'Template not found'
        });
      }

      // Generate code and config for the template
      const config = AgentTemplateGenerator.generateConfigTemplate(
        template.category,
        template.type,
        { name: template.name, description: template.description }
      );

      const code = AgentTemplateGenerator.generateCodeTemplate(
        template.category,
        template.type,
        `${template.name.replace(/\s+/g, '')}Agent`
      );

      const testCode = AgentTemplateGenerator.generateTestTemplate(
        template.category,
        `${template.name.replace(/\s+/g, '')}Agent`,
        template.type
      );

      return reply.send({
        success: true,
        data: {
          ...template,
          config,
          code,
          testCode
        }
      });
    } catch (error) {
      logger.error('Error getting template:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get template'
      });
    }
  });

  /**
   * Search marketplace templates
   */
  fastify.get<{ Querystring: { q?: string; category?: string; complexity?: string; tags?: string } }>('/search', async (request, reply) => {
    try {
      const { q, category, complexity, tags } = request.query;
      let results = [...marketplaceTemplates];

      // Filter by search query
      if (q) {
        const query = q.toLowerCase();
        results = results.filter(t => 
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }

      // Filter by category
      if (category) {
        results = results.filter(t => t.category === category);
      }

      // Filter by complexity
      if (complexity) {
        results = results.filter(t => t.complexity === complexity);
      }

      // Filter by tags
      if (tags) {
        const tagList = tags.split(',').map(tag => tag.trim().toLowerCase());
        results = results.filter(t => 
          tagList.some(tag => t.tags.some(tTag => tTag.toLowerCase().includes(tag)))
        );
      }

      // Sort by rating and downloads
      results.sort((a, b) => {
        const scoreA = a.rating * 0.7 + (a.downloads / 1000) * 0.3;
        const scoreB = b.rating * 0.7 + (b.downloads / 1000) * 0.3;
        return scoreB - scoreA;
      });

      return reply.send({
        success: true,
        data: results,
        meta: {
          total: results.length,
          query: { q, category, complexity, tags }
        }
      });
    } catch (error) {
      logger.error('Error searching templates:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to search templates'
      });
    }
  });

  /**
   * Get popular templates
   */
  fastify.get('/popular', async (request, reply) => {
    try {
      const popular = [...marketplaceTemplates]
        .sort((a, b) => b.downloads - a.downloads)
        .slice(0, 10);

      return reply.send({
        success: true,
        data: popular
      });
    } catch (error) {
      logger.error('Error getting popular templates:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get popular templates'
      });
    }
  });

  /**
   * Get featured templates
   */
  fastify.get('/featured', async (request, reply) => {
    try {
      const featured = marketplaceTemplates.filter(t => t.rating >= 4.5);

      return reply.send({
        success: true,
        data: featured
      });
    } catch (error) {
      logger.error('Error getting featured templates:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get featured templates'
      });
    }
  });

  /**
   * Get template statistics
   */
  fastify.get('/stats', async (request, reply) => {
    try {
      const stats = {
        totalTemplates: marketplaceTemplates.length,
        byCategory: {
          work: marketplaceTemplates.filter(t => t.category === AgentCategory.WORK).length,
          process: marketplaceTemplates.filter(t => t.category === AgentCategory.PROCESS).length,
          publish: marketplaceTemplates.filter(t => t.category === AgentCategory.PUBLISH).length,
          validate: marketplaceTemplates.filter(t => t.category === AgentCategory.VALIDATE).length
        },
        byComplexity: {
          easy: marketplaceTemplates.filter(t => t.complexity === 'easy').length,
          medium: marketplaceTemplates.filter(t => t.complexity === 'medium').length,
          hard: marketplaceTemplates.filter(t => t.complexity === 'hard').length
        },
        totalDownloads: marketplaceTemplates.reduce((sum, t) => sum + t.downloads, 0),
        averageRating: marketplaceTemplates.reduce((sum, t) => sum + t.rating, 0) / marketplaceTemplates.length,
        mostPopularTags: getMostPopularTags(marketplaceTemplates)
      };

      return reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting marketplace stats:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get marketplace statistics'
      });
    }
  });

  /**
   * Install template (create agent from template)
   */
  fastify.post<{ Params: { templateId: string }; Body: { name?: string; customConfig?: any } }>('/template/:templateId/install', async (request, reply) => {
    try {
      const { templateId } = request.params;
      const { name, customConfig } = request.body || {};

      const template = marketplaceTemplates.find(t => t.id === templateId);
      if (!template) {
        return reply.status(404).send({
          success: false,
          error: 'Template not found'
        });
      }

      // Generate configuration from template
      const config = AgentTemplateGenerator.generateConfigTemplate(
        template.category,
        template.type,
        {
          name: name || template.name,
          description: template.description,
          ...customConfig
        }
      );

      // Increment download count (in real implementation, this would be persisted)
      template.downloads++;

      return reply.send({
        success: true,
        data: {
          templateId,
          templateName: template.name,
          config,
          message: 'Template configuration generated successfully'
        }
      });
    } catch (error) {
      logger.error('Error installing template:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to install template'
      });
    }
  });

  // Helper method to get most popular tags
  function getMostPopularTags(templates: MarketplaceTemplate[]): Array<{ tag: string; count: number }> {
    const tagCounts = new Map<string, number>();
    
    templates.forEach(template => {
      template.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
};