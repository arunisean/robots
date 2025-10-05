import { FastifyPluginAsync } from 'fastify';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { 
  generateNonce, 
  createSignMessage, 
  verifyEthereumSignature,
  isValidEthereumAddress 
} from '@multi-agent-platform/shared';
import { logger } from '../utils/logger';

interface AuthBody {
  walletAddress: string;
  signature?: string;
  message?: string;
}

interface NonceResponse {
  nonce: string;
  message: string;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // 获取nonce用于签名
  fastify.post<{ Body: { walletAddress: string } }>('/nonce', async (request, reply) => {
    const { walletAddress } = request.body;

    // 验证钱包地址格式
    if (!walletAddress || !isValidEthereumAddress(walletAddress)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid wallet address'
      });
    }

    try {
      // 生成nonce
      const nonce = generateNonce();
      const message = createSignMessage(walletAddress, nonce);

      // 将nonce存储到Redis，设置5分钟过期
      const nonceKey = `nonce:${walletAddress}`;
      console.log('🔄 Attempting to store nonce');
      console.log('- Redis service available:', !!fastify.redis);
      console.log('- Nonce key:', nonceKey);
      console.log('- Nonce value:', nonce);
      
      if (fastify.redis) {
        try {
          await fastify.redis.set(nonceKey, nonce, 300);
          console.log('✅ Nonce stored successfully in Redis');
          
          // Verify storage immediately
          const verifyNonce = await fastify.redis.get(nonceKey);
          console.log('✅ Nonce verification:', verifyNonce === nonce ? 'SUCCESS' : 'FAILED');
          console.log('- Stored value:', verifyNonce);
        } catch (error) {
          console.error('❌ Failed to store nonce in Redis:', error);
        }
      } else {
        console.log('⚠️  Redis not available, using memory storage as fallback');
        // Temporary in-memory storage for development
        if (!global.nonceStore) {
          global.nonceStore = new Map();
        }
        global.nonceStore.set(nonceKey, { nonce, expiresAt: Date.now() + 300000 });
        console.log('✅ Nonce stored in memory storage');
      }

      logger.info(`Generated nonce for wallet: ${walletAddress}`);

      const response: NonceResponse = {
        nonce,
        message
      };

      return reply.send(response);
    } catch (error) {
      logger.error('Error generating nonce:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Web3登录
  fastify.post<{ Body: AuthBody }>('/login', async (request, reply) => {
    const { walletAddress, signature, message } = request.body;

    console.log('\n=== Backend Web3 Login Verification Started ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request IP:', request.ip);
    console.log('User Agent:', request.headers['user-agent']);
    
    console.log('\n--- Received Login Data ---');
    console.log('Wallet Address:', walletAddress);
    console.log('Signature:', signature);
    console.log('Message Preview:', message ? message.substring(0, 100) + '...' : 'null');
    console.log('Message Length:', message ? message.length : 0);
    console.log('Signature Length:', signature ? signature.length : 0);

    // 验证必需参数
    console.log('\n--- Parameter Validation ---');
    const hasWalletAddress = !!walletAddress;
    const hasSignature = !!signature;
    const hasMessage = !!message;
    
    console.log('Has Wallet Address:', hasWalletAddress);
    console.log('Has Signature:', hasSignature);
    console.log('Has Message:', hasMessage);

    if (!walletAddress || !signature || !message) {
      console.error('Missing Required Parameters:', {
        walletAddress: hasWalletAddress,
        signature: hasSignature,
        message: hasMessage
      });
      return reply.status(400).send({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // 验证钱包地址格式
    console.log('\n--- Address Format Validation ---');
    const isValidAddress = isValidEthereumAddress(walletAddress);
    console.log('Address Format Valid:', isValidAddress);
    console.log('Address Length:', walletAddress.length);
    console.log('Starts with 0x:', walletAddress.startsWith('0x'));

    if (!isValidAddress) {
      console.error('Invalid Wallet Address Format:', walletAddress);
      return reply.status(400).send({
        success: false,
        error: 'Invalid wallet address'
      });
    }

    try {
      // 从Redis获取nonce
      console.log('\n--- Nonce Verification ---');
      const nonceKey = `nonce:${walletAddress}`;
      console.log('Nonce Key:', nonceKey);
      
      let storedNonce = null;
      
      if (fastify.redis) {
        storedNonce = await fastify.redis.get(nonceKey);
        console.log('Stored Nonce (Redis):', storedNonce);
      } else {
        // Fallback to memory storage
        console.log('Using memory storage fallback');
        if (global.nonceStore && global.nonceStore.has(nonceKey)) {
          const nonceData = global.nonceStore.get(nonceKey);
          if (nonceData.expiresAt > Date.now()) {
            storedNonce = nonceData.nonce;
            console.log('Stored Nonce (Memory):', storedNonce);
          } else {
            console.log('Nonce expired in memory storage');
            global.nonceStore.delete(nonceKey);
          }
        } else {
          console.log('No nonce found in memory storage');
        }
      }
      
      console.log('Final Stored Nonce:', storedNonce);
      console.log('Redis Available:', !!fastify.redis);

      if (!storedNonce) {
        console.error('Nonce Verification Failed: Nonce not found or expired');
        return reply.status(400).send({
          success: false,
          error: 'Nonce not found or expired'
        });
      }

      // 验证消息格式
      console.log('\n--- Message Format Verification ---');
      const expectedMessage = createSignMessage(walletAddress, storedNonce);
      console.log('Expected Message:');
      console.log('- Content:', JSON.stringify(expectedMessage));
      console.log('- Length:', expectedMessage.length);
      console.log('- First 100 chars:', expectedMessage.substring(0, 100));
      console.log('- Last 100 chars:', expectedMessage.substring(expectedMessage.length - 100));
      
      console.log('Received Message:');
      console.log('- Content:', JSON.stringify(message));
      console.log('- Length:', message.length);
      console.log('- First 100 chars:', message.substring(0, 100));
      console.log('- Last 100 chars:', message.substring(message.length - 100));
      
      const messagesMatch = message === expectedMessage;
      console.log('Messages Match:', messagesMatch);
      
      if (!messagesMatch) {
        console.error('Message Format Verification Failed');
        console.error('Expected vs Received Length:', expectedMessage.length, 'vs', message.length);
        
        // Find differences
        const minLength = Math.min(expectedMessage.length, message.length);
        let firstDifference = -1;
        for (let i = 0; i < minLength; i++) {
          if (expectedMessage[i] !== message[i]) {
            firstDifference = i;
            break;
          }
        }
        
        if (firstDifference >= 0) {
          console.error('First Difference at Position:', firstDifference);
          console.error('Expected char:', JSON.stringify(expectedMessage[firstDifference]));
          console.error('Received char:', JSON.stringify(message[firstDifference]));
          console.error('Context around difference:');
          console.error('Expected:', JSON.stringify(expectedMessage.substring(Math.max(0, firstDifference - 10), firstDifference + 10)));
          console.error('Received:', JSON.stringify(message.substring(Math.max(0, firstDifference - 10), firstDifference + 10)));
        }
        
        return reply.status(400).send({
          success: false,
          error: 'Invalid message format'
        });
      }

      // 验证签名
      console.log('\n--- Signature Verification ---');
      console.log('Verifying Signature with ethers.js');
      console.log('Message for verification:', JSON.stringify(message));
      console.log('Signature:', signature);
      console.log('Expected Address:', walletAddress);
      
      const isValidSignature = verifyEthereumSignature(message, signature, walletAddress);
      console.log('Signature Verification Result:', isValidSignature);
      
      if (!isValidSignature) {
        console.error('Signature Verification Failed');
        console.error('This indicates a problem with signature compatibility or message format');
        return reply.status(401).send({
          success: false,
          error: 'Invalid signature'
        });
      }

      console.log('✅ All Verifications Passed Successfully');

      // 删除已使用的nonce
      console.log('\n--- Nonce Cleanup ---');
      if (fastify.redis) {
        await fastify.redis.del(nonceKey);
        console.log('Nonce deleted from Redis:', nonceKey);
      } else {
        // Clean up from memory storage
        if (global.nonceStore && global.nonceStore.has(nonceKey)) {
          global.nonceStore.delete(nonceKey);
          console.log('Nonce deleted from memory storage:', nonceKey);
        } else {
          console.log('No nonce to delete from memory storage');
        }
      }

      // 查找或创建用户
      console.log('\n--- User Management ---');
      if (!fastify.db) {
        console.error('Database connection not available');
        throw new Error('Database connection not available');
      }
      
      console.log('Looking up user by wallet address:', walletAddress);
      let user = await fastify.db.getUserByWalletAddress(walletAddress);
      console.log('User found:', !!user);
      
      if (user) {
        console.log('Existing user:', {
          id: user.id,
          walletAddress: user.wallet_address,
          createdAt: user.created_at
        });
      }
      if (!user) {
        // 创建新用户
        const defaultPreferences = {
          theme: 'light',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            browser: true,
            slack: false,
            agentAlerts: true,
            performanceReports: true,
            securityAlerts: true,
            systemUpdates: true
          },
          dashboard: {
            layout: 'grid',
            defaultView: 'agents',
            refreshInterval: 30,
            showMetrics: true,
            compactMode: false
          },
          privacy: {
            shareUsageData: false,
            allowAnalytics: true,
            publicProfile: false,
            shareAgents: false
          }
        };

        const defaultProfile = {
          stats: {
            totalAgents: 0,
            totalWorkflows: 0,
            totalExecutions: 0,
            successRate: 0,
            joinedAt: new Date(),
            lastActive: new Date(),
            reputation: 0,
            contributions: 0
          },
          socialLinks: {}
        };

        console.log('Creating new user with default preferences and profile');
        user = await fastify.db!.createUser(walletAddress, defaultPreferences, defaultProfile);
        console.log('New user created:', {
          id: user.id,
          walletAddress: user.wallet_address,
          createdAt: user.created_at
        });
        logger.info(`Created new user: ${walletAddress}`);
      } else {
        // 更新最后登录时间
        console.log('Updating last login time for existing user');
        await fastify.db!.updateUser(user.id, { last_login_at: new Date() });
        logger.info(`User login: ${walletAddress}`);
      }

      // 生成JWT token
      console.log('\n--- JWT Token Generation ---');
      const tokenPayload = {
        userId: user.id,
        walletAddress: user.wallet_address,
        iat: Math.floor(Date.now() / 1000)
      };
      
      console.log('Token Payload:', tokenPayload);
      console.log('JWT Secret Available:', !!fastify.jwt);
      
      const token = fastify.jwt.sign(tokenPayload);
      console.log('JWT Token Generated:', {
        length: token.length,
        preview: token.substring(0, 20) + '...',
        hasThreeParts: token.split('.').length === 3
      });

      // 创建会话记录
      console.log('\n--- Session Management ---');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天后过期
      
      console.log('Creating session record:', {
        userId: user.id,
        walletAddress: user.wallet_address,
        tokenHashPreview: tokenHash.substring(0, 16) + '...',
        expiresAt: expiresAt.toISOString(),
        ipAddress: request.ip
      });

      await fastify.db.createSession({
        userId: user.id,
        walletAddress: user.wallet_address,
        tokenHash,
        expiresAt,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || ''
      });

      // 记录用户活动
      console.log('Recording user activity');
      await fastify.db.query(
        'INSERT INTO user_activities (user_id, type, description, ip_address) VALUES ($1, $2, $3, $4)',
        [user.id, 'login', 'User logged in via Web3 wallet', request.ip]
      );

      const response: AuthResponse = {
        success: true,
        token,
        user: {
          id: user.id,
          walletAddress: user.wallet_address,
          preferences: user.preferences,
          profile: user.profile,
          createdAt: user.created_at
        }
      };

      console.log('\n--- Final Response ---');
      console.log('Response Success:', response.success);
      console.log('Token Included:', !!response.token);
      console.log('User Data Included:', !!response.user);
      console.log('User ID:', response.user.id);
      console.log('Wallet Address Match:', response.user.walletAddress === walletAddress);
      
      console.log('\n=== Backend Web3 Login Verification Completed Successfully ===');
      console.log('Total Process Duration:', Date.now() - new Date().getTime(), 'ms');

      return reply.send(response);
    } catch (error) {
      console.error('\n=== Backend Web3 Login Verification Failed ===');
      console.error('Error Type:', error.constructor.name);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      console.error('Request Data:', {
        walletAddress,
        signatureLength: signature?.length,
        messageLength: message?.length,
        ip: request.ip
      });
      
      logger.error('Error during login:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // 验证token
  fastify.get('/verify', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send({ success: false, error: 'Invalid token' });
      }
    }
  }, async (request, reply) => {
    try {
      const payload = request.user as any;
      
      // 从数据库获取最新用户信息
      const user = await fastify.db.getUserByWalletAddress(payload.walletAddress);
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'User not found'
        });
      }

      return reply.send({
        success: true,
        user: {
          id: user.id,
          walletAddress: user.wallet_address,
          preferences: user.preferences,
          profile: user.profile,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      logger.error('Error verifying token:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // 登出
  fastify.post('/logout', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send({ success: false, error: 'Invalid token' });
      }
    }
  }, async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(400).send({
          success: false,
          error: 'No authorization header'
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // 停用会话
      await fastify.db.deactivateSession(tokenHash);

      // 记录用户活动
      const payload = request.user as any;
      await fastify.db.query(
        'INSERT INTO user_activities (user_id, type, description, ip_address) VALUES ($1, $2, $3, $4)',
        [payload.userId, 'logout', 'User logged out', request.ip]
      );

      logger.info(`User logged out: ${payload.walletAddress}`);

      return reply.send({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Error during logout:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // 刷新token
  fastify.post('/refresh', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send({ success: false, error: 'Invalid token' });
      }
    }
  }, async (request, reply) => {
    try {
      const payload = request.user as any;
      
      // 生成新token
      const newTokenPayload = {
        userId: payload.userId,
        walletAddress: payload.walletAddress,
        iat: Math.floor(Date.now() / 1000)
      };

      const newToken = fastify.jwt.sign(newTokenPayload);

      // 更新会话记录
      const oldAuthHeader = request.headers.authorization;
      if (oldAuthHeader) {
        const oldToken = oldAuthHeader.replace('Bearer ', '');
        const oldTokenHash = crypto.createHash('sha256').update(oldToken).digest('hex');
        await fastify.db.deactivateSession(oldTokenHash);
      }

      const newTokenHash = crypto.createHash('sha256').update(newToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await fastify.db.createSession({
        userId: payload.userId,
        walletAddress: payload.walletAddress,
        tokenHash: newTokenHash,
        expiresAt,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || ''
      });

      return reply.send({
        success: true,
        token: newToken
      });
    } catch (error) {
      logger.error('Error refreshing token:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });
};