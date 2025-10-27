import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Strategy Instances API Routes
 * Manages user's strategy instances (created from templates)
 */

// Mock data for now - will be replaced with database later
const instancesStore = new Map<string, any>();

/**
 * GET /api/strategy-instances
 * List user's strategy instances
 */
interface ListInstancesQuery {
  status?: string;
  paperTrading?: string;
  limit?: string;
  offset?: string;
}

async function listInstances(
  request: FastifyRequest<{ Querystring: ListInstancesQuery }>,
  reply: FastifyReply
) {
  try {
    const {
      status,
      paperTrading,
      limit = '10',
      offset = '0'
    } = request.query;

    // Get all instances
    let instances = Array.from(instancesStore.values());

    // Filter by status
    if (status) {
      instances = instances.filter(i => i.status === status);
    }

    // Filter by paperTrading
    if (paperTrading !== undefined) {
      const isPaper = paperTrading === 'true';
      instances = instances.filter(i => i.paperTrading === isPaper);
    }

    // Sort by creation date (newest first)
    instances.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Paginate
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    const total = instances.length;
    const paginatedInstances = instances.slice(offsetNum, offsetNum + limitNum);

    reply.send({
      data: paginatedInstances,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total
      }
    });
  } catch (error: any) {
    request.log.error('Error listing instances:', error);
    reply.status(500).send({
      error: 'Failed to list instances',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * GET /api/strategy-instances/:id
 * Get a specific strategy instance
 */
interface GetInstanceParams {
  id: string;
}

async function getInstance(
  request: FastifyRequest<{ Params: GetInstanceParams }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const instance = instancesStore.get(id);

    if (!instance) {
      return reply.status(404).send({
        error: 'Instance not found',
        message: `Strategy instance with ID ${id} does not exist`
      });
    }

    reply.send({
      data: instance
    });
  } catch (error: any) {
    request.log.error('Error getting instance:', error);
    reply.status(500).send({
      error: 'Failed to get instance',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * POST /api/strategy-instances/:id/start
 * Start a strategy instance
 */
async function startInstance(
  request: FastifyRequest<{ Params: GetInstanceParams }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const instance = instancesStore.get(id);

    if (!instance) {
      return reply.status(404).send({
        error: 'Instance not found',
        message: `Strategy instance with ID ${id} does not exist`
      });
    }

    if (instance.status === 'running') {
      return reply.status(400).send({
        error: 'Already running',
        message: 'Strategy is already running'
      });
    }

    // Update status
    instance.status = 'running';
    instance.updatedAt = new Date();
    instance.lastExecutedAt = new Date();
    instancesStore.set(id, instance);

    reply.send({
      data: instance,
      message: 'Strategy started successfully'
    });
  } catch (error: any) {
    request.log.error('Error starting instance:', error);
    reply.status(500).send({
      error: 'Failed to start instance',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * POST /api/strategy-instances/:id/stop
 * Stop a strategy instance
 */
async function stopInstance(
  request: FastifyRequest<{ Params: GetInstanceParams }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const instance = instancesStore.get(id);

    if (!instance) {
      return reply.status(404).send({
        error: 'Instance not found',
        message: `Strategy instance with ID ${id} does not exist`
      });
    }

    if (instance.status === 'stopped') {
      return reply.status(400).send({
        error: 'Already stopped',
        message: 'Strategy is already stopped'
      });
    }

    // Update status
    instance.status = 'stopped';
    instance.updatedAt = new Date();
    instancesStore.set(id, instance);

    reply.send({
      data: instance,
      message: 'Strategy stopped successfully'
    });
  } catch (error: any) {
    request.log.error('Error stopping instance:', error);
    reply.status(500).send({
      error: 'Failed to stop instance',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * DELETE /api/strategy-instances/:id
 * Delete a strategy instance
 */
async function deleteInstance(
  request: FastifyRequest<{ Params: GetInstanceParams }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const instance = instancesStore.get(id);

    if (!instance) {
      return reply.status(404).send({
        error: 'Instance not found',
        message: `Strategy instance with ID ${id} does not exist`
      });
    }

    if (instance.status === 'running') {
      return reply.status(400).send({
        error: 'Cannot delete running instance',
        message: 'Please stop the strategy before deleting'
      });
    }

    instancesStore.delete(id);

    reply.send({
      message: 'Strategy instance deleted successfully'
    });
  } catch (error: any) {
    request.log.error('Error deleting instance:', error);
    reply.status(500).send({
      error: 'Failed to delete instance',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * GET /api/strategy-instances/:id/trades
 * Get trades for a strategy instance
 */
async function getInstanceTrades(
  request: FastifyRequest<{ 
    Params: GetInstanceParams;
    Querystring: { limit?: string; offset?: string; }
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { limit = '50', offset = '0' } = request.query;

    const instance = instancesStore.get(id);

    if (!instance) {
      return reply.status(404).send({
        error: 'Instance not found',
        message: `Strategy instance with ID ${id} does not exist`
      });
    }

    // Mock trades data
    const trades: any[] = [];

    reply.send({
      data: trades,
      pagination: {
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: false
      }
    });
  } catch (error: any) {
    request.log.error('Error getting trades:', error);
    reply.status(500).send({
      error: 'Failed to get trades',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * GET /api/strategy-instances/:id/metrics
 * Get performance metrics for a strategy instance
 */
async function getInstanceMetrics(
  request: FastifyRequest<{ Params: GetInstanceParams }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const instance = instancesStore.get(id);

    if (!instance) {
      return reply.status(404).send({
        error: 'Instance not found',
        message: `Strategy instance with ID ${id} does not exist`
      });
    }

    // Calculate metrics from instance data
    const metrics = {
      totalReturn: instance.totalProfitLoss,
      totalReturnPercent: 0,
      totalTrades: instance.totalTrades,
      winningTrades: instance.winningTrades,
      losingTrades: instance.losingTrades,
      winRate: instance.winRate,
      avgWin: instance.winningTrades > 0 ? instance.totalProfitLoss / instance.winningTrades : 0,
      avgLoss: instance.losingTrades > 0 ? Math.abs(instance.totalProfitLoss) / instance.losingTrades : 0,
      profitFactor: 1.0,
      sharpeRatio: 0,
      maxDrawdown: instance.maxDrawdown || 0,
      maxDrawdownPercent: 0,
      currentDrawdown: instance.currentDrawdown || 0,
      recoveryFactor: 0
    };

    reply.send({
      data: metrics
    });
  } catch (error: any) {
    request.log.error('Error getting metrics:', error);
    reply.status(500).send({
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Helper: Store a new instance (called from strategy-templates route)
 */
export function storeInstance(instance: any) {
  instancesStore.set(instance.id, instance);
}

/**
 * Register routes
 */
export async function strategyInstanceRoutes(fastify: FastifyInstance) {
  fastify.get('/api/strategy-instances', listInstances);
  fastify.get('/api/strategy-instances/:id', getInstance);
  fastify.post('/api/strategy-instances/:id/start', startInstance);
  fastify.post('/api/strategy-instances/:id/stop', stopInstance);
  fastify.delete('/api/strategy-instances/:id', deleteInstance);
  fastify.get('/api/strategy-instances/:id/trades', getInstanceTrades);
  fastify.get('/api/strategy-instances/:id/metrics', getInstanceMetrics);
}
