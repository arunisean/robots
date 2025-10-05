const Redis = require('redis');

// 模拟后端的Redis服务类
class TestRedisService {
  constructor() {
    this.client = Redis.createClient({
      url: 'redis://localhost:6379',
    });

    this.client.on('connect', () => {
      console.log('✅ Redis client connected');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis client error:', err);
    });
  }

  async connect() {
    try {
      console.log('🔄 Attempting to connect...');
      await this.client.connect();
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async set(key, value, ttl) {
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      console.log(`✅ SET ${key} = ${value} (TTL: ${ttl || 'none'})`);
    } catch (error) {
      console.error(`❌ Redis SET error for key ${key}:`, error);
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      console.log(`✅ GET ${key} = ${value}`);
      return value;
    } catch (error) {
      console.error(`❌ Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async disconnect() {
    await this.client.disconnect();
    console.log('✅ Redis disconnected');
  }
}

async function testRedisService() {
  console.log('=== Testing Redis Service (Backend Style) ===');
  
  const redisService = new TestRedisService();
  
  try {
    await redisService.connect();
    
    // Test nonce operations like the backend does
    const testWallet = '0x1234567890123456789012345678901234567890';
    const testNonce = 'test-nonce-backend-style';
    const nonceKey = `nonce:${testWallet}`;
    
    console.log('\\n--- Testing Backend-Style Nonce Operations ---');
    await redisService.set(nonceKey, testNonce, 300);
    const storedNonce = await redisService.get(nonceKey);
    
    console.log('Nonce stored correctly:', storedNonce === testNonce);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    try {
      await redisService.disconnect();
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  }
}

testRedisService().catch(console.error);