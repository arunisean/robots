import { FastifyPluginAsync } from 'fastify';
import { AgentCategory } from '@multi-agent-platform/shared';
import { agentTypeRegistry } from '../services/AgentTypeRegistry';
import { logger } from '../utils/logger';

/**
 * Agent Types Routes
 * 提供Agent类型查询和管理的API端点
 */
export const agentTypesRoutes: FastifyPluginAsync = async (fastify) => {
  
  /**
   * GET /api/agent-types
   * 获取所有Agent类型列表
   */
  fastify.get('/', async (request, reply) => {
    try {
      const query = request.query as {
        category?: string;
        complexity?: string;
        status?: string;
        tags?: string;
        minRating?: string;
        search?: string;
        summary?: string; // 是否只返回摘要信息
      };

      let types;

      // 如果有搜索查询
      if (query.search) {
        types = query.summary === 'true' 
          ? agentTypeRegistry.searchTypeSummaries(query.search)
          : agentTypeRegistry.searchTypes(query.search);
      } 
      // 如果有筛选条件
      else if (query.category || query.complexity || query.status || query.tags || query.minRating) {
        const filters: any = {};
        
        if (query.category) {
          filters.category = query.category as AgentCategory;
        }
        if (query.complexity) {
          filters.complexity = query.complexity;
        }
        if (query.status) {
          filters.status = query.status;
        }
        if (query.tags) {
          filters.tags = query.tags.split(',');
        }
        if (query.minRating) {
          filters.minRating = parseFloat(query.minRating);
        }

        const filteredTypes = agentTypeRegistry.filterTypes(filters);
        types = query.summary === 'true'
          ? filteredTypes.map(t => ({
              id: t.id,
              name: t.name,
              displayName: t.displayName,
              description: t.description,
              icon: t.icon,
              category: t.category,
              complexity: t.complexity,
              rating: t.rating,
              popularity: t.popularity,
              status: t.status,
              isAvailable: t.isAvailable,
              tags: t.tags
            }))
          : filteredTypes;
      }
      // 返回所有类型
      else {
        types = query.summary === 'true'
          ? agentTypeRegistry.getAllTypeSummaries()
          : agentTypeRegistry.getAllTypes();
      }

      return reply.send({
        success: true,
        data: types,
        count: types.length
      });
    } catch (error) {
      logger.error('Error fetching agent types:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch agent types'
      });
    }
  });

  /**
   * GET /api/agent-types/categories/:category
   * 获取特定Category下的所有Agent类型
   */
  fastify.get('/categories/:category', async (request, reply) => {
    try {
      const { category } = request.params as { category: string };
      const query = request.query as { summary?: string };

      // 验证category
      if (!Object.values(AgentCategory).includes(category as AgentCategory)) {
        return reply.status(400).send({
          success: false,
          error: `Invalid category: ${category}. Must be one of: ${Object.values(AgentCategory).join(', ')}`
        });
      }

      const types = query.summary === 'true'
        ? agentTypeRegistry.getTypeSummariesByCategory(category as AgentCategory)
        : agentTypeRegistry.getTypesByCategory(category as AgentCategory);

      return reply.send({
        success: true,
        data: types,
        category,
        count: types.length
      });
    } catch (error) {
      logger.error('Error fetching agent types by category:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch agent types'
      });
    }
  });

  /**
   * GET /api/agent-types/:id
   * 获取特定Agent类型的详细信息
   */
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const type = agentTypeRegistry.getType(id);

      if (!type) {
        return reply.status(404).send({
          success: false,
          error: `Agent type not found: ${id}`
        });
      }

      return reply.send({
        success: true,
        data: type
      });
    } catch (error) {
      logger.error('Error fetching agent type:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch agent type'
      });
    }
  });

  /**
   * GET /api/agent-types/:id/presets
   * 获取特定Agent类型的配置预设
   */
  fastify.get('/:id/presets', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      if (!agentTypeRegistry.hasType(id)) {
        return reply.status(404).send({
          success: false,
          error: `Agent type not found: ${id}`
        });
      }

      const presets = agentTypeRegistry.getPresets(id);

      return reply.send({
        success: true,
        data: presets,
        count: presets.length
      });
    } catch (error) {
      logger.error('Error fetching agent type presets:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch presets'
      });
    }
  });

  /**
   * GET /api/agent-types/:id/presets/:presetId
   * 获取特定配置预设的详细信息
   */
  fastify.get('/:id/presets/:presetId', async (request, reply) => {
    try {
      const { id, presetId } = request.params as { id: string; presetId: string };

      if (!agentTypeRegistry.hasType(id)) {
        return reply.status(404).send({
          success: false,
          error: `Agent type not found: ${id}`
        });
      }

      const preset = agentTypeRegistry.getPreset(id, presetId);

      if (!preset) {
        return reply.status(404).send({
          success: false,
          error: `Preset not found: ${presetId}`
        });
      }

      return reply.send({
        success: true,
        data: preset
      });
    } catch (error) {
      logger.error('Error fetching preset:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch preset'
      });
    }
  });

  /**
   * POST /api/agent-types/:id/validate
   * 验证Agent配置
   */
  fastify.post('/:id/validate', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const config = request.body;

      if (!agentTypeRegistry.hasType(id)) {
        return reply.status(404).send({
          success: false,
          error: `Agent type not found: ${id}`
        });
      }

      const validation = agentTypeRegistry.validateConfig(id, config);

      return reply.send({
        success: true,
        data: validation
      });
    } catch (error) {
      logger.error('Error validating config:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to validate config'
      });
    }
  });

  /**
   * POST /api/agent-types/recommend
   * 根据场景推荐Agent类型
   */
  fastify.post('/recommend', async (request, reply) => {
    try {
      const { scenario } = request.body as { scenario: string };

      if (!scenario) {
        return reply.status(400).send({
          success: false,
          error: 'Scenario is required'
        });
      }

      const recommendations = agentTypeRegistry.getRecommendedTypes(scenario);

      return reply.send({
        success: true,
        data: recommendations,
        count: recommendations.length,
        scenario
      });
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get recommendations'
      });
    }
  });

  /**
   * GET /api/agent-types/statistics
   * 获取Agent类型统计信息
   */
  fastify.get('/statistics', async (request, reply) => {
    try {
      const stats = agentTypeRegistry.getStatistics();

      return reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching statistics:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }
  });
};
