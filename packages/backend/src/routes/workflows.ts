import { FastifyPluginAsync } from 'fastify';
import { WorkflowSchema } from '@multi-agent-platform/shared';
import { logger } from '../utils/logger';

interface CreateWorkflowBody {
  name: string;
  description?: string;
  version?: string;
  definition: any;
  settings?: any;
  metadata?: any;
}

interface UpdateWorkflowBody {
  name?: string;
  description?: string;
  status?: 'draft' | 'active' | 'paused' | 'archived' | 'error';
  version?: string;
  definition?: any;
  settings?: any;
  metadata?: any;
}

export const workflowRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication middleware
  const authenticate = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ success: false, error: 'Unauthorized' });
    }
  };

  // Get all workflows for current user
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const { status } = request.query as any;

      let workflows = await fastify.db.getWorkflowsByOwner(payload.userId);

      // Apply status filter
      if (status) {
        workflows = workflows.filter(workflow => workflow.status === status);
      }

      // Get execution stats for each workflow
      const workflowsWithStats = await Promise.all(
        workflows.map(async (workflow) => {
          const statsQuery = `
            SELECT 
              COUNT(*) as total_executions,
              COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_executions,
              COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions,
              AVG(duration) as avg_execution_time,
              MAX(start_time) as last_executed
            FROM execution_records
            WHERE workflow_id = $1
          `;
          
          const statsResult = await fastify.db.query(statsQuery, [workflow.id]);
          const stats = statsResult.rows[0];

          return {
            ...workflow,
            stats: {
              totalExecutions: parseInt(stats.total_executions) || 0,
              successfulExecutions: parseInt(stats.successful_executions) || 0,
              failedExecutions: parseInt(stats.failed_executions) || 0,
              avgExecutionTime: parseFloat(stats.avg_execution_time) || 0,
              lastExecuted: stats.last_executed
            }
          };
        })
      );

      return reply.send({
        success: true,
        workflows: workflowsWithStats
      });
    } catch (error) {
      logger.error('Error fetching workflows:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get specific workflow by ID
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const { id } = request.params as any;

      const workflow = await fastify.db.getWorkflowById(id);

      if (!workflow) {
        return reply.status(404).send({
          success: false,
          error: 'Workflow not found'
        });
      }

      // Check ownership
      if (workflow.owner_id !== payload.userId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied'
        });
      }

      // Get execution history
      const executionHistory = await fastify.db.getExecutionRecords({
        workflowId: id,
        limit: 20
      });

      return reply.send({
        success: true,
        workflow: {
          ...workflow,
          executionHistory
        }
      });
    } catch (error) {
      logger.error('Error fetching workflow:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Create new workflow
  fastify.post<{ Body: CreateWorkflowBody }>('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const { 
        name, 
        description, 
        version = '1.0.0', 
        definition, 
        settings = {}, 
        metadata = {} 
      } = request.body;

      // Validate required fields
      if (!name || !definition) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: name, definition'
        });
      }

      // Basic validation of workflow definition
      if (!definition.nodes || !Array.isArray(definition.nodes)) {
        return reply.status(400).send({
          success: false,
          error: 'Workflow definition must contain nodes array'
        });
      }

      // Set default settings if not provided
      const defaultSettings = {
        maxConcurrentExecutions: 1,
        executionTimeout: 1800, // 30 minutes
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          backoffStrategy: 'exponential',
          backoffMs: 1000
        },
        errorHandling: {
          strategy: 'stop',
          notifyOnError: true
        },
        logging: {
          level: 'info',
          retention: 30,
          includeData: false
        }
      };

      const workflowData = {
        name,
        description: description || '',
        version,
        definition,
        settings: { ...defaultSettings, ...settings },
        metadata: {
          ...metadata,
          tags: metadata.tags || [],
          category: metadata.category || 'general',
          author: payload.walletAddress,
          changelog: [{
            version,
            date: new Date(),
            changes: ['Initial version'],
            author: payload.walletAddress
          }],
          stats: {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTime: 0,
            popularity: 0,
            rating: 0
          }
        },
        ownerId: payload.userId
      };

      const workflow = await fastify.db.createWorkflow(workflowData);

      // Log user activity
      await fastify.db.query(
        'INSERT INTO user_activities (user_id, type, description, metadata, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [
          payload.userId,
          'workflow_created',
          `Created workflow: ${name}`,
          { workflowId: workflow.id, nodeCount: definition.nodes.length },
          request.ip
        ]
      );

      logger.info(`Workflow created: ${workflow.id} by user ${payload.walletAddress}`);

      return reply.status(201).send({
        success: true,
        workflow
      });
    } catch (error) {
      logger.error('Error creating workflow:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Update workflow
  fastify.put<{ Body: UpdateWorkflowBody }>('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const { id } = request.params as any;
      const updates = request.body;

      // Check if workflow exists and user owns it
      const existingWorkflow = await fastify.db.getWorkflowById(id);
      if (!existingWorkflow) {
        return reply.status(404).send({
          success: false,
          error: 'Workflow not found'
        });
      }

      if (existingWorkflow.owner_id !== payload.userId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied'
        });
      }

      // Validate status if provided
      if (updates.status) {
        const validStatuses = ['draft', 'active', 'paused', 'archived', 'error'];
        if (!validStatuses.includes(updates.status)) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid status'
          });
        }
      }

      // If updating definition, validate it
      if (updates.definition) {
        if (!updates.definition.nodes || !Array.isArray(updates.definition.nodes)) {
          return reply.status(400).send({
            success: false,
            error: 'Workflow definition must contain nodes array'
          });
        }
      }

      // Update version if definition changed
      if (updates.definition && !updates.version) {
        const currentVersion = existingWorkflow.version.split('.');
        const patch = parseInt(currentVersion[2]) + 1;
        updates.version = `${currentVersion[0]}.${currentVersion[1]}.${patch}`;
      }

      const updatedWorkflow = await fastify.db.query(
        `UPDATE workflows 
         SET name = COALESCE($2, name),
             description = COALESCE($3, description),
             version = COALESCE($4, version),
             status = COALESCE($5, status),
             definition = COALESCE($6, definition),
             settings = COALESCE($7, settings),
             metadata = COALESCE($8, metadata),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          updates.name,
          updates.description,
          updates.version,
          updates.status,
          updates.definition ? JSON.stringify(updates.definition) : null,
          updates.settings ? JSON.stringify(updates.settings) : null,
          updates.metadata ? JSON.stringify(updates.metadata) : null
        ]
      );

      // Log user activity
      await fastify.db.query(
        'INSERT INTO user_activities (user_id, type, description, metadata, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [
          payload.userId,
          'workflow_updated',
          `Updated workflow: ${existingWorkflow.name}`,
          { workflowId: id, updates: Object.keys(updates) },
          request.ip
        ]
      );

      logger.info(`Workflow updated: ${id} by user ${payload.walletAddress}`);

      return reply.send({
        success: true,
        workflow: updatedWorkflow.rows[0]
      });
    } catch (error) {
      logger.error('Error updating workflow:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Delete workflow
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const { id } = request.params as any;

      // Check if workflow exists and user owns it
      const existingWorkflow = await fastify.db.getWorkflowById(id);
      if (!existingWorkflow) {
        return reply.status(404).send({
          success: false,
          error: 'Workflow not found'
        });
      }

      if (existingWorkflow.owner_id !== payload.userId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied'
        });
      }

      // Check if workflow is currently active
      if (existingWorkflow.status === 'active') {
        return reply.status(400).send({
          success: false,
          error: 'Cannot delete active workflow. Please pause it first.'
        });
      }

      await fastify.db.query('DELETE FROM workflows WHERE id = $1', [id]);

      // Log user activity
      await fastify.db.query(
        'INSERT INTO user_activities (user_id, type, description, metadata, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [
          payload.userId,
          'workflow_deleted',
          `Deleted workflow: ${existingWorkflow.name}`,
          { workflowId: id },
          request.ip
        ]
      );

      logger.info(`Workflow deleted: ${id} by user ${payload.walletAddress}`);

      return reply.send({
        success: true,
        message: 'Workflow deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting workflow:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Execute workflow
  fastify.post('/:id/execute', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const { id } = request.params as any;
      const { input } = request.body as any;

      // Check if workflow exists and user owns it
      const workflow = await fastify.db.getWorkflowById(id);
      if (!workflow) {
        return reply.status(404).send({
          success: false,
          error: 'Workflow not found'
        });
      }

      if (workflow.owner_id !== payload.userId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied'
        });
      }

      // Check if workflow is active
      if (workflow.status !== 'active') {
        return reply.status(400).send({
          success: false,
          error: 'Workflow must be active to execute'
        });
      }

      // Create execution record
      const executionRecord = await fastify.db.createExecutionRecord({
        workflowId: id,
        agentId: null, // This will be set when individual agents execute
        status: 'pending',
        startTime: new Date(),
        inputData: input || {},
        metrics: {}
      });

      // TODO: Implement actual workflow execution logic
      // For now, just return the execution ID
      
      logger.info(`Workflow execution started: ${executionRecord.id} for workflow ${id}`);

      return reply.send({
        success: true,
        executionId: executionRecord.id,
        status: 'pending',
        message: 'Workflow execution started'
      });
    } catch (error) {
      logger.error('Error executing workflow:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get workflow templates
  fastify.get('/templates', async (request, reply) => {
    try {
      const { category, difficulty } = request.query as any;

      let query = 'SELECT * FROM workflow_templates WHERE 1=1';
      const params: any[] = [];

      if (category) {
        query += ` AND category = $${params.length + 1}`;
        params.push(category);
      }

      if (difficulty) {
        query += ` AND difficulty = $${params.length + 1}`;
        params.push(difficulty);
      }

      query += ' ORDER BY downloads DESC, rating DESC';

      const result = await fastify.db.query(query, params);

      return reply.send({
        success: true,
        templates: result.rows
      });
    } catch (error) {
      logger.error('Error fetching workflow templates:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });
};