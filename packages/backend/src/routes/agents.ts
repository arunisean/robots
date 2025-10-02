import { FastifyPluginAsync } from 'fastify';
import { AgentFactory } from '../agents/factory/AgentFactory';
import { AgentRegistry } from '../agents/registry/AgentRegistry';
import { AgentRuntimeManager } from '../agents/runtime/AgentRuntimeManager';
import { AgentTemplateGenerator } from '../agents/templates/AgentTemplateGenerator';
import { 
  AgentCategory, 
  AgentConfig, 
  AgentStatus,
  ResourceAllocation 
} from '@multi-agent-platform/shared';
import { logger } from '../utils/logger';

interface AgentInstallRequest {
  type: string;
  config: AgentConfig;
  autoStart?: boolean;
}

interface AgentUpdateRequest {
  config: Partial<AgentConfig>;
}

interface AgentExecuteRequest {
  input: any;
  timeout?: number;
}

export const agentRoutes: FastifyPluginAsync = async (fastify) => {
  const agentFactory = new AgentFactory();
  const agentRegistry = new AgentRegistry();
  const runtimeManager = new AgentRuntimeManager();

  // Register runtime manager with registry for event coordination
  agentRegistry.on('agentRegistered', async ({ agent }) => {
    await runtimeManager.registerAgent(agent);
  });

  agentRegistry.on('agentUnregistered', async ({ agentId }) => {
    await runtimeManager.unregisterAgent(agentId);
  });

  /**
   * Get available agent types and templates
   */
  fastify.get('/types', async (request, reply) => {
    try {
      const availableTypes = agentFactory.getAvailableTypes();
      const templatesByCategory = {
        work: AgentTemplateGenerator.getAvailableTemplates(AgentCategory.WORK),
        process: AgentTemplateGenerator.getAvailableTemplates(AgentCategory.PROCESS),
        publish: AgentTemplateGenerator.getAvailableTemplates(AgentCategory.PUBLISH),
        validate: AgentTemplateGenerator.getAvailableTemplates(AgentCategory.VALIDATE)
      };

      return reply.send({
        success: true,
        data: {
          availableTypes,
          templates: templatesByCategory
        }
      });
    } catch (error) {
      logger.error('Error getting agent types:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get agent types'
      });
    }
  });

  /**
   * Generate agent configuration template
   */
  fastify.post<{ Body: { category: AgentCategory; type: string; options?: any } }>('/template/config', async (request, reply) => {
    try {
      const { category, type, options } = request.body;

      if (!category || !type) {
        return reply.status(400).send({
          success: false,
          error: 'Category and type are required'
        });
      }

      const template = AgentTemplateGenerator.generateConfigTemplate(category, type, options);

      return reply.send({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Error generating config template:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to generate config template'
      });
    }
  });

  /**
   * Generate agent code template
   */
  fastify.post<{ Body: { category: AgentCategory; type: string; className: string; options?: any } }>('/template/code', async (request, reply) => {
    try {
      const { category, type, className, options } = request.body;

      if (!category || !type || !className) {
        return reply.status(400).send({
          success: false,
          error: 'Category, type, and className are required'
        });
      }

      const codeTemplate = AgentTemplateGenerator.generateCodeTemplate(category, type, className, options);
      const testTemplate = AgentTemplateGenerator.generateTestTemplate(category, className, type);

      return reply.send({
        success: true,
        data: {
          code: codeTemplate,
          test: testTemplate
        }
      });
    } catch (error) {
      logger.error('Error generating code template:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to generate code template'
      });
    }
  });

  /**
   * Install (create and register) a new agent
   */
  fastify.post<{ Body: AgentInstallRequest }>('/install', async (request, reply) => {
    try {
      const { type, config, autoStart = false } = request.body;

      if (!type || !config) {
        return reply.status(400).send({
          success: false,
          error: 'Type and config are required'
        });
      }

      // Validate configuration
      const validation = agentFactory.validateConfigForType(type, config);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid configuration',
          details: validation.errors
        });
      }

      // Create agent
      const agent = await agentFactory.createAgent(type, config);

      // Register agent
      await agentRegistry.register(agent);

      // Auto-start if requested
      if (autoStart) {
        await runtimeManager.startAgent(agent.id);
      }

      logger.info(`Agent installed successfully: ${agent.id} (${type})`);

      return reply.send({
        success: true,
        data: {
          agentId: agent.id,
          name: agent.name,
          type,
          status: autoStart ? AgentStatus.RUNNING : AgentStatus.INACTIVE,
          config: agent.validateConfig(config)
        }
      });
    } catch (error) {
      logger.error('Error installing agent:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to install agent'
      });
    }
  });

  /**
   * Get all agents
   */
  fastify.get('/list', async (request, reply) => {
    try {
      const agents = agentRegistry.list();
      const agentList = agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        category: agent.category,
        version: agent.version,
        description: agent.description,
        status: agent.getStatus(),
        metrics: agent.getMetrics(),
        isRunning: runtimeManager.getRunningAgents().includes(agent.id)
      }));

      return reply.send({
        success: true,
        data: agentList
      });
    } catch (error) {
      logger.error('Error listing agents:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to list agents'
      });
    }
  });

  /**
   * Get agent by ID
   */
  fastify.get<{ Params: { agentId: string } }>('/agent/:agentId', async (request, reply) => {
    try {
      const { agentId } = request.params;
      const agent = agentRegistry.get(agentId);

      if (!agent) {
        return reply.status(404).send({
          success: false,
          error: 'Agent not found'
        });
      }

      const isRunning = runtimeManager.getRunningAgents().includes(agentId);
      const resourceUsage = isRunning ? runtimeManager.getAgentResourceUsage(agentId) : null;
      const executionMetrics = isRunning ? runtimeManager.getAgentMetrics(agentId) : null;

      return reply.send({
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          category: agent.category,
          version: agent.version,
          description: agent.description,
          status: agent.getStatus(),
          metrics: agent.getMetrics(),
          isRunning,
          resourceUsage,
          executionMetrics
        }
      });
    } catch (error) {
      logger.error('Error getting agent:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get agent'
      });
    }
  });

  /**
   * Start an agent
   */
  fastify.post<{ Params: { agentId: string }; Body: { resources?: ResourceAllocation } }>('/agent/:agentId/start', async (request, reply) => {
    try {
      const { agentId } = request.params;
      const { resources } = request.body || {};

      const agent = agentRegistry.get(agentId);
      if (!agent) {
        return reply.status(404).send({
          success: false,
          error: 'Agent not found'
        });
      }

      if (runtimeManager.getRunningAgents().includes(agentId)) {
        return reply.status(400).send({
          success: false,
          error: 'Agent is already running'
        });
      }

      await runtimeManager.startAgent(agentId, resources);

      logger.info(`Agent started: ${agentId}`);

      return reply.send({
        success: true,
        data: {
          agentId,
          status: AgentStatus.RUNNING,
          message: 'Agent started successfully'
        }
      });
    } catch (error) {
      logger.error('Error starting agent:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to start agent'
      });
    }
  });

  /**
   * Stop an agent
   */
  fastify.post<{ Params: { agentId: string } }>('/agent/:agentId/stop', async (request, reply) => {
    try {
      const { agentId } = request.params;

      const agent = agentRegistry.get(agentId);
      if (!agent) {
        return reply.status(404).send({
          success: false,
          error: 'Agent not found'
        });
      }

      if (!runtimeManager.getRunningAgents().includes(agentId)) {
        return reply.status(400).send({
          success: false,
          error: 'Agent is not running'
        });
      }

      await runtimeManager.stopAgent(agentId);

      logger.info(`Agent stopped: ${agentId}`);

      return reply.send({
        success: true,
        data: {
          agentId,
          status: AgentStatus.INACTIVE,
          message: 'Agent stopped successfully'
        }
      });
    } catch (error) {
      logger.error('Error stopping agent:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to stop agent'
      });
    }
  });

  /**
   * Execute an agent
   */
  fastify.post<{ Params: { agentId: string }; Body: AgentExecuteRequest }>('/agent/:agentId/execute', async (request, reply) => {
    try {
      const { agentId } = request.params;
      const { input, timeout } = request.body;

      const agent = agentRegistry.get(agentId);
      if (!agent) {
        return reply.status(404).send({
          success: false,
          error: 'Agent not found'
        });
      }

      if (!runtimeManager.getRunningAgents().includes(agentId)) {
        return reply.status(400).send({
          success: false,
          error: 'Agent is not running'
        });
      }

      const result = await runtimeManager.executeAgent(agentId, input);

      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error executing agent:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to execute agent'
      });
    }
  });

  /**
   * Update agent configuration
   */
  fastify.put<{ Params: { agentId: string }; Body: AgentUpdateRequest }>('/agent/:agentId/config', async (request, reply) => {
    try {
      const { agentId } = request.params;
      const { config } = request.body;

      const agent = agentRegistry.get(agentId);
      if (!agent) {
        return reply.status(404).send({
          success: false,
          error: 'Agent not found'
        });
      }

      await agentRegistry.updateAgentConfig(agentId, config);

      logger.info(`Agent configuration updated: ${agentId}`);

      return reply.send({
        success: true,
        data: {
          agentId,
          message: 'Configuration updated successfully'
        }
      });
    } catch (error) {
      logger.error('Error updating agent config:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to update agent configuration'
      });
    }
  });

  /**
   * Uninstall (remove) an agent
   */
  fastify.delete<{ Params: { agentId: string } }>('/agent/:agentId', async (request, reply) => {
    try {
      const { agentId } = request.params;

      const agent = agentRegistry.get(agentId);
      if (!agent) {
        return reply.status(404).send({
          success: false,
          error: 'Agent not found'
        });
      }

      // Stop agent if running
      if (runtimeManager.getRunningAgents().includes(agentId)) {
        await runtimeManager.stopAgent(agentId);
      }

      // Unregister agent
      await agentRegistry.unregister(agentId);

      logger.info(`Agent uninstalled: ${agentId}`);

      return reply.send({
        success: true,
        data: {
          agentId,
          message: 'Agent uninstalled successfully'
        }
      });
    } catch (error) {
      logger.error('Error uninstalling agent:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to uninstall agent'
      });
    }
  });

  /**
   * Get runtime statistics
   */
  fastify.get('/stats', async (request, reply) => {
    try {
      const runtimeStats = runtimeManager.getRuntimeStats();
      const registryStats = agentRegistry.getStats();

      return reply.send({
        success: true,
        data: {
          runtime: runtimeStats,
          registry: registryStats
        }
      });
    } catch (error) {
      logger.error('Error getting stats:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get statistics'
      });
    }
  });

  /**
   * Perform health check on all agents
   */
  fastify.get('/health', async (request, reply) => {
    try {
      const runtimeHealth = await runtimeManager.performHealthCheck();
      const registryHealth = await agentRegistry.performHealthCheck();

      return reply.send({
        success: true,
        data: {
          runtime: runtimeHealth,
          registry: registryHealth,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Error performing health check:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to perform health check'
      });
    }
  });

  /**
   * Get agents by status
   */
  fastify.get<{ Querystring: { status?: string; category?: string } }>('/filter', async (request, reply) => {
    try {
      const { status, category } = request.query;
      let agents = agentRegistry.list();

      if (category) {
        agents = agentRegistry.list(category as AgentCategory);
      }

      if (status) {
        agents = agentRegistry.getAgentsByStatus(status);
      }

      const agentList = agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        category: agent.category,
        version: agent.version,
        description: agent.description,
        status: agent.getStatus(),
        metrics: agent.getMetrics(),
        isRunning: runtimeManager.getRunningAgents().includes(agent.id)
      }));

      return reply.send({
        success: true,
        data: agentList
      });
    } catch (error) {
      logger.error('Error filtering agents:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to filter agents'
      });
    }
  });

  // Cleanup on server shutdown
  fastify.addHook('onClose', async () => {
    logger.info('Shutting down agent management system');
    await runtimeManager.shutdown();
    await agentRegistry.shutdown();
  });
};