import { Pool, PoolClient } from 'pg';
import {
    UserStrategyInstance,
    StrategyInstanceStatus,
    InstantiateStrategyDto,
    UpdateStrategyInstanceDto,
    StrategyInstanceFilters
} from '@multi-agent-platform/shared';
import { Logger } from '../../utils/logger';

/**
 * Repository for user strategy instance data access
 */
export class UserStrategyInstanceRepository {
    private pool: Pool;
    private logger: Logger;

    constructor(pool: Pool) {
        this.pool = pool;
        this.logger = new Logger('UserStrategyInstanceRepository');
    }

    /**
     * Create a new strategy instance
     */
    async create(
        userId: string,
        templateId: string,
        workflowId: string,
        name: string,
        parameters: Record<string, any>,
        paperTrading: boolean = true
    ): Promise<UserStrategyInstance> {
        const query = `
      INSERT INTO user_strategy_instances (
        user_id,
        template_id,
        workflow_id,
        name,
        parameters,
        status,
        paper_trading
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

        const values = [
            userId,
            templateId,
            workflowId,
            name,
            JSON.stringify(parameters),
            'stopped', // Default status
            paperTrading
        ];

        try {
            const result = await this.pool.query(query, values);
            return this.mapRowToInstance(result.rows[0]);
        } catch (error) {
            this.logger.error('Failed to create strategy instance:', error);
            throw error;
        }
    }

    /**
     * Get instance by ID
     */
    async findById(id: string): Promise<UserStrategyInstance | null> {
        const query = 'SELECT * FROM user_strategy_instances WHERE id = $1';

        try {
            const result = await this.pool.query(query, [id]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapRowToInstance(result.rows[0]);
        } catch (error) {
            this.logger.error(`Failed to find instance ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get instances by user
     */
    async findByUser(userId: string, filters?: StrategyInstanceFilters): Promise<UserStrategyInstance[]> {
        let query = 'SELECT * FROM user_strategy_instances WHERE user_id = $1';
        const values: any[] = [userId];
        let paramIndex = 2;

        // Apply filters
        if (filters?.templateId) {
            query += ` AND template_id = $${paramIndex}`;
            values.push(filters.templateId);
            paramIndex++;
        }

        if (filters?.status) {
            query += ` AND status = $${paramIndex}`;
            values.push(filters.status);
            paramIndex++;
        }

        if (filters?.paperTrading !== undefined) {
            query += ` AND paper_trading = $${paramIndex}`;
            values.push(filters.paperTrading);
            paramIndex++;
        }

        // Sorting
        const sortByMap: Record<string, string> = {
            'created_at': 'created_at',
            'last_executed_at': 'last_executed_at',
            'total_profit_loss': 'total_profit_loss'
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
            return result.rows.map(row => this.mapRowToInstance(row));
        } catch (error) {
            this.logger.error('Failed to find instances by user:', error);
            throw error;
        }
    }

    /**
     * Get instances by template
     */
    async findByTemplate(templateId: string): Promise<UserStrategyInstance[]> {
        const query = `
      SELECT * FROM user_strategy_instances
      WHERE template_id = $1
      ORDER BY created_at DESC
    `;

        try {
            const result = await this.pool.query(query, [templateId]);
            return result.rows.map(row => this.mapRowToInstance(row));
        } catch (error) {
            this.logger.error(`Failed to find instances by template ${templateId}:`, error);
            throw error;
        }
    }

    /**
     * Update instance
     */
    async update(id: string, data: UpdateStrategyInstanceDto): Promise<UserStrategyInstance> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.name !== undefined) {
            fields.push(`name = $${paramIndex}`);
            values.push(data.name);
            paramIndex++;
        }

        if (data.parameters !== undefined) {
            fields.push(`parameters = $${paramIndex}`);
            values.push(JSON.stringify(data.parameters));
            paramIndex++;
        }

