import { Pool, PoolClient } from 'pg';
import {
  StrategyTemplate,
  StrategyCategory,
  StrategyDifficulty,
  CreateStrategyTemplateDto,
  UpdateStrategyTemplateDto,
  StrategyTemplateFilters
} from '@multi-agent-platform/shared';
import { Logger } from '../../utils/logger';

/**
 * Repository for strategy template data access
 */
export class StrategyTemplateRepository {
  private pool: Pool;
  private logger: Logger;

  constructor(pool: Pool) {
    this.pool = pool;
    this.logger = new Logger('StrategyTemplateRepository');
  }

  /**
   * Create a new strategy template
   */
  async create(data: CreateStrategyTemplateDto, authorId?: string): Promise<StrategyTemplate> {
    const query = `
      INSERT INTO strategy_templates (
        name,
        description,
        category,
        difficulty,
        parameters,
        workflow_definition,
        risk_profile,
        performance_metrics,
        tags,
        author_id,
        version,
        published
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      data.name,
      data.description,
      data.category,
      data.difficulty,
      JSON.stringify(data.parameters),
      JSON.stringify(data.workflowDefinition),
      JSON.stringify(data.riskProfile),
      data.performanceMetrics ? JSON.stringify(data.performanceMetrics) : null,
      data.tags || [],
      authorId || null,
      data.version || '1.0.0',
      false // Default to unpublished
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToTemplate(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to create strategy template:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async findById(id: string): Promise<StrategyTemplate | null> {
    const query = 'SELECT * FROM strategy_templates WHERE id = $1';

    try {
      const result = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTemplate(result.rows[0]);
    } catch (error) {
      this.logger.error(`Failed to find template ${id}:`, error);
      throw error;
    }
  }

  /**
   * List templates with filters
   */
  async findAll(filters?: StrategyTemplateFilters): Promise<StrategyTemplate[]> {
    let query = 'SELECT * FROM strategy_templates WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters?.category) {
      query += ` AND category = $${paramIndex}`;
      values.push(filters.category);
      paramIndex++;
    }

    if (filters?.difficulty) {
      query += ` AND difficulty = $${paramIndex}`;
      values.push(filters.difficulty);
      paramIndex++;
    }

    if (filters?.tags && filters.tags.length > 0) {
      query += ` AND tags && $${paramIndex}`;
      values.push(filters.tags);
      paramIndex++;
    }

    if (filters?.search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters?.published !== undefined) {
      query += ` AND published = $${paramIndex}`;
      values.push(filters.published);
      paramIndex++;
    }

    if (filters?.featured !== undefined) {
      query += ` AND featured = $${paramIndex}`;
      values.push(filters.featured);
      paramIndex++;
    }

    if (filters?.authorId) {
      query += ` AND author_id = $${paramIndex}`;
      values.push(filters.authorId);
      paramIndex++;
    }

    // Sorting
    const sortByMap: Record<string, string> = {
      'name': 'name',
      'usage_count': 'usage_count',
      'created_at': 'created_at',
      'updated_at': 'updated_at'
    };

    const sortByField = filters?.sortBy || 'created_at';
    const sortBy = sortByMap[sortByField] || 'created_at';
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
      return result.rows.map(row => this.mapRowToTemplate(row));
    } catch (error) {
      this.logger.error('Failed to find templates:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  async update(id: string, data: UpdateStrategyTemplateDto): Promise<StrategyTemplate> {
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

    if (data.parameters !== undefined) {
      fields.push(`parameters = $${paramIndex}`);
      values.push(JSON.stringify(data.parameters));
      paramIndex++;
    }

    if (data.workflowDefinition !== undefined) {
      fields.push(`workflow_definition = $${paramIndex}`);
      values.push(JSON.stringify(data.workflowDefinition));
      paramIndex++;
    }

    if (data.riskProfile !== undefined) {
      fields.push(`risk_profile = $${paramIndex}`);
      values.push(JSON.stringify(data.riskProfile));
      paramIndex++;
    }

    if (data.performanceMetrics !== undefined) {
      fields.push(`performance_metrics = $${paramIndex}`);
      values.push(JSON.stringify(data.performanceMetrics));
      paramIndex++;
    }

    if (data.tags !== undefined) {
      fields.push(`tags = $${paramIndex}`);
      values.push(data.tags);
      paramIndex++;
    }

    if (data.published !== undefined) {
      fields.push(`published = $${paramIndex}`);
      values.push(data.published);
      paramIndex++;
    }

    if (data.featured !== undefined) {
      fields.push(`featured = $${paramIndex}`);
      values.push(data.featured);
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE strategy_templates
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(id);

    try {
      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Template ${id} not found`);
      }

      return this.mapRowToTemplate(result.rows[0]);
    } catch (error) {
      this.logger.error(`Failed to update template ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM strategy_templates WHERE id = $1';

    try {
      const result = await this.pool.query(query, [id]);

      if (result.rowCount === 0) {
        throw new Error(`Template ${id} not found`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete template ${id}:`, error);
      throw error;
    }
  }

  /**
   * Increment usage count
   */
  async incrementUsageCount(id: string): Promise<void> {
    const query = `
      UPDATE strategy_templates
      SET usage_count = usage_count + 1
      WHERE id = $1
    `;

    try {
      await this.pool.query(query, [id]);
    } catch (error) {
      this.logger.error(`Failed to increment usage count for template ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update active users count
   */
  async updateActiveUsersCount(id: string, count: number): Promise<void> {
    const query = `
      UPDATE strategy_templates
      SET active_users = $1
      WHERE id = $2
    `;

    try {
      await this.pool.query(query, [count, id]);
    } catch (error) {
      this.logger.error(`Failed to update active users count for template ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get templates by category
   */
  async findByCategory(category: StrategyCategory, limit?: number): Promise<StrategyTemplate[]> {
    let query = 'SELECT * FROM strategy_templates WHERE category = $1 AND published = true ORDER BY usage_count DESC';
    const values: any[] = [category];

    if (limit) {
      query += ' LIMIT $2';
      values.push(limit);
    }

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map(row => this.mapRowToTemplate(row));
    } catch (error) {
      this.logger.error(`Failed to find templates by category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Get featured templates
   */
  async findFeatured(limit: number = 10): Promise<StrategyTemplate[]> {
    const query = `
      SELECT * FROM strategy_templates
      WHERE featured = true AND published = true
      ORDER BY usage_count DESC
      LIMIT $1
    `;

    try {
      const result = await this.pool.query(query, [limit]);
      return result.rows.map(row => this.mapRowToTemplate(row));
    } catch (error) {
      this.logger.error('Failed to find featured templates:', error);
      throw error;
    }
  }

  /**
   * Search templates by name or description
   */
  async search(searchTerm: string, limit: number = 20): Promise<StrategyTemplate[]> {
    const query = `
      SELECT * FROM strategy_templates
      WHERE published = true
        AND (name ILIKE $1 OR description ILIKE $1 OR $2 = ANY(tags))
      ORDER BY usage_count DESC
      LIMIT $3
    `;

    try {
      const result = await this.pool.query(query, [`%${searchTerm}%`, searchTerm, limit]);
      return result.rows.map(row => this.mapRowToTemplate(row));
    } catch (error) {
      this.logger.error('Failed to search templates:', error);
      throw error;
    }
  }

  /**
   * Get template statistics
   */
  async getStatistics(id: string): Promise<{
    usageCount: number;
    activeUsers: number;
    totalInstances: number;
    averagePerformance?: number;
  }> {
    const query = `
      SELECT 
        st.usage_count,
        st.active_users,
        COUNT(usi.id) as total_instances,
        AVG(usi.win_rate) as average_win_rate
      FROM strategy_templates st
      LEFT JOIN user_strategy_instances usi ON usi.template_id = st.id
      WHERE st.id = $1
      GROUP BY st.id, st.usage_count, st.active_users
    `;

    try {
      const result = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        throw new Error(`Template ${id} not found`);
      }

      const row = result.rows[0];
      return {
        usageCount: parseInt(row.usage_count),
        activeUsers: parseInt(row.active_users),
        totalInstances: parseInt(row.total_instances),
        averagePerformance: row.average_win_rate ? parseFloat(row.average_win_rate) : undefined
      };
    } catch (error) {
      this.logger.error(`Failed to get statistics for template ${id}:`, error);
      throw error;
    }
  }

  /**
   * Execute within transaction
   */
  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
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

  /**
   * Map database row to StrategyTemplate
   */
  private mapRowToTemplate(row: any): StrategyTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category as StrategyCategory,
      difficulty: row.difficulty as StrategyDifficulty,
      parameters: row.parameters,
      workflowDefinition: row.workflow_definition,
      riskProfile: row.risk_profile,
      performanceMetrics: row.performance_metrics || undefined,
      tags: row.tags || [],
      authorId: row.author_id || undefined,
      version: row.version,
      published: row.published,
      featured: row.featured,
      usageCount: parseInt(row.usage_count) || 0,
      activeUsers: parseInt(row.active_users) || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
