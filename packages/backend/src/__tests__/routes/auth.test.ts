import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { authRoutes } from '../../routes/auth';
import { DatabaseService } from '../../services/database';
import { RedisService } from '../../services/redis';

// Mock services
jest.mock('../../services/database');
jest.mock('../../services/redis');
jest.mock('@multi-agent-platform/shared', () => ({
  generateNonce: jest.fn(() => 'test-nonce'),
  createSignMessage: jest.fn((walletAddress, nonce) => `Please sign this message to authenticate: ${nonce}`),
  verifyEthereumSignature: jest.fn(() => true),
  isValidEthereumAddress: jest.fn(() => true)
}));

describe('Auth Routes', () => {
  let app: any;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockRedis: jest.Mocked<RedisService>;

  beforeEach(async () => {
    app = Fastify();
    
    // Mock services
    mockDb = new DatabaseService() as jest.Mocked<DatabaseService>;
    mockRedis = new RedisService() as jest.Mocked<RedisService>;
    
    // Register JWT plugin
    await app.register(jwt, { secret: 'test-secret' });
    
    // Decorate with mock services
    app.decorate('db', mockDb);
    app.decorate('redis', mockRedis);
    
    // Register auth routes
    await app.register(authRoutes, { prefix: '/auth' });
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /auth/nonce', () => {
    it('should generate nonce successfully', async () => {
      mockRedis.set.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/nonce',
        payload: {
          walletAddress: '0x1234567890123456789012345678901234567890'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.nonce).toBe('test-nonce');
      expect(body.message).toBe('Please sign this message to authenticate: test-nonce');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'nonce:0x1234567890123456789012345678901234567890',
        'test-nonce',
        300
      );
    });

    it('should return error for invalid wallet address', async () => {
      const { isValidEthereumAddress } = require('@multi-agent-platform/shared');
      isValidEthereumAddress.mockReturnValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/nonce',
        payload: {
          walletAddress: 'invalid-address'
        }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid wallet address');
    });

    it('should return error for missing wallet address', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/nonce',
        payload: {}
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid wallet address');
    });
  });

  describe('POST /auth/login', () => {
    const validPayload = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      signature: 'valid-signature',
      message: 'Please sign this message to authenticate: test-nonce'
    };

    it('should login successfully for existing user', async () => {
      const { isValidEthereumAddress, verifyEthereumSignature } = require('@multi-agent-platform/shared');
      isValidEthereumAddress.mockReturnValue(true);
      verifyEthereumSignature.mockReturnValue(true);
      
      const mockUser = {
        id: 'user-id',
        wallet_address: '0x1234567890123456789012345678901234567890',
        preferences: {},
        profile: {},
        created_at: new Date()
      };

      mockRedis.get.mockResolvedValue('test-nonce');
      mockRedis.del.mockResolvedValue(undefined);
      mockDb.getUserByWalletAddress.mockResolvedValue(mockUser);
      mockDb.updateUser.mockResolvedValue(mockUser);
      mockDb.createSession.mockResolvedValue({});
      mockDb.query.mockResolvedValue({});

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: validPayload
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.token).toBeDefined();
      expect(body.user).toEqual({
        id: mockUser.id,
        walletAddress: mockUser.wallet_address,
        preferences: mockUser.preferences,
        profile: mockUser.profile,
        createdAt: mockUser.created_at.toISOString()
      });
    });

    it('should create new user and login', async () => {
      const { isValidEthereumAddress, verifyEthereumSignature } = require('@multi-agent-platform/shared');
      isValidEthereumAddress.mockReturnValue(true);
      verifyEthereumSignature.mockReturnValue(true);
      
      const mockUser = {
        id: 'new-user-id',
        wallet_address: '0x1234567890123456789012345678901234567890',
        preferences: {},
        profile: {},
        created_at: new Date()
      };

      mockRedis.get.mockResolvedValue('test-nonce');
      mockRedis.del.mockResolvedValue(undefined);
      mockDb.getUserByWalletAddress.mockResolvedValue(null);
      mockDb.createUser.mockResolvedValue(mockUser);
      mockDb.createSession.mockResolvedValue({});
      mockDb.query.mockResolvedValue({});

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: validPayload
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.token).toBeDefined();
      expect(mockDb.createUser).toHaveBeenCalled();
    });

    it('should return error for missing nonce', async () => {
      const { isValidEthereumAddress } = require('@multi-agent-platform/shared');
      isValidEthereumAddress.mockReturnValue(true); // Ensure address validation passes
      mockRedis.get.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: validPayload
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Nonce not found or expired');
    });

    it('should return error for invalid signature', async () => {
      const { verifyEthereumSignature, isValidEthereumAddress } = require('@multi-agent-platform/shared');
      isValidEthereumAddress.mockReturnValue(true); // Ensure address validation passes
      verifyEthereumSignature.mockReturnValue(false);
      mockRedis.get.mockResolvedValue('test-nonce');

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: validPayload
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid signature');
    });

    it('should return error for missing parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          walletAddress: '0x1234567890123456789012345678901234567890'
          // missing signature and message
        }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Missing required parameters');
    });
  });

  describe('GET /auth/verify', () => {
    it('should verify valid token', async () => {
      const mockUser = {
        id: 'user-id',
        wallet_address: '0x1234567890123456789012345678901234567890',
        preferences: {},
        profile: {},
        created_at: new Date()
      };

      mockDb.getUserByWalletAddress.mockResolvedValue(mockUser);

      // Create a valid token
      const token = app.jwt.sign({
        userId: 'user-id',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });

      const response = await app.inject({
        method: 'GET',
        url: '/auth/verify',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user).toBeDefined();
    });

    it('should return error for invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/verify',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid token');
    });

    it('should return error for missing token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/verify'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid token');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      mockDb.deactivateSession.mockResolvedValue(undefined);
      mockDb.query.mockResolvedValue({});

      const token = app.jwt.sign({
        userId: 'user-id',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Logged out successfully');
      expect(mockDb.deactivateSession).toHaveBeenCalled();
    });

    it('should return error for missing authorization header', async () => {
      const token = app.jwt.sign({
        userId: 'user-id',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout'
        // missing authorization header
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid token');
    });
  });
});