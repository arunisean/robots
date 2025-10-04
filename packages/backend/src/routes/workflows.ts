import { FastifyPluginAsync } from 'fastify';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowFilters,
  ExecuteWorkflowDto,
  WorkflowStatus
} from '@multi-agent-platform/shared';
import { WorkflowService } from '../services/WorkflowService';
import { WorkflowValidator } from '../services/WorkflowValidator';
import { WorkflowExecutor } from '../services/WorkflowExecutor';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error-handler';

export const workflowRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize services
  const workflowService = new WorkflowService(fastify.db.workflows);
  const workflowValidator = new WorkflowValidator();
  const workflowExecutor = new WorkflowExecutor(
    fastify.db.executions,
    fastify.agentFactory
  );

  // Authentication middleware
  const authenticate = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ success: false, error: 'Unauthorized' });
    }
  };

  /**
   * List workflows
   * GET /api/workflows
   */
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = request.user as any;
      const query = request.query as any;

      const filters: WorkflowFilters = {
        status: query.status,
        category: query.category,
        tags: query.tags ? (Array.isArray(query.tags) ? query.tags : [query.tags]) : undefined,
        search: query.search,
        limit: query.limit ? parseInt(query.limit) : 10,
        offset: query.offset ? parseInt(query.offset) : 0,
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'desc'
      };

      const result = await workflowService.listWorkflows(user.userId, filters);

      return reply.send({
        success: true,
        data: result.workflows,
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: Math.ceil(result.total / result.pageSize)
        }
      });
    } catch (error) {
      logger.error('Error listing workflows:', error);
      return reply.status(500).send({
        success: false,
        error: getErrorMessage(error)
      });
    }
  });

  /**
   * Get workflow by ID
   * GET /api/workflows/:id
   */
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;

      const workflow = await workflowService.getWorkflow(id, user.userId);

      return reply.send({
        success: true,
        data: workflow
      });
    } catch (error) {
      logger.error('Error getting workflow:', error);
      const errorMsg = getErrorMessage(error);
      const status = errorMsg.includes('not found') ? 404 : 
                     errorMsg.includes('Access denied') ? 403 : 500;
      return reply.status(status).send({
        success: false,
        error: errorMsg
      });
    }
  });

  /**
   * Create workflow
   * POST /api/workflows
   */
  fastify.post<{ Body: CreateWorkflowDto }>(
    '/',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const workflowData = request.body;

        // Validate required fields
        if (!workflowData.name || !workflowData.definition) {
          return reply.status(400).send({
            success: false,
            error: 'Missing required fields: name, definition'
          });
        }

        // Create workflow
        const workflow = await workflowService.createWorkflow(workflowData, user.userId);

        return reply.status(201).send({
          success: true,
          data: workflow
        });
      } catch (error) {
        logger.error('Error creating workflow:', error);
        const errorMsg = getErrorMessage(error);
        const status = errorMsg.includes('validation failed') ? 400 : 500;
        return reply.status(status).send({
          success: false,
          error: errorMsg
        });
      }
    }
  );

  /**
   * Update workflow
   * PUT /api/workflows/:id
   */
  fastify.put<{ Body: UpdateWorkflowDto }>(
    '/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as any;
        const updates = request.body;

        const workflow = await workflowService.updateWorkflow(id, updates, user.userId);

        return reply.send({
          success: true,
          data: workflow
        });
      } catch (error) {
        logger.error('Error updating workflow:', error);
        const errorMsg = getErrorMessage(error);
        const status = errorMsg.includes('not found') ? 404 :
                       errorMsg.includes('Access denied') ? 403 :
                       errorMsg.includes('validation failed') ? 400 : 500;
        return reply.status(status).send({
          success: false,
          error: errorMsg
        });
      }
    }
  );

  /**
   * Delete workflow
   * DELETE /api/workflows/:id
   */
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;

      await workflowService.deleteWorkflow(id, user.userId);

      return reply.send({
        success: true,
        message: 'Workflow deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting workflow:', error);
      const errorMsg = getErrorMessage(error);
      const status = errorMsg.includes('not found') ? 404 :
                     errorMsg.includes('Access denied') ? 403 :
                     errorMsg.includes('Cannot delete') ? 400 : 500;
      return reply.status(status).send({
        success: false,
        error: errorMsg
      });
    }
  });

  /**
   * Update workflow status
   * PATCH /api/workflows/:id/status
   */
  fastify.patch<{ Body: { status: WorkflowStatus } }>(
    '/:id/status',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as any;
        const { status } = request.body;

        if (!status) {
          return reply.status(400).send({
            success: false,
            error: 'Status is required'
          });
        }

        const workflow = await workflowService.updateWorkflowStatus(id, status, user.userId);

        return reply.send({
          success: true,
          data: workflow
        });
      } catch (error) {
        logger.error('Error updating workflow status:', error);
        const errorMsg = getErrorMessage(error);
        const status = errorMsg.includes('not found') ? 404 :
                       errorMsg.includes('Access denied') ? 403 :
                       errorMsg.includes('Invalid status') ? 400 : 500;
        return reply.status(status).send({
          success: false,
          error: errorMsg
        });
      }
    }
  );

  /**
   * Get workflow statistics
   * GET /api/workflows/:id/stats
   */
  fastify.get('/:id/stats', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;

      const stats = await workflowService.getWorkflowStats(id, user.userId);

      return reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting workflow stats:', error);
      const errorMsg = getErrorMessage(error);
      const status = errorMsg.includes('not found') ? 404 :
                     errorMsg.includes('Access denied') ? 403 : 500;
      return reply.status(status).send({
        success: false,
        error: errorMsg
      });
    }
  });

  /**
   * Duplicate workflow
   * POST /api/workflows/:id/duplicate
   */
  fastify.post('/:id/duplicate', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;

      const duplicate = await workflowService.duplicateWorkflow(id, user.userId);

      return reply.status(201).send({
        success: true,
        data: duplicate
      });
    } catch (error) {
      logger.error('Error duplicating workflow:', error);
      const errorMsg = getErrorMessage(error);
      const status = errorMsg.includes('not found') ? 404 :
                     errorMsg.includes('Access denied') ? 403 : 500;
      return reply.status(status).send({
        success: false,
        error: errorMsg
      });
    }
  });

  /**
   * Validate workflow definition
   * POST /api/workflows/validate
   */
  fastify.post<{ Body: { definition: any } }>(
    '/validate',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { definition } = request.body;

        if (!definition) {
          return reply.status(400).send({
            success: false,
            error: 'Definition is required'
          });
        }

        const validation = workflowValidator.validate(definition);

        return reply.send({
          success: true,
          data: validation
        });
      } catch (error) {
        logger.error('Error validating workflow:', error);
        return reply.status(500).send({
          success: false,
          error: getErrorMessage(error)
        });
      }
    }
  );

  /**
   * Execute workflow
   * POST /api/workflows/:id/execute
   */
  fastify.post<{ Body: ExecuteWorkflowDto }>(
    '/:id/execute',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as any;
        const options = request.body || {};

        // Get workflow
        const workflow = await workflowService.getWorkflow(id, user.userId);

        // Check if workflow is active
        if (workflow.status !== 'active' && !options.inputData?.force) {
          return reply.status(400).send({
            success: false,
            error: 'Workflow must be active to execute. Set status to active first.'
          });
        }

        // Execute workflow
        const execution = await workflowExecutor.executeWorkflow(
          workflow,
          {
            dryRun: options.inputData?.dryRun,
            skipValidation: options.inputData?.skipValidation
          },
          user.userId
        );

        return reply.status(202).send({
          success: true,
          data: execution,
          message: 'Workflow execution started'
        });
      } catch (error) {
        logger.error('Error executing workflow:', error);
        const errorMsg = getErrorMessage(error);
        const status = errorMsg.includes('not found') ? 404 :
                       errorMsg.includes('Access denied') ? 403 :
                       errorMsg.includes('must be active') ? 400 : 500;
        return reply.status(status).send({
          success: false,
          error: errorMsg
        });
      }
    }
  );

  /**
   * Get workflow execution history
   * GET /api/workflows/:id/executions
   */
  fastify.get('/:id/executions', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as any;
      const query = request.query as any;

      // Check ownership
      await workflowService.getWorkflow(id, user.userId);

      // Get executions
      const executions = await fastify.db.executions.findByWorkflowId(id, {
        status: query.status,
        limit: query.limit ? parseInt(query.limit) : 20,
        offset: query.offset ? parseInt(query.offset) : 0
      });

      const total = await fastify.db.executions.countByWorkflowId(id, {
        status: query.status
      });

      return reply.send({
        success: true,
        data: executions,
        pagination: {
          total,
          limit: query.limit ? parseInt(query.limit) : 20,
          offset: query.offset ? parseInt(query.offset) : 0
        }
      });
    } catch (error) {
      logger.error('Error getting execution history:', error);
      const errorMsg = getErrorMessage(error);
      const status = errorMsg.includes('not found') ? 404 :
                     errorMsg.includes('Access denied') ? 403 : 500;
      return reply.status(status).send({
        success: false,
        error: errorMsg
      });
    }
  });
};
