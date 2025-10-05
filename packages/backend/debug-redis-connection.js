const Redis = require('redis');

async function testRedisConnection() {
  console.log('=== Redis Connection Test ===');
  
  const client = Redis.createClient({
    url: 'redis://localhost:6379',
  });

  client.on('connect', () => {
    console.log('✅ Redis client connected');
  });

  client.on('error', (err) => {
    console.error('❌ Redis client error:', err);
  });

  try {
    console.log('Attempting to connect to Redis...');
    await client.connect();
    console.log('✅ Redis connected successfully');

    // Test basic operations
    console.log('\n--- Testing Basic Operations ---');
    
    // Set a test key
    await client.set('test-key', 'test-value', { EX: 60 });
    console.log('✅ SET operation successful');
    
    // Get the test key
    const value = await client.get('test-key');
    console.log('✅ GET operation successful, value:', value);
    
    // Test nonce-like operation
    const testNonce = 'test-nonce-12345';
    const testWallet = '0x1234567890123456789012345678901234567890';
    const nonceKey = `nonce:${testWallet}`;
    
    console.log('\n--- Testing Nonce Operations ---');
    console.log('Setting nonce key:', nonceKey);
    console.log('Setting nonce value:', testNonce);
    
    await client.set(nonceKey, testNonce, { EX: 300 }); // 5 minutes
    console.log('✅ Nonce SET operation successful');
    
    const storedNonce = await client.get(nonceKey);
    console.log('✅ Nonce GET operation successful, value:', storedNonce);
    console.log('Values match:', storedNonce === testNonce);
    
    // Check TTL
    const ttl = await client.ttl(nonceKey);
    console.log('✅ TTL check successful, remaining seconds:', ttl);
    
    // Clean up
    await client.del('test-key');
    await client.del(nonceKey);
    console.log('✅ Cleanup successful');
    
  } catch (error) {
    console.error('❌ Redis connection test failed:', error);
  } finally {
    try {
      await client.disconnect();
      console.log('✅ Redis disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting from Redis:', error);
    }
  }
}

testRedisConnection().catch(console.error);