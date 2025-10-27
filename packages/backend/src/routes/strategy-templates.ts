import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StrategyTemplate, StrategyTemplateFilters } from '@multi-agent-platform/shared';
import { GridTradingTemplate } from '../templates/GridTradingTemplate';
import { storeInstance } from './strategy-instances';

/**
 * Strategy Templates API Routes
 */

// In-memory template registry (will be replaced with database later)
const templateRegistry = new Map<string, StrategyTemplate>();

// Register default templates
templateRegistry.set(GridTradingTemplate.id, GridTradingTemplate);

/**
 * GET /api/strategy-templates
 * List all available strategy templates
 */
interface ListTemplatesQuery {
  category?: string;
  difficulty?: string;
  tags?: string;
  search?: string;
  limit?: string;
  offset?: string;
  sortBy?: string;
  sortOrder?: string;
}

async function listTemplates(
  request: FastifyRequest<{ Querystring: ListTemplatesQuery }>,
  reply: FastifyReply
) {
  try {
    const {
      category,
      difficulty,
      tags,
      search,
      limit = '10',
      offset = '0',
      sortBy = 'name',
      sortOrder = 'asc'
    } = request.query;

    // Get all templates
    let templates = Array.from(templateRegistry.values());

    // Filter by category
    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    // Filter by difficulty
    if (difficulty) {
      templates = templates.filter(t => t.difficulty === difficulty);
    }

    // Filter by tags
    if (tags) {
      const tagList = tags.split(',');
      templates = templates.filter(t =>
        tagList.some(tag => t.tags.includes(tag))
      );
    }

    // Search by name or description
    if (search) {
      const searchLower = search.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    templates.sort((a, b) => {
      let aVal: any = a[sortBy as keyof StrategyTemplate];
      let bVal: any = b[sortBy as keyof StrategyTemplate];

      if (sortBy === 'usageCount' || sortBy === 'activeUsers') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }

      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });

    // Paginate
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    const total = templates.length;
    const paginatedTemplates = templates.slice(offsetNum, offsetNum + limitNum);

    reply.send({
      data: paginatedTemplates,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total
      }
    });
  } catch (error: any) {
    request.log.error('Error listing templates:', error);
    reply.status(500).send({
      error: 'Failed to list templates',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * GET /api/strategy-templates/:id
 * Get a specific strategy template by ID
 */
interface GetTemplateParams {
  id: string;
}

async function getTemplate(
  request: FastifyRequest<{ Params: GetTemplateParams }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const template = templateRegistry.get(id);

    if (!template) {
      return reply.status(404).send({
        error: 'Template not found',
        message: `Strategy template with ID ${id} does not exist`
      });
    }

    reply.send({
      data: template
    });
  } catch (error: any) {
    request.log.error('Error getting template:', error);
    reply.status(500).send({
      error: 'Failed to get template',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * POST /api/strategy-templates/:id/instantiate
 * Create a strategy instance from a template
 */
interface InstantiateBody {
  name: string;
  parameters: Record<string, any>;
  paperTrading?: boolean;
}

async function instantiateTemplate(
  request: FastifyRequest<{
    Params: GetTemplateParams;
    Body: InstantiateBody;
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { name, parameters, paperTrading = true } = request.body;

    const template = templateRegistry.get(id);

    if (!template) {
      return reply.status(404).send({
        error: 'Template not found',
        message: `Strategy template with ID ${id} does not exist`
      });
    }

    // Validate parameters
    const validationErrors = validateParameters(template, parameters);
    if (validationErrors.length > 0) {
      return reply.status(400).send({
        error: 'Invalid parameters',
        message: 'Parameter validation failed',
        details: validationErrors
      });
    }

    // Create strategy instance
    const instance = {
      id: `instance-${Date.now()}`,
      userId: 'demo-user', // TODO: Get from auth
      templateId: template.id,
      workflowId: `workflow-${Date.now()}`,
      name,
      parameters,
      status: 'stopped' as const,
      paperTrading,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalProfitLoss: 0,
      winRate: 0,
      currentDrawdown: 0,
      maxDrawdown: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store the instance
    storeInstance(instance);

    reply.status(201).send({
      data: instance,
      message: 'Strategy instance created successfully'
    });
  } catch (error: any) {
    request.log.error('Error instantiating template:', error);
    reply.status(500).send({
      error: 'Failed to instantiate template',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Validate template parameters
 */
function validateParameters(
  template: StrategyTemplate,
  parameters: Record<string, any>
): string[] {
  const errors: string[] = [];

  for (const param of template.parameters) {
    const value = parameters[param.key];

    // Check required
    if (param.validation.required && (value === undefined || value === null)) {
      errors.push(`Parameter '${param.key}' is required`);
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    if (param.type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push(`Parameter '${param.key}' must be a number`);
        continue;
      }

      // Min/max validation
      if (param.validation.min !== undefined && numValue < param.validation.min) {
        errors.push(`Parameter '${param.key}' must be at least ${param.validation.min}`);
      }
      if (param.validation.max !== undefined && numValue > param.validation.max) {
        errors.push(`Parameter '${param.key}' must be at most ${param.validation.max}`);
      }
    }

    // Pattern validation
    if (param.validation.pattern && typeof value === 'string') {
      const regex = new RegExp(param.validation.pattern);
      if (!regex.test(value)) {
        errors.push(`Parameter '${param.key}' does not match required pattern`);
      }
    }

    // Options validation
    if (param.validation.options && param.validation.options.length > 0) {
      if (!param.validation.options.includes(value)) {
        errors.push(`Parameter '${param.key}' must be one of: ${param.validation.options.join(', ')}`);
      }
    }
  }

  return errors;
}

/**
 * Register routes
 */
export async function strategyTemplateRoutes(fastify: FastifyInstance) {
  fastify.get('/api/strategy-templates', listTemplates);
  fastify.get('/api/strategy-templates/:id', getTemplate);
  fastify.post('/api/strategy-templates/:id/instantiate', instantiateTemplate);
}
