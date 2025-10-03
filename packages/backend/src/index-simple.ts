import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { config } from './config';
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

  logger.info('Running in simplified mode without database');
}

// 简化的路由
async function registerRoutes() {
  // 健康检查
  fastify.get('/health', async (request, reply) => {
    return { 
      status: 'ok', 
      mode: 'simplified',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    };
  });

  // 基本API路由
  fastify.get('/api/status', async (request, reply) => {
    return {
      message: '多Agent自动化平台 API',
      status: 'running',
      mode: 'development',
      features: {
        database: false,
        redis: false,
        agents: false
      }
    };
  });

  // 模拟认证路由
  fastify.post('/api/auth/nonce', async (request, reply) => {
    const nonce = Math.random().toString(36).substring(2, 15);
    return {
      nonce,
      message: `Sign this message to authenticate: ${nonce}`
    };
  });

  fastify.post('/api/auth/login', async (request, reply) => {
    // 简化的登录逻辑
    const token = fastify.jwt.sign({ 
      walletAddress: '0x1234567890123456789012345678901234567890',
      userId: 'demo-user'
    });
    
    return {
      success: true,
      token,
      user: {
        id: 'demo-user',
        walletAddress: '0x1234567890123456789012345678901234567890'
      }
    };
  });

  // 模拟Agent路由
  fastify.get('/api/agents', async (request, reply) => {
    return {
      agents: [
        {
          id: 'demo-work-agent',
          name: 'Demo Work Agent',
          type: 'work',
          status: 'active',
          description: '演示数据采集Agent'
        },
        {
          id: 'demo-process-agent',
          name: 'Demo Process Agent',
          type: 'process',
          status: 'active',
          description: '演示数据处理Agent'
        }
      ]
    };
  });
}

// 启动服务器
async function start() {
  try {
    await registerPlugins();
    await registerRoutes();

    const address = await fastify.listen({
      port: config.PORT,
      host: config.HOST,
    });

    logger.info(`🚀 Server listening at ${address}`);
    logger.info('📝 Available endpoints:');
    logger.info('  - GET  /health');
    logger.info('  - GET  /api/status');
    logger.info('  - POST /api/auth/nonce');
    logger.info('  - POST /api/auth/login');
    logger.info('  - GET  /api/agents');
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