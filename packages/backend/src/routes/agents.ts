import { FastifyPluginAsync } from 'fastify';
import { AgentConfigSchema } from '@multi-agent-platform/shared';
import { logger } from '../utils/logger';

interface CreateAgentBody {
  name: string;
  description?: string;
  category: 'work' | 'process' | 'publish' | 'validate';
  version?: string;
  config: any;
  metadata?: any;
}

interface UpdateAgentBody {
  name?: string;
  description?: string;
  status?: 'inactive' | 'active' | 'running' | 'error' | 'paused';
  config?: any;
  metadata?: any;
}

export const agentRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication middleware
  const authenticate = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ success: false, error: 'Unauthorized' });
    }
  };

  // Get all agents for current user
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const { category, status } = request.query as any;

      let agents = await fastify.db.getAgentsByOwner(payload.userId);

      // Apply filters
      if (category) {
        agents = agents.filter(agent => agent.category === category);
      }
      if (status) {
        agents = agents.filter(agent => agent.status === status);
      }

      // Get execution stats for each agent
      const agentsWithStats = await Promise.all(
        agents.map(async (agent) => {
          const statsQuery = `
            SELECT 
              COUNT(*) as total_executions,
              COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_executions,
              COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions,
              AVG(duration) as avg_execution_time,
              MAX(start_time) as last_executed
            FROM execution_records
            WHERE agent_id = $1
          `;
          
          const statsResult = await fastify.db.query(statsQuery, [agent.id]);
          const stats = statsResult.rows[0];

          return {
            ...agent,
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
        agents: agentsWithStats
      });
    } catch (error) {
      logger.error('Error fetching agents:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get specific agent by ID
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const { id } = request.params as any;

      const agent = await fastify.db.getAgentById(id);

      if (!agent) {
        return reply.status(404).send({
          success: false,
          error: 'Agent not found'
        });
      }

      // Check ownership
      if (agent.owner_id !== payload.userId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied'
        });
      }

      // Get execution history
      const executionHistory = await fastify.db.getExecutionRecords({
        agentId: id,
        limit: 20
      });

      return reply.send({
        success: true,
        agent: {
          ...agent,
          executionHistory
        }
      });
    } catch (error) {
      logger.error('Error fetching agent:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Create new agent
  fastify.post<{ Body: CreateAgentBody }>('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const { name, description, category, version = '1.0.0', config, metadata = {} } = request.body;

      // Validate required fields
      if (!name || !category || !config) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: name, category, config'
        });
      }

      // Validate category
      const validCategories = ['work', 'process', 'publish', 'validate'];
      if (!validCategories.includes(category)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid category. Must be one of: work, process, publish, validate'
        });
      }

      // Validate config structure (basic validation)
      try {
        const configWithDefaults = {
          id: `${category}-${Date.now()}`,
          name,
          description: description || '',
          version,
          category,
          enabled: true,
          resources: {
            memory: 512,
            cpu: 1,
            timeout: 300,
            storage: 100
          },
          settings: config
        };

        // Validate using Zod schema
        AgentConfigSchema.parse(configWithDefaults);
      } catch (validationError) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid agent configuration',
          details: validationError
        });
      }

      const agentData = {
        name,
        description: description || '',
        category,
        version,
        config,
        metadata,
        ownerId: payload.userId
      };

      const agent = await fastify.db.createAgent(agentData);

      // Log user activity
      await fastify.db.query(
        'INSERT INTO user_activities (user_id, type, description, metadata, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [
          payload.userId,
          'agent_created',
          `Created ${category} agent: ${name}`,
          { agentId: agent.id, category },
          request.ip
        ]
      );

      logger.info(`Agent created: ${agent.id} by user ${payload.walletAddress}`);

      return reply.status(201).send({
        success: true,
        agent
      });
    } catch (error) {
      logger.error('Error creating agent:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Update agent
  fastify.put<{ Body: UpdateAgentBody }>('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const { id } = request.params as any;
      const updates = request.body;

      // Check if agent exists and user owns it
      const existingAgent = await fastify.db.getAgentById(id);
      if (!existingAgent) {
        return reply.status(404).send({
          success: false,
          error: 'Agent not found'
        });
      }

      if (existingAgent.owner_id !== payload.userId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied'
        });
      }

      // Validate status if provided
      if (updates.status) {
        const validStatuses = ['inactive', 'active', 'running', 'error', 'paused'];
        if (!validStatuses.includes(updates.status)) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid status'
          });
        }
      }

      const updatedAgent = await fastify.db.updateAgent(id, updates);

      // Log user activity
      await fastify.db.query(
        'INSERT INTO user_activities (user_id, type, description, metadata, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [
          payload.userId,
          'agent_updated',
          `Updated agent: ${existingAgent.name}`,
          { agentId: id, updates: Object.keys(updates) },
          request.ip
        ]
      );

      logger.info(`Agent updated: ${id} by user ${payload.walletAddress}`);

      return reply.send({
        success: true,
        agent: updatedAgent
      });
    } catch (error) {
      logger.error('Error updating agent:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Delete agent
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const { id } = request.params as any;

      // Check if agent exists and user owns it
      const existingAgent = await fastify.db.getAgentById(id);
      if (!existingAgent) {
        return reply.status(404).send({
          success: false,
          error: 'Agent not found'
        });
      }

      if (existingAgent.owner_id !== payload.userId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied'
        });
      }

      // Check if agent is currently running
      if (existingAgent.status === 'running') {
        return reply.status(400).send({
          success: false,
          error: 'Cannot delete running agent. Please stop it first.'
        });
      }

      await fastify.db.deleteAgent(id);

      // Log user activity
      await fastify.db.query(
        'INSERT INTO user_activities (user_id, type, description, metadata, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [
          payload.userId,
          'agent_deleted',
          `Deleted agent: ${existingAgent.name}`,
          { agentId: id, category: existingAgent.category },
          request.ip
        ]
      );

      logger.info(`Agent deleted: ${id} by user ${payload.walletAddress}`);

      return reply.send({
        success: true,
        message: 'Agent deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting agent:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Get agent execution history
  fastify.get('/:id/executions', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = request.user as any;
      const { id } = request.params as any;
      const { limit = 50, offset = 0, status } = request.query as any;

      // Check if agent exists and user owns it
      const agent = await fastify.db.getAgentById(id);
      if (!agent) {
        return reply.status(404).send({
          success: false,
          error: 'Agent not found'
        });
      }

      if (agent.owner_id !== payload.userId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied'
        });
      }

      const filters: any = { agentId: id, limit, offset };
      if (status) filters.status = status;

      const executions = await fastify.db.getExecutionRecords(filters);

      return reply.send({
        success: true,
        executions,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      logger.error('Error fetching agent executions:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });
};