import Fastify from 'fastify';
import cors from '@fastify/cors';
import { strategyTemplateRoutes } from './routes/strategy-templates';

/**
 * Simple server for demo purposes - no database required
 */

const fastify = Fastify({
  logger: {
    level: 'info',
  },
});

async function start() {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    });

    // Register strategy template routes
    await fastify.register(strategyTemplateRoutes);

    // Health check
    fastify.get('/health', async (request, reply) => {
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        mode: 'simple'
      };
    });

    // Start server
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    
    console.log('🚀 Simple server started successfully!');
    console.log(`📡 Server running at: http://localhost:${port}`);
    console.log('📊 Strategy templates API available at: /api/strategy-templates');
    console.log('🏥 Health check: /health');
    console.log();
    console.log('🧪 Test the API:');
    console.log(`   curl http://localhost:${port}/api/strategy-templates`);
    console.log();
    console.log('🌐 Frontend: http://localhost:3000/strategies');
    
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await fastify.close();
  process.exit(0);
});

start();