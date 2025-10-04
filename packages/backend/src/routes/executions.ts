import { FastifyPluginAsync } from 'fastify';
import { ExecutionFilters } from '@multi-agent-platform/shared';
import { WorkflowExecutor } from '../services/WorkflowExecutor';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error-handler';

export const executionRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize executor
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
   * Get execution by ID
   * GET /api/executions/:id
   */
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as any;

      const execution = await fastify.db.executions.findById(id);

      if (!execution) {
        return reply.status(404).send({
          success: false,
          error: 'Execution not found'
        });
      }

      // Get agent results
      const results = await fastify.db.executions.findAgentResultsByExecutionId(id);
      execution.results = results;

      return reply.send({
        success: true,
        data: execution
      });
    } catch (error) {
      logger.error('Error getting execution:', error);
      return reply.status(500).send({
        success: false,
        error: getErrorMessage(error)
      });
    }
  });

  /**
   * Get execution results
   * GET /api/executions/:id/results
   */
  fastify.get('/:id/results', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as any;

      const results = await fastify.db.executions.findAgentResultsByExecutionId(id);

      return reply.send({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Error getting execution results:', error);
      return reply.status(500).send({
        success: false,
        error: getErrorMessage(error)
      });
    }
  });

  /**
   * Get execution events
   * GET /api/executions/:id/events
   */
  fastify.get('/:id/events', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as any;

      const events = await fastify.db.executions.findEventsByExecutionId(id);

      return reply.send({
        success: true,
        data: events
      });
    } catch (error) {
      logger.error('Error getting execution events:', error);
      return reply.status(500).send({
        success: false,
        error: getErrorMessage(error)
      });
    }
  });

  /**
   * Get execution summary
   * GET /api/executions/:id/summary
   */
  fastify.get('/:id/summary', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as any;

      const summary = await fastify.db.executions.getExecutionSummary(id);

      return reply.send({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error getting execution summary:', error);
      return reply.status(500).send({
        success: false,
        error: getErrorMessage(error)
      });
    }
  });

  /**
   * Cancel execution
   * POST /api/executions/:id/cancel
   */
  fastify.post('/:id/cancel', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as any;

      // Check if execution is running
      if (!workflowExecutor.isExecutionActive(id)) {
        return reply.status(400).send({
          success: false,
          error: 'Execution is not running'
        });
      }

      await workflowExecutor.cancelExecution(id);

      return reply.send({
        success: true,
        message: 'Execution cancelled successfully'
      });
    } catch (error) {
      logger.error('Error cancelling execution:', error);
      return reply.status(500).send({
        success: false,
        error: getErrorMessage(error)
      });
    }
  });

  /**
   * Retry failed execution
   * POST /api/executions/:id/retry
   */
  fastify.post<{ Body: { fromAgentId?: string } }>(
    '/:id/retry',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const user = request.user as any;
        const { id } = request.params as any;
        const { fromAgentId } = request.body || {};

        // Get failed execution
        const failedExecution = await fastify.db.executions.findById(id);
        if (!failedExecution) {
          return reply.status(404).send({
            success: false,
            error: 'Execution not found'
          });
        }

        // Get workflow
        const workflow = await fastify.db.workflows.findById(failedExecution.workflowId);
        if (!workflow) {
          return reply.status(404).send({
            success: false,
            error: 'Workflow not found'
          });
        }

        // Retry execution
        const newExecution = await workflowExecutor.retryExecution(
          workflow,
          id,
          fromAgentId,
          user.userId
        );

        return reply.status(202).send({
          success: true,
          data: newExecution,
          message: 'Execution retry started'
        });
      } catch (error) {
        logger.error('Error retrying execution:', error);
        return reply.status(500).send({
          success: false,
          error: getErrorMessage(error)
        });
      }
    }
  );

  /**
   * Get active executions
   * GET /api/executions/active
   */
  fastify.get('/active/list', { preHandler: authenticate }, async (request, reply) => {
    try {
      const activeExecutionIds = workflowExecutor.getActiveExecutions();
      
      const executions = await Promise.all(
        activeExecutionIds.map(id => fastify.db.executions.findById(id))
      );

      return reply.send({
        success: true,
        data: executions.filter(e => e !== null)
      });
    } catch (error) {
      logger.error('Error getting active executions:', error);
      return reply.status(500).send({
        success: false,
        error: getErrorMessage(error)
      });
    }
  });

  /**
   * Get running executions from database
   * GET /api/executions/running
   */
  fastify.get('/running/list', { preHandler: authenticate }, async (request, reply) => {
    try {
      const executions = await fastify.db.executions.findRunning();

      return reply.send({
        success: true,
        data: executions
      });
    } catch (error) {
      logger.error('Error getting running executions:', error);
      return reply.status(500).send({
        success: false,
        error: getErrorMessage(error)
      });
    }
  });
};
