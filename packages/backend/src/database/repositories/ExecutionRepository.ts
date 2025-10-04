import { Pool, PoolClient } from 'pg';
import {
  WorkflowExecution,
  WorkflowExecutionStatus,
  WorkflowTriggerType,
  AgentExecutionResult,
  AgentExecutionStatus,
  ExecutionEvent,
  ExecutionEventType,
  ExecutionFilters,
  ExecutionSummary
} from '@multi-agent-platform/shared';
import { Logger } from '../../utils/logger';

/**
 * Repository for workflow execution data access
 */
export class ExecutionRepository {
  private pool: Pool;
  private logger: Logger;

  constructor(pool: Pool) {
    this.pool = pool;
    this.logger = new Logger('ExecutionRepository');
  }

  /**
   * Create a new workflow execution
   */
  async createExecution(data: {
    workflowId: string;
    triggeredBy?: string;
    triggerType: WorkflowTriggerType;
    inputData?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<WorkflowExecution> {
    const query = `
      INSERT INTO workflow_executions (
        workflow_id,
        status,
        triggered_by,
        trigger_type,
        input_data,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      data.workflowId,
      'pending',
      data.triggeredBy || null,
      data.triggerType,
      JSON.stringify(data.inputData || {}),
      JSON.stringify(data.metadata || {})
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToExecution(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to create execution:', error);
      throw error;
    }
  }

  /**
   * Get execution by ID
   */
  async findById(id: string): Promise<WorkflowExecution | null> {
    const query = 'SELECT * FROM workflow_executions WHERE id = $1';
    
    try {
      const result = await this.pool.query(query, [id]);
      return result.rows[0] ? this.mapRowToExecution(result.rows[0]) : null;
    } catch (error) {
      this.logger.error(`Failed to find execution ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get executions by workflow ID
   */
  async findByWorkflowId(workflowId: string, filters?: ExecutionFilters): Promise<WorkflowExecution[]> {
    let query = 'SELECT * FROM workflow_executions WHERE workflow_id = $1';
    const values: any[] = [workflowId];
    let paramIndex = 2;

    // Apply filters
    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    if (filters?.triggeredBy) {
      query += ` AND triggered_by = $${paramIndex}`;
      values.push(filters.triggeredBy);
      paramIndex++;
    }

    if (filters?.triggerType) {
      query += ` AND trigger_type = $${paramIndex}`;
      values.push(filters.triggerType);
      paramIndex++;
    }

    if (filters?.startDate) {
      query += ` AND start_time >= $${paramIndex}`;
      values.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      query += ` AND start_time <= $${paramIndex}`;
      values.push(filters.endDate);
      paramIndex++;
    }

    // Order by start time descending
    query += ' ORDER BY start_time DESC';

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
      return result.rows.map(row => this.mapRowToExecution(row));
    } catch (error) {
      this.logger.error('Failed to find executions by workflow:', error);
      throw error;
    }
  }

  /**
   * Update execution status
   */
  async updateStatus(
    id: string, 
    status: WorkflowExecutionStatus, 
    error?: string
  ): Promise<WorkflowExecution> {
    const query = `
      UPDATE workflow_executions 
      SET status = $1, 
          end_time = CASE WHEN $1 IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE end_time END,
          error = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [status, error || null, id]);
      if (result.rows.length === 0) {
        throw new Error(`Execution ${id} not found`);
      }
      return this.mapRowToExecution(result.rows[0]);
    } catch (error) {
      this.logger.error(`Failed to update execution status ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create agent execution result
   */
  async createAgentResult(data: {
    executionId: string;
    agentId: string;
    agentType: string;
    agentCategory: string;
    status: AgentExecutionStatus;
    orderIndex: number;
    inputData: any;
    outputData: any;
    startTime: Date;
    endTime: Date;
    error?: string;
    metrics?: Record<string, any>;
  }): Promise<AgentExecutionResult> {
    const query = `
      INSERT INTO agent_execution_results (
        execution_id,
        agent_id,
        agent_type,
        agent_category,
        status,
        order_index,
        input_data,
        output_data,
        start_time,
        end_time,
        error,
        metrics
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      data.executionId,
      data.agentId,
      data.agentType,
      data.agentCategory,
      data.status,
      data.orderIndex,
      JSON.stringify(data.inputData),
      JSON.stringify(data.outputData),
      data.startTime,
      data.endTime,
      data.error || null,
      JSON.stringify(data.metrics || {})
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToAgentResult(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to create agent result:', error);
      throw error;
    }
  }

  /**
   * Get agent results by execution ID
   */
  async findAgentResultsByExecutionId(executionId: string): Promise<AgentExecutionResult[]> {
    const query = `
      SELECT * FROM agent_execution_results 
      WHERE execution_id = $1 
      ORDER BY order_index ASC
    `;
    
    try {
      const result = await this.pool.query(query, [executionId]);
      return result.rows.map(row => this.mapRowToAgentResult(row));
    } catch (error) {
      this.logger.error('Failed to find agent results:', error);
      throw error;
    }
  }

  /**
   * Create execution event
   */
  async createEvent(data: {
    executionId: string;
    eventType: ExecutionEventType;
    agentId?: string;
    data: Record<string, any>;
  }): Promise<ExecutionEvent> {
    const query = `
      INSERT INTO execution_events (
        execution_id,
        event_type,
        agent_id,
        data
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      data.executionId,
      data.eventType,
      data.agentId || null,
      JSON.stringify(data.data)
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToEvent(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to create execution event:', error);
      throw error;
    }
  }

  /**
   * Get events by execution ID
   */
  async findEventsByExecutionId(executionId: string): Promise<ExecutionEvent[]> {
    const query = `
      SELECT * FROM execution_events 
      WHERE execution_id = $1 
      ORDER BY timestamp ASC
    `;
    
    try {
      const result = await this.pool.query(query, [executionId]);
      return result.rows.map(row => this.mapRowToEvent(row));
    } catch (error) {
      this.logger.error('Failed to find execution events:', error);
      throw error;
    }
  }

  /**
   * Get execution summary
   */
  async getExecutionSummary(executionId: string): Promise<ExecutionSummary> {
    const query = `
      SELECT 
        we.id as execution_id,
        we.workflow_id,
        w.name as workflow_name,
        we.status,
        we.start_time,
        we.end_time,
        we.duration,
        we.error,
        COUNT(aer.id) as agents_executed,
        COUNT(CASE WHEN aer.status = 'success' THEN 1 END) as agents_succeeded,
        COUNT(CASE WHEN aer.status = 'failed' THEN 1 END) as agents_failed,
        COALESCE(SUM(
          CASE 
            WHEN jsonb_typeof(aer.output_data->'itemsProcessed') = 'number' 
            THEN (aer.output_data->>'itemsProcessed')::integer
            WHEN jsonb_typeof(aer.output_data->'itemsCollected') = 'number'
            THEN (aer.output_data->>'itemsCollected')::integer
            ELSE 0
          END
        ), 0) as total_data_processed
      FROM workflow_executions we
      JOIN workflows w ON we.workflow_id = w.id
      LEFT JOIN agent_execution_results aer ON we.id = aer.execution_id
      WHERE we.id = $1
      GROUP BY we.id, w.name
    `;

    try {
      const result = await this.pool.query(query, [executionId]);
      if (result.rows.length === 0) {
        throw new Error(`Execution ${executionId} not found`);
      }

      const row = result.rows[0];
      return {
        executionId: row.execution_id,
        workflowId: row.workflow_id,
        workflowName: row.workflow_name,
        status: row.status,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration,
        agentsExecuted: parseInt(row.agents_executed),
        agentsSucceeded: parseInt(row.agents_succeeded),
        agentsFailed: parseInt(row.agents_failed),
        totalDataProcessed: parseInt(row.total_data_processed),
        error: row.error
      };
    } catch (error) {
      this.logger.error('Failed to get execution summary:', error);
      throw error;
    }
  }

  /**
   * Get running executions
   */
  async findRunning(): Promise<WorkflowExecution[]> {
    const query = `
      SELECT * FROM workflow_executions 
      WHERE status = 'running' 
      ORDER BY start_time ASC
    `;
    
    try {
      const result = await this.pool.query(query);
      return result.rows.map(row => this.mapRowToExecution(row));
    } catch (error) {
      this.logger.error('Failed to find running executions:', error);
      throw error;
    }
  }

  /**
   * Count executions by workflow
   */
  async countByWorkflowId(workflowId: string, filters?: ExecutionFilters): Promise<number> {
    let query = 'SELECT COUNT(*) FROM workflow_executions WHERE workflow_id = $1';
    const values: any[] = [workflowId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    try {
      const result = await this.pool.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.logger.error('Failed to count executions:', error);
      throw error;
    }
  }

  /**
   * Delete old executions (cleanup)
   */
  async deleteOldExecutions(daysToKeep: number = 30): Promise<number> {
    const query = `
      DELETE FROM workflow_executions 
      WHERE start_time < NOW() - INTERVAL '${daysToKeep} days'
      AND status IN ('completed', 'failed', 'cancelled')
    `;
    
    try {
      const result = await this.pool.query(query);
      return result.rowCount || 0;
    } catch (error) {
      this.logger.error('Failed to delete old executions:', error);
      throw error;
    }
  }

  /**
   * Map database row to WorkflowExecution object
   */
  private mapRowToExecution(row: any): WorkflowExecution {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      status: row.status as WorkflowExecutionStatus,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      triggeredBy: row.triggered_by,
      triggerType: row.trigger_type as WorkflowTriggerType,
      inputData: typeof row.input_data === 'string' 
        ? JSON.parse(row.input_data) 
        : row.input_data,
      error: row.error,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata
    };
  }

  /**
   * Map database row to AgentExecutionResult object
   */
  private mapRowToAgentResult(row: any): AgentExecutionResult {
    return {
      id: row.id,
      executionId: row.execution_id,
      agentId: row.agent_id,
      agentType: row.agent_type,
      agentCategory: row.agent_category,
      status: row.status as AgentExecutionStatus,
      orderIndex: row.order_index,
      inputData: typeof row.input_data === 'string'
        ? JSON.parse(row.input_data)
        : row.input_data,
      outputData: typeof row.output_data === 'string'
        ? JSON.parse(row.output_data)
        : row.output_data,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      error: row.error,
      metrics: typeof row.metrics === 'string'
        ? JSON.parse(row.metrics)
        : row.metrics
    };
  }

  /**
   * Map database row to ExecutionEvent object
   */
  private mapRowToEvent(row: any): ExecutionEvent {
    return {
      id: row.id,
      executionId: row.execution_id,
      eventType: row.event_type as ExecutionEventType,
      agentId: row.agent_id,
      data: typeof row.data === 'string'
        ? JSON.parse(row.data)
        : row.data,
      timestamp: row.timestamp
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
