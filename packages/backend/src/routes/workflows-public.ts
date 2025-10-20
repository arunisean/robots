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

/**
 * Public workflow routes (no authentication required)
 * For testing purposes only
 */
export const workflowsPublicRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize services
  const workflowService = new WorkflowService(fastify.db.workflows);
  const workflowValidator = new WorkflowValidator();
  const workflowExecutor = new WorkflowExecutor(
    fastify.db.executions,
    fastify.agentFactory
  );

  /**
   * List workflows
   * GET /api/public/workflows
   */
  fastify.get('/', async (request, reply) => {
    try {
      const query = request.query as any;
      const filters: WorkflowFilters = {
        status: query.status as WorkflowStatus,
        search: query.search,
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0,
      };

      // For public API, use admin access to see all workflows
      const result = await workflowService.listWorkflows('admin', { 
        ...filters, 
        isAdmin: true 
      });

      return reply.send({
        success: true,
        data: {
          workflows: result.workflows,
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    } catch (error) {
      logger.error('Error listing workflows:', error);
      return reply.status(500).send({
        success: false,
        error: getErrorMessage(error),
      });
    }
  });

  /**
   * Get workflow by ID
   * GET /api/public/workflows/:id
   */
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;

      // For public API, directly access the repository without ownership checks
      const workflow = await fastify.db.workflows.findById(id);

      if (!workflow) {
        return reply.status(404).send({
          success: false,
          error: 'Workflow not found',
        });
      }

      return reply.send({
        success: true,
        data: workflow,
      });
    } catch (error) {
      logger.error('Error getting workflow:', error);
      return reply.status(500).send({
        success: false,
        error: getErrorMessage(error),
      });
    }
  });

  /**
   * Create workflow
   * POST /api/public/workflows
   * 
   * Note: This endpoint is for testing only.
   * Production should use authenticated /api/workflows endpoint.
   */
  fastify.post('/', async (request, reply) => {
    try {
      const workflowData = request.body as CreateWorkflowDto;

      // Basic validation - ensure required fields exist
      if (!workflowData.name || !workflowData.definition) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: name and definition are required',
        });
      }

      if (!workflowData.definition.nodes || workflowData.definition.nodes.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Workflow must have at least one agent node',
        });
      }

      // Use test user from seed data
      const testUserId = '00000000-0000-0000-0000-000000000001';

      // Create workflow (skip detailed validation for testing)
      const workflow = await fastify.db.workflows.create(workflowData, testUserId);

      return reply.status(201).send({
        success: true,
        data: workflow,
      });
    } catch (error) {
      logger.error('Error creating workflow:', error);
      return reply.status(500).send({
        success: false,
        error: getErrorMessage(error),
      });
    }
  });

  /**
   * Execute workflow
   * POST /api/public/workflows/:id/execute
   */
  fastify.post('/:id/execute', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const options = (request.body as ExecuteWorkflowDto) || {};

      // For public API, directly access the repository without ownership checks
      const workflow = await fastify.db.workflows.findById(id);

      if (!workflow) {
        return reply.status(404).send({
          success: false,
          error: 'Workflow not found',
        });
      }

      // Execute workflow asynchronously using the workflow's actual owner
      const execution = await workflowExecutor.executeWorkflow(
        workflow,
        options as any,
        workflow.ownerId
      );

      return reply.send({
        success: true,
        data: execution,
      });
    } catch (error) {
      logger.error('Error executing workflow:', error);
      return reply.status(500).send({
        success: false,
        error: getErrorMessage(error),
      });
    }
  });
};
