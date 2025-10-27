/**
 * Local Database Setup Script
 * Sets up PostgreSQL and Redis for local development
 */

import { DatabaseService } from './services/database.js';
import { RedisService } from './services/redis.js';

async function setupLocalDatabase() {
  console.log('🗄️  Setting up local database...\n');

  try {
    // Test PostgreSQL connection
    console.log('1️⃣  Testing PostgreSQL connection...');
    const dbService = new DatabaseService();
    
    try {
      await dbService.connect();
      console.log('✅ PostgreSQL connected successfully');
      
      // Test basic query
      console.log('📋 Testing database query...');
      await dbService.query('SELECT NOW() as current_time');
      console.log('✅ Database query test completed');
    } catch (dbError: any) {
      console.log('❌ PostgreSQL connection failed:', dbError.message);
      console.log('\n💡 To set up PostgreSQL:');
      console.log('   Option 1: Install PostgreSQL locally');
      console.log('   Option 2: Use Docker: docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15');
      console.log('   Option 3: Use cloud service (Supabase, AWS RDS, etc.)');
    }

    console.log();

    // Test Redis connection
    console.log('2️⃣  Testing Redis connection...');
    const redisService = new RedisService();
    
    try {
      await redisService.connect();
      
      // Test Redis
      await redisService.set('test-key', 'test-value', 10);
      const value = await redisService.get('test-key');
      await redisService.del('test-key');
      
      if (value === 'test-value') {
        console.log('✅ Redis connected and tested successfully');
      } else {
        throw new Error('Redis test failed');
      }
      
      // Redis connection will be closed automatically
    } catch (redisError: any) {
      console.log('❌ Redis connection failed:', redisError.message);
      console.log('\n💡 To set up Redis:');
      console.log('   Option 1: Install Redis locally');
      console.log('   Option 2: Use Docker: docker run --name redis -p 6379:6379 -d redis:7');
      console.log('   Option 3: Use cloud service (Redis Cloud, AWS ElastiCache, etc.)');
      console.log('\n⚠️  Note: Redis is optional for development. The app will work without it.');
    }

    console.log();
    console.log('🎯 Database setup check completed!');
    console.log();
    console.log('📝 Environment Variables:');
    console.log('   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multi_agent_platform');
    console.log('   REDIS_URL=redis://localhost:6379');
    console.log('   JWT_SECRET=your-secret-key');
    console.log();
    console.log('🚀 If both services are running, you can start the full server:');
    console.log('   npm run dev');
    console.log();
    console.log('🔧 Or continue with simple mode (no database required):');
    console.log('   npm run dev:simple');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupLocalDatabase();