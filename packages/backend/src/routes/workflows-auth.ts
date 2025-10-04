import { FastifyPluginAsync } from 'fastify';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowFilters,
  ExecuteWorkflowDto,
  WorkflowStatus
} from '@multi-agent-platform/shared';
import { WorkflowService } from '../services/WorkflowService';
import { PermissionService } from '../services/PermissionService';
import { AuditService } from '../services/AuditService';
import { UserService } from '../services/UserService';
import { WorkflowExecutor } from '../services/WorkflowExecutor';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { permissionMiddleware } from '../middleware/permission';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error-handler';

/**
 * Authenticated workflow routes with permission checks
 * These routes require JWT authentication and enforce ownership/permissions
 */
export const workflowsAuthRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize services
  const workflowService = new WorkflowService(fastify.db.workflows);
  const permissionService = new PermissionService(fastify.db.getPool());
  const auditService = new AuditService(fastify.db.getPool());
  const userService = new UserService(fastify.db.getPool());
  const workflowExecutor = new WorkflowExecutor(
    fastify.db.executions,
    fastify.agentFactory
  );

  // Attach services to fastify instance for middleware access
  (fastify as any).permissionService = permissionService;

  /**
   * List workflows
   * GET /api/workflows
   */
  fastify.get('/', { preHandler: authMiddleware }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.currentUser!.id;
      const query = request.query as any;

      // Check if user is admin
      const isAdmin = await permissionService.isAdmin(userId);

      const filters: WorkflowFilters & { isAdmin?: boolean; excludeTestData?: boolean } = {
        status: query.status as WorkflowStatus,
        search: query.search,
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0,
        isAdmin,
        excludeTestData: !isAdmin // Regular users don't see test data
      };

      const result = await workflowService.listWorkflows(userId, filters);

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
  fastify.get('/:id', { 
    preHandler: [authMiddleware, permissionMiddleware('workflow', 'read')] 
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.currentUser!.id;
      const { id } = request.params as any;

      const workflow = await workflowService.getWorkflow(id, userId);

      // Log read action
      await auditService.logAction({
        userId,
        action: 'read',
        resourceType: 'workflow',
        resourceId: id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      });

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
  fastify.post('/', { preHandler: authMiddleware }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.currentUser!.id;
      const workflowData = request.body as CreateWorkflowDto;

      const workflow = await workflowService.createWorkflow(workflowData, userId);

      // Log creation
      await auditService.logAction({
        userId,
        action: 'create',
        resourceType: 'workflow',
        resourceId: workflow.id,
        details: {
          workflowName: workflow.name,
          version: workflow.version
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      });

      return reply.status(201).send({
        success: true,
        data: workflow
      });
    } catch (error) {
      logger.error('Error creating workflow:', error);
      return reply.status(500).send({
        success: false,
        error: getErrorMessage(error)
      });
    }
  });

  /**
   * Update workflow
   * PUT /api/workflows/:id
   */
  fastify.put('/:id', { 
    preHandler: [authMiddleware, permissionMiddleware('workflow', 'update')] 
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.currentUser!.id;
      const { id } = request.params as any;
      const updates = request.body as UpdateWorkflowDto;

      const workflow = await workflowService.updateWorkflow(id, updates, userId);

      // Log update
      await auditService.logAction({
        userId,
        action: 'update',
        resourceType: 'workflow',
        resourceId: id,
        details: {
          updates,
          workflowName: workflow.name
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      });

      return reply.send({
        success: true,
        data: workflow
      });
    } catch (error) {
      logger.error('Error updating workflow:', error);
      const errorMsg = getErrorMessage(error);
      const status = errorMsg.includes('Access denied') ? 403 : 500;
      return reply.status(status).send({
        success: false,
        error: errorMsg
      });
    }
  });

  /**
   * Delete workflow
   * DELETE /api/workflows/:id
   */
  fastify.delete('/:id', { 
    preHandler: [authMiddleware, permissionMiddleware('workflow', 'delete')] 
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.currentUser!.id;
      const { id } = request.params as any;

      await workflowService.deleteWorkflow(id, userId);

      // Log deletion
      await auditService.logAction({
        userId,
        action: 'delete',
        resourceType: 'workflow',
        resourceId: id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      });

      return reply.send({
        success: true,
        message: 'Workflow deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting workflow:', error);
      const errorMsg = getErrorMessage(error);
      const status = errorMsg.includes('Access denied') ? 403 : 
                     errorMsg.includes('not found') ? 404 : 500;
      return reply.status(status).send({
        success: false,
        error: errorMsg
      });
    }
  });

  /**
   * Execute workflow
   * POST /api/workflows/:id/execute
   */
  fastify.post('/:id/execute', { 
    preHandler: [authMiddleware, permissionMiddleware('workflow', 'execute')] 
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.currentUser!.id;
      const { id } = request.params as any;
      const options = (request.body as ExecuteWorkflowDto) || {};

      const workflow = await workflowService.getWorkflow(id, userId);

      // Execute workflow
      const execution = await workflowExecutor.executeWorkflow(workflow, options as any, userId);

      // Log execution
      await auditService.logAction({
        userId,
        action: 'execute',
        resourceType: 'workflow',
        resourceId: id,
        details: {
          executionId: execution.id,
          triggerType: options.triggerType || 'manual'
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      });

      return reply.send({
        success: true,
        data: execution
      });
    } catch (error) {
      logger.error('Error executing workflow:', error);
      const errorMsg = getErrorMessage(error);
      const status = errorMsg.includes('Access denied') ? 403 : 500;
      return reply.status(status).send({
        success: false,
        error: errorMsg
      });
    }
  });

  /**
   * Get workflow statistics
   * GET /api/workflows/:id/stats
   */
  fastify.get('/:id/stats', { 
    preHandler: [authMiddleware, permissionMiddleware('workflow', 'read')] 
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.currentUser!.id;
      const { id } = request.params as any;

      const stats = await workflowService.getWorkflowStats(id, userId);

      return reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting workflow stats:', error);
      const errorMsg = getErrorMessage(error);
      const status = errorMsg.includes('Access denied') ? 403 : 500;
      return reply.status(status).send({
        success: false,
        error: errorMsg
      });
    }
  });
};
