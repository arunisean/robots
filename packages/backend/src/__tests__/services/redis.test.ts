import { RedisService } from '../../services/redis';

// Mock redis module
jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    lPush: jest.fn(),
    rPush: jest.fn(),
    lPop: jest.fn(),
    rPop: jest.fn(),
    lRange: jest.fn(),
    lLen: jest.fn(),
    sAdd: jest.fn(),
    sRem: jest.fn(),
    sMembers: jest.fn(),
    sIsMember: jest.fn(),
    hSet: jest.fn(),
    hGet: jest.fn(),
    hGetAll: jest.fn(),
    hDel: jest.fn(),
    incr: jest.fn(),
    ttl: jest.fn(),
    keys: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    duplicate: jest.fn(),
    on: jest.fn()
  })
}));

describe('RedisService', () => {
  let redisService: RedisService;
  let mockClient: any;

  beforeEach(() => {
    redisService = new RedisService();
    mockClient = (redisService as any).client;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      mockClient.connect.mockResolvedValue(undefined);

      await expect(redisService.connect()).resolves.not.toThrow();
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should throw error on connection failure', async () => {
      const error = new Error('Connection failed');
      mockClient.connect.mockRejectedValue(error);

      await expect(redisService.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('get', () => {
    it('should get value successfully', async () => {
      mockClient.get.mockResolvedValue('test-value');

      const result = await redisService.get('test-key');
      
      expect(result).toBe('test-value');
      expect(mockClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null on error', async () => {
      mockClient.get.mockRejectedValue(new Error('Get failed'));

      const result = await redisService.get('test-key');
      
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      mockClient.set.mockResolvedValue('OK');

      await redisService.set('test-key', 'test-value');
      
      expect(mockClient.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should set value with TTL', async () => {
      mockClient.setEx.mockResolvedValue('OK');

      await redisService.set('test-key', 'test-value', 300);
      
      expect(mockClient.setEx).toHaveBeenCalledWith('test-key', 300, 'test-value');
    });
  });

  describe('getJson', () => {
    it('should get and parse JSON value', async () => {
      const testObject = { name: 'test', value: 123 };
      mockClient.get.mockResolvedValue(JSON.stringify(testObject));

      const result = await redisService.getJson('test-key');
      
      expect(result).toEqual(testObject);
      expect(mockClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent key', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await redisService.getJson('test-key');
      
      expect(result).toBeNull();
    });

    it('should return null on JSON parse error', async () => {
      mockClient.get.mockResolvedValue('invalid-json');

      const result = await redisService.getJson('test-key');
      
      expect(result).toBeNull();
    });
  });

  describe('setJson', () => {
    it('should stringify and set JSON value', async () => {
      const testObject = { name: 'test', value: 123 };
      mockClient.set.mockResolvedValue('OK');

      await redisService.setJson('test-key', testObject);
      
      expect(mockClient.set).toHaveBeenCalledWith('test-key', JSON.stringify(testObject));
    });

    it('should stringify and set JSON value with TTL', async () => {
      const testObject = { name: 'test', value: 123 };
      mockClient.setEx.mockResolvedValue('OK');

      await redisService.setJson('test-key', testObject, 300);
      
      expect(mockClient.setEx).toHaveBeenCalledWith('test-key', 300, JSON.stringify(testObject));
    });
  });

  describe('cache', () => {
    it('should return cached value if exists', async () => {
      const cachedValue = { name: 'cached' };
      mockClient.get.mockResolvedValue(JSON.stringify(cachedValue));

      const fetcher = jest.fn();
      const result = await redisService.cache('test-key', fetcher);

      expect(result).toEqual(cachedValue);
      expect(fetcher).not.toHaveBeenCalled();
      expect(mockClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should fetch and cache value if not exists', async () => {
      const fetchedValue = { name: 'fetched' };
      mockClient.get.mockResolvedValue(null);
      mockClient.setEx.mockResolvedValue('OK');

      const fetcher = jest.fn().mockResolvedValue(fetchedValue);
      const result = await redisService.cache('test-key', fetcher, 300);

      expect(result).toEqual(fetchedValue);
      expect(fetcher).toHaveBeenCalled();
      expect(mockClient.setEx).toHaveBeenCalledWith('test-key', 300, JSON.stringify(fetchedValue));
    });
  });

  describe('rateLimit', () => {
    it('should allow request within limit', async () => {
      mockClient.incr.mockResolvedValue(1);
      mockClient.expire.mockResolvedValue(1);
      mockClient.ttl.mockResolvedValue(300);

      const result = await redisService.rateLimit('test-key', 10, 300);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(mockClient.incr).toHaveBeenCalledWith('test-key');
      expect(mockClient.expire).toHaveBeenCalledWith('test-key', 300);
    });

    it('should deny request over limit', async () => {
      mockClient.incr.mockResolvedValue(11);
      mockClient.ttl.mockResolvedValue(300);

      const result = await redisService.rateLimit('test-key', 10, 300);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockClient.incr.mockRejectedValue(new Error('Redis error'));

      const result = await redisService.rateLimit('test-key', 10, 300);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });
  });

  describe('acquireLock', () => {
    it('should acquire lock successfully', async () => {
      mockClient.set.mockResolvedValue('OK');

      const result = await redisService.acquireLock('test-lock', 30);

      expect(result).toBe(true);
      expect(mockClient.set).toHaveBeenCalledWith('test-lock', 'locked', {
        NX: true,
        EX: 30
      });
    });

    it('should fail to acquire existing lock', async () => {
      mockClient.set.mockResolvedValue(null);

      const result = await redisService.acquireLock('test-lock', 30);

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockClient.set.mockRejectedValue(new Error('Redis error'));

      const result = await redisService.acquireLock('test-lock', 30);

      expect(result).toBe(false);
    });
  });
});