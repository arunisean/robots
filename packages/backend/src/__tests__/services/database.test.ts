import { DatabaseService } from '../../services/database';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
      release: jest.fn()
    }),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn()
  }))
}));

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  let mockPool: any;

  beforeEach(() => {
    dbService = new DatabaseService();
    mockPool = (dbService as any).pool;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn()
      };
      mockPool.connect.mockResolvedValue(mockClient);

      await expect(dbService.connect()).resolves.not.toThrow();
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error on connection failure', async () => {
      const error = new Error('Connection failed');
      mockPool.connect.mockRejectedValue(error);

      await expect(dbService.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('query', () => {
    it('should execute query successfully', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await dbService.query('SELECT * FROM test', []);
      
      expect(result).toEqual(mockResult);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test', []);
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      mockPool.query.mockRejectedValue(error);

      await expect(dbService.query('SELECT * FROM test')).rejects.toThrow('Query failed');
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        wallet_address: '0x1234567890123456789012345678901234567890',
        preferences: {},
        profile: {}
      };
      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await dbService.createUser(
        '0x1234567890123456789012345678901234567890',
        {},
        {}
      );

      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['0x1234567890123456789012345678901234567890'])
      );
    });
  });

  describe('getUserByWalletAddress', () => {
    it('should get user by wallet address', async () => {
      const mockUser = {
        id: 'user-id',
        wallet_address: '0x1234567890123456789012345678901234567890'
      };
      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await dbService.getUserByWalletAddress(
        '0x1234567890123456789012345678901234567890'
      );

      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE wallet_address = $1',
        ['0x1234567890123456789012345678901234567890']
      );
    });

    it('should return undefined if user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await dbService.getUserByWalletAddress(
        '0x1234567890123456789012345678901234567890'
      );

      expect(result).toBeUndefined();
    });
  });

  describe('createAgent', () => {
    it('should create agent successfully', async () => {
      const mockAgent = {
        id: 'agent-id',
        name: 'Test Agent',
        category: 'work',
        owner_id: 'user-id'
      };
      mockPool.query.mockResolvedValue({ rows: [mockAgent] });

      const agentData = {
        name: 'Test Agent',
        description: 'Test description',
        category: 'work',
        version: '1.0.0',
        config: {},
        metadata: {},
        ownerId: 'user-id'
      };

      const result = await dbService.createAgent(agentData);

      expect(result).toEqual(mockAgent);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO agents'),
        expect.arrayContaining([
          'Test Agent',
          'Test description',
          'work',
          '1.0.0',
          {},
          {},
          'user-id'
        ])
      );
    });
  });

  describe('transaction', () => {
    it('should execute transaction successfully', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // callback query
          .mockResolvedValueOnce(undefined), // COMMIT
        release: jest.fn()
      };
      mockPool.connect.mockResolvedValue(mockClient);

      const callback = jest.fn().mockResolvedValue({ id: 1 });
      const result = await dbService.transaction(callback);

      expect(result).toEqual({ id: 1 });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce(undefined), // ROLLBACK
        release: jest.fn()
      };
      mockPool.connect.mockResolvedValue(mockClient);

      const error = new Error('Transaction failed');
      const callback = jest.fn().mockRejectedValue(error);

      await expect(dbService.transaction(callback)).rejects.toThrow('Transaction failed');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});