import { Pool } from 'pg';
import { logger } from '../utils/logger';

/**
 * User roles in the system
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  TEST = 'test'
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: UserRole;
}

/**
 * Permission resource types
 */
export type ResourceType = 'workflow' | 'execution' | 'agent' | 'user' | 'template';

/**
 * Permission actions
 */
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'share';

/**
 * Permission condition types
 */
export interface PermissionCondition {
  type: 'owner' | 'role' | 'shared';
  value?: any;
}

/**
 * Permission definition
 */
export interface Permission {
  resource: ResourceType;
  action: PermissionAction;
  condition?: PermissionCondition;
}

/**
 * Permission rules by role
 */
const PERMISSION_RULES: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    { resource: 'workflow', action: 'create' },
    { resource: 'workflow', action: 'read', condition: { type: 'owner' } },
    { resource: 'workflow', action: 'update', condition: { type: 'owner' } },
    { resource: 'workflow', action: 'delete', condition: { type: 'owner' } },
    { resource: 'workflow', action: 'execute', condition: { type: 'owner' } },
    { resource: 'execution', action: 'read', condition: { type: 'owner' } },
  ],
  [UserRole.ADMIN]: [
    { resource: 'workflow', action: 'create' },
    { resource: 'workflow', action: 'read' },
    { resource: 'workflow', action: 'update' },
    { resource: 'workflow', action: 'delete' },
    { resource: 'workflow', action: 'execute' },
    { resource: 'execution', action: 'read' },
    { resource: 'user', action: 'read' },
    { resource: 'user', action: 'update' },
  ],
  [UserRole.TEST]: [
    { resource: 'workflow', action: 'create' },
    { resource: 'workflow', action: 'read', condition: { type: 'owner' } },
  ]
};

/**
 * Permission Service
 * Handles all permission checks and role-based access control
 */
export class PermissionService {
  constructor(private db: Pool) {}

  /**
   * Check if user can access a workflow
   */
  async canAccessWorkflow(userId: string, workflowId: string): Promise<boolean> {
    try {
      const result = await this.checkPermission(userId, 'workflow', workflowId, 'read');
      return result.allowed;
    } catch (error) {
      logger.error('Error checking workflow access permission:', error);
      return false;
    }
  }

  /**
   * Check if user can modify a workflow
   */
  async canModifyWorkflow(userId: string, workflowId: string): Promise<boolean> {
    try {
      const result = await this.checkPermission(userId, 'workflow', workflowId, 'update');
      return result.allowed;
    } catch (error) {
      logger.error('Error checking workflow modify permission:', error);
      return false;
    }
  }

  /**
   * Check if user can delete a workflow
   */
  async canDeleteWorkflow(userId: string, workflowId: string): Promise<boolean> {
    try {
      const result = await this.checkPermission(userId, 'workflow', workflowId, 'delete');
      return result.allowed;
    } catch (error) {
      logger.error('Error checking workflow delete permission:', error);
      return false;
    }
  }

  /**
   * Check if user can execute a workflow
   */
  async canExecuteWorkflow(userId: string, workflowId: string): Promise<boolean> {
    try {
      const result = await this.checkPermission(userId, 'workflow', workflowId, 'execute');
      return result.allowed;
    } catch (error) {
      logger.error('Error checking workflow execute permission:', error);
      return false;
    }
  }

  /**
   * Check if user is an admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const role = await this.getUserRole(userId);
      return role === UserRole.ADMIN;
    } catch (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Check if user is a test user
   */
  async isTestUser(userId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT is_test_user FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return false;
      }
      
      return result.rows[0].is_test_user === true;
    } catch (error) {
      logger.error('Error checking test user status:', error);
      return false;
    }
  }

  /**
   * Get user role
   */
  async getUserRole(userId: string): Promise<UserRole> {
    try {
      const result = await this.db.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const role = result.rows[0].role as string;
      
      // Validate role
      if (!Object.values(UserRole).includes(role as UserRole)) {
        logger.warn(`Invalid role for user ${userId}: ${role}, defaulting to USER`);
        return UserRole.USER;
      }
      
      return role as UserRole;
    } catch (error) {
      logger.error('Error getting user role:', error);
      throw error;
    }
  }

  /**
   * Filter accessible workflows for a user
   */
  async filterAccessibleWorkflows(userId: string, workflowIds: string[]): Promise<string[]> {
    try {
      const role = await this.getUserRole(userId);
      
      // Admins can access all workflows
      if (role === UserRole.ADMIN) {
        return workflowIds;
      }
      
      // For regular users, check ownership
      const result = await this.db.query(
        'SELECT id FROM workflows WHERE id = ANY($1) AND owner_id = $2',
        [workflowIds, userId]
      );
      
      return result.rows.map(row => row.id);
    } catch (error) {
      logger.error('Error filtering accessible workflows:', error);
      return [];
    }
  }

  /**
   * Core permission check method
   */
  async checkPermission(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    action: PermissionAction
  ): Promise<PermissionCheckResult> {
    try {
      // Get user role
      const role = await this.getUserRole(userId);
      
      // Get permission rules for this role
      const rules = PERMISSION_RULES[role];
      
      // Find matching rule
      const rule = rules.find(r => r.resource === resourceType && r.action === action);
      
      if (!rule) {
        return {
          allowed: false,
          reason: `Role ${role} does not have permission to ${action} ${resourceType}`,
          requiredRole: UserRole.ADMIN
        };
      }
      
      // If no condition, permission is granted
      if (!rule.condition) {
        return { allowed: true };
      }
      
      // Check condition
      if (rule.condition.type === 'owner') {
        const isOwner = await this.checkOwnership(userId, resourceType, resourceId);
        
        if (!isOwner) {
          return {
            allowed: false,
            reason: `Only the ${resourceType} owner can ${action} it`,
            requiredRole: UserRole.ADMIN
          };
        }
        
        return { allowed: true };
      }
      
      // Default: deny
      return {
        allowed: false,
        reason: 'Permission denied',
        requiredRole: UserRole.ADMIN
      };
    } catch (error) {
      logger.error('Error checking permission:', error);
      return {
        allowed: false,
        reason: 'Permission check failed'
      };
    }
  }

  /**
   * Check if user owns a resource
   */
  private async checkOwnership(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<boolean> {
    try {
      let query: string;
      
      switch (resourceType) {
        case 'workflow':
          query = 'SELECT owner_id FROM workflows WHERE id = $1';
          break;
        case 'agent':
          query = 'SELECT owner_id FROM agents WHERE id = $1';
          break;
        case 'execution':
          query = 'SELECT triggered_by as owner_id FROM workflow_executions WHERE id = $1';
          break;
        default:
          return false;
      }
      
      const result = await this.db.query(query, [resourceId]);
      
      if (result.rows.length === 0) {
        return false;
      }
      
      return result.rows[0].owner_id === userId;
    } catch (error) {
      logger.error('Error checking ownership:', error);
      return false;
    }
  }

  /**
   * Set user role (admin only)
   */
  async setUserRole(adminUserId: string, targetUserId: string, role: UserRole): Promise<void> {
    try {
      // Check if requester is admin
      const isAdminUser = await this.isAdmin(adminUserId);
      
      if (!isAdminUser) {
        throw new Error('Only admins can change user roles');
      }
      
      // Update role
      await this.db.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        [role, targetUserId]
      );
      
      logger.info(`User ${targetUserId} role changed to ${role} by admin ${adminUserId}`);
    } catch (error) {
      logger.error('Error setting user role:', error);
      throw error;
    }
  }
}
