import { Pool, PoolClient } from 'pg';
import {
  Workflow,
  WorkflowStatus,
  WorkflowDefinition,
  WorkflowSettings,
  WorkflowMetadata,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowFilters
} from '@multi-agent-platform/shared';
import { Logger } from '../../utils/logger';

/**
 * Repository for workflow data access
 */
export class WorkflowRepository {
  private pool: Pool;
  private logger: Logger;

  constructor(pool: Pool) {
    this.pool = pool;
    this.logger = new Logger('WorkflowRepository');
  }

  /**
   * Create a new workflow
   */
  async create(data: CreateWorkflowDto, ownerId: string): Promise<Workflow> {
    const query = `
      INSERT INTO workflows (
        name, 
        description, 
        version, 
        definition, 
        settings, 
        metadata, 
        owner_id,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const defaultSettings: WorkflowSettings = {
      maxConcurrentExecutions: 1,
      executionTimeout: 1800,
      retryPolicy: {
        enabled: true,
        maxRetries: 3,
        backoffStrategy: 'exponential',
        backoffMs: 1000
      },
      errorHandling: {
        strategy: 'stop',
        notifyOnError: true
      },
      logging: {
        level: 'info',
        retention: 30,
        includeData: false
      }
    };

    const defaultMetadata: WorkflowMetadata = {
      tags: [],
      category: 'general',
      ...data.metadata
    };

    const values = [
      data.name,
      data.description || '',
      data.version || '1.0.0',
      JSON.stringify(data.definition),
      JSON.stringify({ ...defaultSettings, ...data.settings }),
      JSON.stringify(defaultMetadata),
      ownerId,
      'draft'
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToWorkflow(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to create workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow by ID
   */
  async findById(id: string): Promise<Workflow | null> {
    const query = 'SELECT * FROM workflows WHERE id = $1';
    
    try {
      const result = await this.pool.query(query, [id]);
      return result.rows[0] ? this.mapRowToWorkflow(result.rows[0]) : null;
    } catch (error) {
      this.logger.error(`Failed to find workflow ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get workflows by owner
   */
  async findByOwner(ownerId: string, filters?: WorkflowFilters): Promise<Workflow[]> {
    let query = 'SELECT * FROM workflows WHERE owner_id = $1';
    const values: any[] = [ownerId];
    let paramIndex = 2;

    // Apply filters
    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    if (filters?.category) {
      query += ` AND metadata->>'category' = $${paramIndex}`;
      values.push(filters.category);
      paramIndex++;
    }

    if (filters?.tags && filters.tags.length > 0) {
      query += ` AND metadata->'tags' ?| $${paramIndex}`;
      values.push(filters.tags);
      paramIndex++;
    }

    if (filters?.search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Sorting
    const sortBy = filters?.sortBy || 'created_at';
    const sortOrder = filters?.sortOrder || 'desc';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Pagination
    if (filters?.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(filters.limit);
      paramIndex++;
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(filters.offset);
      paramIndex++;
    }

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map(row => this.mapRowToWorkflow(row));
    } catch (error) {
      this.logger.error('Failed to find workflows by owner:', error);
      throw error;
    }
  }

  /**
   * Update workflow
   */
  async update(id: string, data: UpdateWorkflowDto): Promise<Workflow> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex}`);
      values.push(data.name);
      paramIndex++;
    }

    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(data.description);
      paramIndex++;
    }

    if (data.version !== undefined) {
      fields.push(`version = $${paramIndex}`);
      values.push(data.version);
      paramIndex++;
    }

    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      values.push(data.status);
      paramIndex++;
    }

    if (data.definition !== undefined) {
      fields.push(`definition = $${paramIndex}`);
      values.push(JSON.stringify(data.definition));
      paramIndex++;
    }

    if (data.settings !== undefined) {
      fields.push(`settings = $${paramIndex}`);
      values.push(JSON.stringify(data.settings));
      paramIndex++;
    }

    if (data.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex}`);
      values.push(JSON.stringify(data.metadata));
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE workflows 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error(`Workflow ${id} not found`);
      }
      return this.mapRowToWorkflow(result.rows[0]);
    } catch (error) {
      this.logger.error(`Failed to update workflow ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete workflow
   */
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM workflows WHERE id = $1';
    
    try {
      const result = await this.pool.query(query, [id]);
      if (result.rowCount === 0) {
        throw new Error(`Workflow ${id} not found`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete workflow ${id}:`, error);
      throw error;
    }
  }

  /**
   * Check if workflow exists
   */
  async exists(id: string): Promise<boolean> {
    const query = 'SELECT EXISTS(SELECT 1 FROM workflows WHERE id = $1)';
    
    try {
      const result = await this.pool.query(query, [id]);
      return result.rows[0].exists;
    } catch (error) {
      this.logger.error(`Failed to check workflow existence ${id}:`, error);
      throw error;
    }
  }

  /**
   * Check if user owns workflow
   */
  async isOwner(workflowId: string, userId: string): Promise<boolean> {
    const query = 'SELECT EXISTS(SELECT 1 FROM workflows WHERE id = $1 AND owner_id = $2)';
    
    try {
      const result = await this.pool.query(query, [workflowId, userId]);
      return result.rows[0].exists;
    } catch (error) {
      this.logger.error('Failed to check workflow ownership:', error);
      throw error;
    }
  }

  /**
   * Get workflow statistics
   */
  async getStats(workflowId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    avgExecutionTime: number;
    lastExecuted?: Date;
  }> {
    const query = `
      SELECT 
        execution_count as total_executions,
        success_count as successful_executions,
        failure_count as failed_executions,
        avg_execution_time,
        last_executed_at
      FROM workflows
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [workflowId]);
      if (result.rows.length === 0) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      const row = result.rows[0];
      return {
        totalExecutions: parseInt(row.total_executions) || 0,
        successfulExecutions: parseInt(row.successful_executions) || 0,
        failedExecutions: parseInt(row.failed_executions) || 0,
        avgExecutionTime: parseInt(row.avg_execution_time) || 0,
        lastExecuted: row.last_executed_at
      };
    } catch (error) {
      this.logger.error(`Failed to get workflow stats ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Count workflows by owner
   */
  async countByOwner(ownerId: string, filters?: WorkflowFilters): Promise<number> {
    let query = 'SELECT COUNT(*) FROM workflows WHERE owner_id = $1';
    const values: any[] = [ownerId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    if (filters?.category) {
      query += ` AND metadata->>'category' = $${paramIndex}`;
      values.push(filters.category);
      paramIndex++;
    }

    try {
      const result = await this.pool.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.logger.error('Failed to count workflows:', error);
      throw error;
    }
  }

  /**
   * Get active workflows
   */
  async findActive(): Promise<Workflow[]> {
    const query = 'SELECT * FROM workflows WHERE status = $1 ORDER BY created_at DESC';
    
    try {
      const result = await this.pool.query(query, ['active']);
      return result.rows.map(row => this.mapRowToWorkflow(row));
    } catch (error) {
      this.logger.error('Failed to find active workflows:', error);
      throw error;
    }
  }

  /**
   * Map database row to Workflow object
   */
  private mapRowToWorkflow(row: any): Workflow {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      version: row.version,
      status: row.status as WorkflowStatus,
      definition: typeof row.definition === 'string' 
        ? JSON.parse(row.definition) 
        : row.definition,
      settings: typeof row.settings === 'string'
        ? JSON.parse(row.settings)
        : row.settings,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata,
      ownerId: row.owner_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastExecutedAt: row.last_executed_at,
      executionCount: row.execution_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      avgExecutionTime: row.avg_execution_time
    };
  }

  /**
   * Begin transaction
   */
  async beginTransaction(): Promise<PoolClient> {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  /**
   * Commit transaction
   */
  async commitTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }
}