        if (data.status !== undefined) {
            fields.push(`status = $${paramIndex}`);
            values.push(data.status);
            paramIndex++;

            // Update timestamps based on status
            if (data.status === 'active') {
                fields.push(`started_at = NOW()`);
                fields.push(`stopped_at = NULL`);
            } else if (data.status === 'stopped') {
                fields.push(`stopped_at = NOW()`);
            }
        }

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        const query = `
      UPDATE user_strategy_instances
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        values.push(id);

        try {
            const result = await this.pool.query(query, values);

            if (result.rows.length === 0) {
                throw new Error(`Instance ${id} not found`);
            }

            return this.mapRowToInstance(result.rows[0]);
        } catch (error) {
            this.logger.error(`Failed to update instance ${id}:`, error);
            throw error;
        }
    }

    /**
     * Update instance status
     */
    async updateStatus(id: string, status: StrategyInstanceStatus): Promise<void> {
        let query = 'UPDATE user_strategy_instances SET status = $1';
        const values: any[] = [status];

        if (status === 'active') {
            query += ', started_at = NOW(), stopped_at = NULL';
        } else if (status === 'stopped') {
            query += ', stopped_at = NOW()';
        }

        query += ' WHERE id = $2';
        values.push(id);

        try {
            const result = await this.pool.query(query, values);

            if (result.rowCount === 0) {
                throw new Error(`Instance ${id} not found`);
            }
        } catch (error) {
            this.logger.error(`Failed to update status for instance ${id}:`, error);
            throw error;
        }
    }

    /**
     * Update performance metrics
     */
    async updatePerformanceMetrics(
        id: string,
        metrics: {
            totalTrades?: number;
            winningTrades?: number;
            losingTrades?: number;
            totalProfitLoss?: number;
            winRate?: number;
        }
    ): Promise<void> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (metrics.totalTrades !== undefined) {
            fields.push(`total_trades = $${paramIndex}`);
            values.push(metrics.totalTrades);
            paramIndex++;
        }

        if (metrics.winningTrades !== undefined) {
            fields.push(`winning_trades = $${paramIndex}`);
            values.push(metrics.winningTrades);
            paramIndex++;
        }

        if (metrics.losingTrades !== undefined) {
            fields.push(`losing_trades = $${paramIndex}`);
            values.push(metrics.losingTrades);
            paramIndex++;
        }

        if (metrics.totalProfitLoss !== undefined) {
            fields.push(`total_profit_loss = $${paramIndex}`);
            values.push(metrics.totalProfitLoss);
            paramIndex++;
        }

        if (metrics.winRate !== undefined) {
            fields.push(`win_rate = $${paramIndex}`);
            values.push(metrics.winRate);
            paramIndex++;
        }

        if (fields.length === 0) {
            return;
        }

        fields.push(`last_executed_at = NOW()`);

        const query = `
      UPDATE user_strategy_instances
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
    `;
        values.push(id);

        try {
            await this.pool.query(query, values);
        } catch (error) {
            this.logger.error(`Failed to update performance metrics for instance ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete instance
     */
    async delete(id: string): Promise<void> {
        const query = 'DELETE FROM user_strategy_instances WHERE id = $1';

        try {
            const result = await this.pool.query(query, [id]);

            if (result.rowCount === 0) {
                throw new Error(`Instance ${id} not found`);
            }
        } catch (error) {
            this.logger.error(`Failed to delete instance ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get active instances count by template
     */
    async getActiveCountByTemplate(templateId: string): Promise<number> {
        const query = `
      SELECT COUNT(*) as count
      FROM user_strategy_instances
      WHERE template_id = $1 AND status = 'active'
    `;

        try {
            const result = await this.pool.query(query, [templateId]);
            return parseInt(result.rows[0].count);
        } catch (error) {
            this.logger.error(`Failed to get active count for template ${templateId}:`, error);
            throw error;
        }
    }

    /**
     * Get user's active instances
     */
    async getActiveByUser(userId: string): Promise<UserStrategyInstance[]> {
        const query = `
      SELECT * FROM user_strategy_instances
      WHERE user_id = $1 AND status = 'active'
      ORDER BY started_at DESC
    `;

        try {
            const result = await this.pool.query(query, [userId]);
            return result.rows.map(row => this.mapRowToInstance(row));
        } catch (error) {
            this.logger.error(`Failed to get active instances for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get instance performance summary
     */
    async getPerformanceSummary(id: string): Promise<{
        totalTrades: number;
        winRate: number;
        totalProfitLoss: number;
        averageProfitPerTrade: number;
        runtime: number; // in seconds
    }> {
        const query = `
      SELECT 
        total_trades,
        win_rate,
        total_profit_loss,
        CASE WHEN total_trades > 0 THEN total_profit_loss / total_trades ELSE 0 END as avg_profit,
        EXTRACT(EPOCH FROM (COALESCE(stopped_at, NOW()) - started_at)) as runtime
      FROM user_strategy_instances
      WHERE id = $1
    `;

        try {
            const result = await this.pool.query(query, [id]);

            if (result.rows.length === 0) {
                throw new Error(`Instance ${id} not found`);
            }

            const row = result.rows[0];
            return {
                totalTrades: parseInt(row.total_trades) || 0,
                winRate: parseFloat(row.win_rate) || 0,
                totalProfitLoss: parseFloat(row.total_profit_loss) || 0,
                averageProfitPerTrade: parseFloat(row.avg_profit) || 0,
                runtime: parseFloat(row.runtime) || 0
            };
        } catch (error) {
            this.logger.error(`Failed to get performance summary for instance ${id}:`, error);
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
     * Map database row to UserStrategyInstance
     */
    private mapRowToInstance(row: any): UserStrategyInstance {
        return {
            id: row.id,
            userId: row.user_id,
            templateId: row.template_id,
            workflowId: row.workflow_id,
            name: row.name,
            parameters: row.parameters,
            status: row.status as StrategyInstanceStatus,
            paperTrading: row.paper_trading,
            totalTrades: parseInt(row.total_trades) || 0,
            winningTrades: parseInt(row.winning_trades) || 0,
            losingTrades: parseInt(row.losing_trades) || 0,
            totalProfitLoss: parseFloat(row.total_profit_loss) || 0,
            winRate: parseFloat(row.win_rate) || 0,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            lastExecutedAt: row.last_executed_at ? new Date(row.last_executed_at) : undefined,
            startedAt: row.started_at ? new Date(row.started_at) : undefined,
            stoppedAt: row.stopped_at ? new Date(row.stopped_at) : undefined
        };
    }
}
