import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { agentRoutes } from './routes/agents';
import { workflowRoutes } from './routes/workflows';
import { userRoutes } from './routes/users';
import { DatabaseService } from './services/database';
import { RedisService } from './services/redis';
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

  // 数据库连接（开发模式下可选）
  if (config.DATABASE_URL && config.DATABASE_URL !== 'sqlite:./dev.db') {
    try {
      const dbService = new DatabaseService();
      await dbService.connect();
      fastify.decorate('db', dbService);
      logger.info('Database connected successfully');
    } catch (error) {
      logger.warn('Database connection failed, running without database:', error);
      fastify.decorate('db', null);
    }
  } else {
    logger.info('Running without database in development mode');
    fastify.decorate('db', null);
  }

  // Redis连接（开发模式下可选）
  if (config.REDIS_URL) {
    try {
      const redisService = new RedisService();
      await redisService.connect();
      fastify.decorate('redis', redisService);
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.warn('Redis connection failed, running without cache:', error);
      fastify.decorate('redis', null);
    }
  } else {
    logger.info('Running without Redis in development mode');
    fastify.decorate('redis', null);
  }
}

// 注册路由
async function registerRoutes() {
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(userRoutes, { prefix: '/api/users' });
  await fastify.register(agentRoutes, { prefix: '/api/agents' });
  await fastify.register(workflowRoutes, { prefix: '/api/workflows' });
}

// 健康检查
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
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

// 类型声明
declare module 'fastify' {
  interface FastifyInstance {
    db: DatabaseService | null;
    redis: RedisService | null;
  }
}