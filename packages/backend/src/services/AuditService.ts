import { Pool } from 'pg';
import { logger } from '../utils/logger';

/**
 * Audit action types
 */
export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'share' | 'unshare';

/**
 * Audit resource types
 */
export type AuditResourceType = 'workflow' | 'execution' | 'agent' | 'user' | 'template';

/**
 * Audit log entry for creation
 */
export interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit log with full information
 */
export interface AuditLog extends AuditLogEntry {
  id: string;
  createdAt: Date;
  user?: {
    id: string;
    walletAddress: string;
    role: string;
  };
}

/**
 * Audit log filters
 */
export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  resourceType?: AuditResourceType;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Query options
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * Action statistics
 */
export interface ActionStats {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByResource: Record<string, number>;
  uniqueUsers: number;
  dateRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Audit Service
 * Handles audit logging and querying
 */
export class AuditService {
  constructor(private db: Pool) {}

  /**
   * Log an action
   */
  async logAction(entry: AuditLogEntry): Promise<string> {
    try {
      const result = await this.db.query(
        `INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, 
          details, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          entry.userId,
          entry.action,
          entry.resourceType,
          entry.resourceId,
          JSON.stringify(entry.details || {}),
          entry.ipAddress,
          entry.userAgent
        ]
      );

      const logId = result.rows[0].id;
      
      logger.info('Audit log created', {
        logId,
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId
      });

      return logId;
    } catch (error) {
      logger.error('Error logging action:', error);
      throw error;
    }
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLog[]> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Build WHERE clause
      if (filters.userId) {
        conditions.push(`al.user_id = $${paramIndex++}`);
        params.push(filters.userId);
      }

      if (filters.action) {
        conditions.push(`al.action = $${paramIndex++}`);
        params.push(filters.action);
      }

      if (filters.resourceType) {
        conditions.push(`al.resource_type = $${paramIndex++}`);
        params.push(filters.resourceType);
      }

      if (filters.resourceId) {
        conditions.push(`al.resource_id = $${paramIndex++}`);
        params.push(filters.resourceId);
      }

      if (filters.startDate) {
        conditions.push(`al.created_at >= $${paramIndex++}`);
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push(`al.created_at <= $${paramIndex++}`);
        params.push(filters.endDate);
      }

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      // Add pagination
      const limit = filters.limit || 100;
      const offset = filters.offset || 0;

      const query = `
        SELECT 
          al.id,
          al.user_id,
          al.action,
          al.resource_type,
          al.resource_id,
          al.details,
          al.ip_address,
          al.user_agent,
          al.created_at,
          u.wallet_address,
          u.role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      params.push(limit, offset);

      const result = await this.db.query(query, params);

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        details: row.details,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
        user: row.wallet_address ? {
          id: row.user_id,
          walletAddress: row.wallet_address,
          role: row.role
        } : undefined
      }));
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      throw error;
    }
  }

  /**
   * Get user actions
   */
  async getUserActions(userId: string, options: QueryOptions = {}): Promise<AuditLog[]> {
    return this.getAuditLogs({
      userId,
      limit: options.limit,
      offset: options.offset
    });
  }

  /**
   * Get resource history
   */
  async getResourceHistory(
    resourceType: AuditResourceType,
    resourceId: string
  ): Promise<AuditLog[]> {
    return this.getAuditLogs({
      resourceType,
      resourceId
    });
  }

  /**
   * Get action statistics
   */
  async getActionStats(filters: AuditLogFilters = {}): Promise<ActionStats> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Build WHERE clause
      if (filters.userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        params.push(filters.userId);
      }

      if (filters.resourceType) {
        conditions.push(`resource_type = $${paramIndex++}`);
        params.push(filters.resourceType);
      }

      if (filters.startDate) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(filters.endDate);
      }

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      // Get statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_actions,
          COUNT(DISTINCT user_id) as unique_users,
          MIN(created_at) as start_date,
          MAX(created_at) as end_date,
          json_object_agg(action, action_count) as actions_by_type,
          json_object_agg(resource_type, resource_count) as actions_by_resource
        FROM (
          SELECT 
            user_id,
            created_at,
            action,
            COUNT(*) OVER (PARTITION BY action) as action_count,
            resource_type,
            COUNT(*) OVER (PARTITION BY resource_type) as resource_count
          FROM audit_logs
          ${whereClause}
        ) subquery
      `;

      const result = await this.db.query(statsQuery, params);
      const row = result.rows[0];

      return {
        totalActions: parseInt(row.total_actions) || 0,
        actionsByType: row.actions_by_type || {},
        actionsByResource: row.actions_by_resource || {},
        uniqueUsers: parseInt(row.unique_users) || 0,
        dateRange: {
          start: row.start_date || new Date(),
          end: row.end_date || new Date()
        }
      };
    } catch (error) {
      logger.error('Error getting action stats:', error);
      // Return empty stats on error
      return {
        totalActions: 0,
        actionsByType: {},
        actionsByResource: {},
        uniqueUsers: 0,
        dateRange: {
          start: new Date(),
          end: new Date()
        }
      };
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const result = await this.db.query(
        `DELETE FROM audit_logs 
         WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
         RETURNING id`
      );

      const deletedCount = result.rowCount || 0;
      
      logger.info(`Cleaned up ${deletedCount} old audit logs (retention: ${retentionDays} days)`);
      
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old logs:', error);
      throw error;
    }
  }
}
