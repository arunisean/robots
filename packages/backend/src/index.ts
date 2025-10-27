import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { agentRoutes } from './routes/agents';
import { agentTypesRoutes } from './routes/agent-types';
import { workflowRoutes } from './routes/workflows';
import { workflowsPublicRoutes } from './routes/workflows-public';
import { executionRoutes } from './routes/executions';
import { userRoutes } from './routes/users';
import { websocketRoutes } from './routes/websocket';
import { strategyTemplateRoutes } from './routes/strategy-templates';
import { DatabaseService } from './services/database';
import { RedisService } from './services/redis';
import { AgentFactory } from './agents/factory/AgentFactory';
import { logger } from './utils/logger';

// 创建Fastify实例
const fastify = Fastify({
  logger: {
    level: config.LOG_LEVEL,
  },
});

// 注册插件
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: config.CORS_ORIGINS,
    credentials: true,
  });

  // JWT
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
  });

  // WebSocket
  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
      verifyClient: (info, next) => {
        // Allow all connections for now
        // TODO: Add authentication verification
        next(true);
      },
    },
  });

  // 数据库连接（必需）
  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const dbService = new DatabaseService();
  await dbService.connect();
  fastify.decorate('db', dbService);
  logger.info('Database connected successfully');

  // Redis连接（开发模式下可选）
  if (config.REDIS_URL) {
    try {
      console.log('🔄 Attempting to connect to Redis:', config.REDIS_URL);
      const redisService = new RedisService();
      await redisService.connect();
      
      // Test Redis connection immediately
      await redisService.set('startup-test', 'test-value', 10);
      const testValue = await redisService.get('startup-test');
      await redisService.del('startup-test');
      
      if (testValue === 'test-value') {
        fastify.decorate('redis', redisService);
        console.log('✅ Redis connected and tested successfully');
        logger.info('Redis connected successfully');
      } else {
        throw new Error('Redis connection test failed');
      }
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      logger.warn('Redis connection failed, running without cache:', error);
      fastify.decorate('redis', null);
    }
  } else {
    console.log('ℹ️  No REDIS_URL provided, running without Redis');
    logger.info('Running without Redis in development mode');
    fastify.decorate('redis', null);
  }

  // Initialize AgentFactory
  const agentFactory = new AgentFactory();
  fastify.decorate('agentFactory', agentFactory);
  logger.info('AgentFactory initialized');
}

// 注册路由
async function registerRoutes() {
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(userRoutes, { prefix: '/api/users' });
  await fastify.register(agentRoutes, { prefix: '/api/agents' });
  await fastify.register(agentTypesRoutes, { prefix: '/api/agent-types' });
  await fastify.register(workflowRoutes, { prefix: '/api/workflows' });
  await fastify.register(workflowsPublicRoutes, { prefix: '/api/public/workflows' });
  await fastify.register(executionRoutes, { prefix: '/api/executions' });
  await fastify.register(websocketRoutes, { prefix: '/api' });
  await fastify.register(strategyTemplateRoutes);
  
  // Import and register strategy instances routes
  const { strategyInstanceRoutes } = await import('./routes/strategy-instances');
  await fastify.register(strategyInstanceRoutes);
}

// 健康检查
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  };
});

// Redis连接状态检查
fastify.get('/debug/redis', async (request, reply) => {
  const redisConnected = !!fastify.redis;
  let redisStatus = 'disconnected';
  let testResult = null;
  
  if (fastify.redis) {
    try {
      // Test Redis connection
      await fastify.redis.set('debug-test', 'test-value', 10);
      const value = await fastify.redis.get('debug-test');
      await fastify.redis.del('debug-test');
      
      redisStatus = 'connected';
      testResult = {
        setSuccess: true,
        getValue: value,
        deleteSuccess: true
      };
    } catch (error) {
      redisStatus = 'error';
      testResult = {
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  return {
    redis: {
      connected: redisConnected,
      status: redisStatus,
      test: testResult
    },
    config: {
      redisUrl: config.REDIS_URL
    }
  };
});

// 启动服务器
async function start() {
  try {
    await registerPlugins();
    await registerRoutes();

    const address = await fastify.listen({
      port: config.PORT,
      host: config.HOST,
    });

    logger.info(`Server listening at ${address}`);
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

// 启动应用
start();