import { Pool, PoolClient, QueryResult as PgQueryResult } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';
import { MigrationManager } from '../database/MigrationManager';
import { WorkflowRepository, ExecutionRepository } from '../database/repositories';
import {
  User,
  CreateUserData,
  Agent,
  CreateAgentData,
  Workflow,
  CreateWorkflowData,
  ExecutionRecord,
  CreateExecutionRecordData,
  ExecutionRecordFilters,
  Session,
  CreateSessionData,
  SessionWithUser
} from '../types/fastify';

export class DatabaseService {
  private pool: Pool;
  private migrationManager: MigrationManager;
  public workflows: WorkflowRepository;
  public executions: ExecutionRepository;

  constructor() {
    logger.info(`Connecting to database: ${config.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`);
    this.pool = new Pool({
      connectionString: config.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.migrationManager = new MigrationManager(this.pool);
    
    // Initialize repositories
    this.workflows = new WorkflowRepository(this.pool);
    this.executions = new ExecutionRepository(this.pool);

    // 监听连接事件
    this.pool.on('connect', () => {
      logger.debug('Database client connected');
    });

    this.pool.on('error', (err) => {
      logger.error('Database pool error:', err);
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      // 运行数据库迁移 (disabled - run manually with npm run db:migrate)
      // await this.migrationManager.runMigrations();
      
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  getMigrationManager(): MigrationManager {
    return this.migrationManager;
  }

  getPool(): Pool {
    return this.pool;
  }

  async query<T extends Record<string, any> = any>(text: string, params?: any[]): Promise<PgQueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug(`Query executed in ${duration}ms:`, text);
      return result;
    } catch (error) {
      logger.error('Database query error:', error);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }

  // 用户相关查询
  async createUser(walletAddress: string, preferences: any = {}, profile: any = {}): Promise<User> {
    const query = `
      INSERT INTO users (wallet_address, preferences, profile)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await this.query<User>(query, [walletAddress, preferences, profile]);
    return result.rows[0];
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE wallet_address = $1';
    const result = await this.query<User>(query, [walletAddress]);
    return result.rows[0] || null;
  }

  async updateUser(id: string, updates: any): Promise<any> {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE users 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.query(query, [id, ...values]);
    return result.rows[0];
  }

  // Agent相关查询
  async createAgent(agentData: any): Promise<any> {
    const query = `
      INSERT INTO agents (name, description, category, version, config, metadata, owner_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await this.query(query, [
      agentData.name,
      agentData.description,
      agentData.category,
      agentData.version,
      agentData.config,
      agentData.metadata,
      agentData.ownerId
    ]);
    return result.rows[0];
  }

  async getAgentsByOwner(ownerId: string): Promise<any[]> {
    const query = 'SELECT * FROM agents WHERE owner_id = $1 ORDER BY created_at DESC';
    const result = await this.query(query, [ownerId]);
    return result.rows;
  }

  async getAgentById(id: string): Promise<any> {
    const query = 'SELECT * FROM agents WHERE id = $1';
    const result = await this.query(query, [id]);
    return result.rows[0];
  }

  async updateAgent(id: string, updates: any): Promise<any> {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE agents 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.query(query, [id, ...values]);
    return result.rows[0];
  }

  async deleteAgent(id: string): Promise<void> {
    const query = 'DELETE FROM agents WHERE id = $1';
    await this.query(query, [id]);
  }

  // 工作流相关查询
  async createWorkflow(workflowData: any): Promise<any> {
    const query = `
      INSERT INTO workflows (name, description, version, definition, settings, metadata, owner_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await this.query(query, [
      workflowData.name,
      workflowData.description,
      workflowData.version,
      workflowData.definition,
      workflowData.settings,
      workflowData.metadata,
      workflowData.ownerId
    ]);
    return result.rows[0];
  }

  async getWorkflowsByOwner(ownerId: string): Promise<any[]> {
    const query = 'SELECT * FROM workflows WHERE owner_id = $1 ORDER BY created_at DESC';
    const result = await this.query(query, [ownerId]);
    return result.rows;
  }

  async getWorkflowById(id: string): Promise<any> {
    const query = 'SELECT * FROM workflows WHERE id = $1';
    const result = await this.query(query, [id]);
    return result.rows[0];
  }

  // 执行记录相关查询
  async createExecutionRecord(recordData: any): Promise<any> {
    const query = `
      INSERT INTO execution_records (workflow_id, agent_id, status, start_time, input_data, metrics)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await this.query(query, [
      recordData.workflowId,
      recordData.agentId,
      recordData.status,
      recordData.startTime,
      recordData.inputData,
      recordData.metrics
    ]);
    return result.rows[0];
  }

  async updateExecutionRecord(id: string, updates: any): Promise<any> {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE execution_records 
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.query(query, [id, ...values]);
    return result.rows[0];
  }

  async getExecutionRecords(filters: any = {}): Promise<any[]> {
    let query = 'SELECT * FROM execution_records';
    const conditions = [];
    const values = [];

    if (filters.agentId) {
      conditions.push(`agent_id = $${values.length + 1}`);
      values.push(filters.agentId);
    }

    if (filters.workflowId) {
      conditions.push(`workflow_id = $${values.length + 1}`);
      values.push(filters.workflowId);
    }

    if (filters.status) {
      conditions.push(`status = $${values.length + 1}`);
      values.push(filters.status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY start_time DESC';

    if (filters.limit) {
      query += ` LIMIT ${filters.limit}`;
    }

    const result = await this.query(query, values);
    return result.rows;
  }

  // 会话相关查询
  async createSession(sessionData: any): Promise<any> {
    const query = `
      INSERT INTO sessions (user_id, wallet_address, token_hash, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await this.query(query, [
      sessionData.userId,
      sessionData.walletAddress,
      sessionData.tokenHash,
      sessionData.expiresAt,
      sessionData.ipAddress,
      sessionData.userAgent
    ]);
    return result.rows[0];
  }

  async getSessionByTokenHash(tokenHash: string): Promise<any> {
    const query = `
      SELECT s.*, u.wallet_address, u.preferences, u.profile
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = $1 AND s.active = true AND s.expires_at > NOW()
    `;
    const result = await this.query(query, [tokenHash]);
    return result.rows[0];
  }

  async updateSessionActivity(tokenHash: string): Promise<void> {
    const query = 'UPDATE sessions SET last_activity = NOW() WHERE token_hash = $1';
    await this.query(query, [tokenHash]);
  }

  async deactivateSession(tokenHash: string): Promise<void> {
    const query = 'UPDATE sessions SET active = false WHERE token_hash = $1';
    await this.query(query, [tokenHash]);
  }
}