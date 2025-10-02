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
      await fastify.redis.set(nonceKey, nonce, 300);

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

    // 验证必需参数
    if (!walletAddress || !signature || !message) {
      return reply.status(400).send({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // 验证钱包地址格式
    if (!isValidEthereumAddress(walletAddress)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid wallet address'
      });
    }

    try {
      // 从Redis获取nonce
      const nonceKey = `nonce:${walletAddress}`;
      const storedNonce = await fastify.redis.get(nonceKey);

      if (!storedNonce) {
        return reply.status(400).send({
          success: false,
          error: 'Nonce not found or expired'
        });
      }

      // 验证消息格式
      const expectedMessage = createSignMessage(walletAddress, storedNonce);
      if (message !== expectedMessage) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid message format'
        });
      }

      // 验证签名
      const isValidSignature = verifyEthereumSignature(message, signature, walletAddress);
      if (!isValidSignature) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid signature'
        });
      }

      // 删除已使用的nonce
      await fastify.redis.del(nonceKey);

      // 查找或创建用户
      let user = await fastify.db.getUserByWalletAddress(walletAddress);
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

        user = await fastify.db.createUser(walletAddress, defaultPreferences, defaultProfile);
        logger.info(`Created new user: ${walletAddress}`);
      } else {
        // 更新最后登录时间
        await fastify.db.updateUser(user.id, { last_login_at: new Date() });
        logger.info(`User login: ${walletAddress}`);
      }

      // 生成JWT token
      const tokenPayload = {
        userId: user.id,
        walletAddress: user.wallet_address,
        iat: Math.floor(Date.now() / 1000)
      };

      const token = fastify.jwt.sign(tokenPayload);

      // 创建会话记录
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天后过期

      await fastify.db.createSession({
        userId: user.id,
        walletAddress: user.wallet_address,
        tokenHash,
        expiresAt,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || ''
      });

      // 记录用户活动
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

      return reply.send(response);
    } catch (error) {
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